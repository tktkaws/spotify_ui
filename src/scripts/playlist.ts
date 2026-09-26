import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Playlist, Track } from '../data/playlists';
import { setupTweakpane } from './tweakpane';

gsap.registerPlugin(ScrollTrigger);

export type AnimationSettings = {
  minScale: number;
  shrinkDistance: number;
  fadeDistance: number;
  scrub: true;
  headerReveal: number;
  gradientStrength: number;
  markers: boolean;
};

export type PlaylistController = {
  settings: AnimationSettings;
  selectPlaylist: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AnimationSettings>, rebuild?: boolean) => void;
};

const DEFAULT_ACCENT = [60, 73, 126] as const;

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

function createTrackRow(track: Track, index: number): HTMLElement {
  const row = document.createElement('article');
  row.className = 'track-row';
  row.dataset.trackRow = '';

  const number = document.createElement('span');
  number.className = 'track-number';
  number.textContent = String(index + 1);

  const title = document.createElement('div');
  title.className = 'track-title';
  const name = document.createElement('strong');
  name.textContent = track.title;
  const artist = document.createElement('span');
  artist.textContent = track.artist;
  title.append(name, artist);

  const album = document.createElement('span');
  album.className = 'track-album';
  album.textContent = track.album;

  const duration = document.createElement('span');
  duration.className = 'track-duration';
  duration.textContent = track.duration;

  row.append(number, title, album, duration);
  return row;
}

async function extractAccentColor(image: HTMLImageElement): Promise<[number, number, number]> {
  try {
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => reject(new Error('Image failed to load')), { once: true });
      });
    }

    await image.decode().catch(() => undefined);

    const canvas = document.createElement('canvas');
    const size = 48;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return [...DEFAULT_ACCENT];

    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    const buckets = new Map<string, { count: number; r: number; g: number; b: number; score: number }>();

    for (let index = 0; index < pixels.length; index += 16) {
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const alpha = pixels[index + 3];
      if (alpha < 180) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 2;
      if (lightness < 28 || lightness > 232) continue;

      const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(2 * lightness - 255));
      const key = `${Math.round(r / 32)}-${Math.round(g / 32)}-${Math.round(b / 32)}`;
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, score: 0 };
      bucket.count += 1;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.score += 0.45 + saturation;
      buckets.set(key, bucket);
    }

    const best = [...buckets.values()].sort(
      (a, b) => b.count * (b.score / b.count) - a.count * (a.score / a.count),
    )[0];

    if (!best) return [...DEFAULT_ACCENT];

    const brighten = (value: number) => Math.round(Math.min(214, Math.max(42, value * 0.86)));
    return [
      brighten(best.r / best.count),
      brighten(best.g / best.count),
      brighten(best.b / best.count),
    ];
  } catch {
    return [...DEFAULT_ACCENT];
  }
}

export function setupPlaylistExperience(playlists: Playlist[]): void {
  const root = document.documentElement;
  const hero = requiredElement<HTMLElement>('[data-playlist-hero]');
  const coverWrap = requiredElement<HTMLElement>('[data-cover-wrap]');
  const cover = requiredElement<HTMLImageElement>('[data-cover-art]');
  const compactHeader = requiredElement<HTMLElement>('[data-compact-header]');
  const trackList = requiredElement<HTMLElement>('[data-track-list]');
  const title = requiredElement<HTMLElement>('[data-playlist-title]');
  const compactTitle = requiredElement<HTMLElement>('[data-compact-title]');
  const description = requiredElement<HTMLElement>('[data-playlist-description]');
  const owner = requiredElement<HTMLElement>('[data-playlist-owner]');
  const followers = requiredElement<HTMLElement>('[data-playlist-followers]');
  const totalDuration = requiredElement<HTMLElement>('[data-playlist-duration]');

  const settings: AnimationSettings = {
    minScale: 0.5,
    shrinkDistance: 250,
    fadeDistance: 125,
    scrub: true,
    headerReveal: 0.72,
    gradientStrength: 0.92,
    markers: false,
  };

  let media: gsap.MatchMedia | undefined;
  let activePlaylist = playlists[0];

  const setHeaderAccessibility = (visible: boolean): void => {
    compactHeader.setAttribute('aria-hidden', String(!visible));
  };

  const rebuildAnimation = (): void => {
    media?.revert();
    gsap.set(coverWrap, { clearProps: 'width,paddingTop,transform,opacity,visibility' });
    gsap.set(compactHeader, { autoAlpha: 0, y: -8 });
    setHeaderAccessibility(false);

    media = gsap.matchMedia();
    media.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        allowMotion: '(prefers-reduced-motion: no-preference)',
      },
      (context) => {
        const { reduceMotion } = context.conditions as { reduceMotion: boolean };

        if (reduceMotion) {
          const trigger = ScrollTrigger.create({
            trigger: hero,
            start: 'bottom top+=72',
            onEnter: () => {
              gsap.set(compactHeader, { autoAlpha: 1, y: 0 });
              setHeaderAccessibility(true);
            },
            onLeaveBack: () => {
              gsap.set(compactHeader, { autoAlpha: 0, y: -8 });
              setHeaderAccessibility(false);
            },
            markers: settings.markers,
          });
          return () => trigger.kill();
        }

        const coverSize = coverWrap.getBoundingClientRect().width;
        const targetWidth = coverSize * settings.minScale;
        const coverPadding = Number.parseFloat(getComputedStyle(coverWrap).paddingTop);
        const targetPadding = coverPadding * settings.minScale;
        const revealAt = settings.fadeDistance * settings.headerReveal;
        const headerDuration = Math.max(28, settings.fadeDistance * (1 - settings.headerReveal));

        const shrinkTimeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: `+=${settings.shrinkDistance}`,
            scrub: settings.scrub,
            pin: true,
            pinSpacing: false,
            invalidateOnRefresh: true,
            markers: settings.markers,
          },
        });

        shrinkTimeline.to(coverWrap, {
          width: targetWidth,
          paddingTop: targetPadding,
          duration: settings.shrinkDistance,
        });

        const fadeTimeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: hero,
            start: () => shrinkTimeline.scrollTrigger?.end ?? 0,
            end: () => (shrinkTimeline.scrollTrigger?.end ?? 0) + settings.fadeDistance,
            scrub: settings.scrub,
            invalidateOnRefresh: true,
            markers: settings.markers,
            onUpdate: (self) => setHeaderAccessibility(self.progress >= settings.headerReveal),
          },
        });

        fadeTimeline
          .to(coverWrap, { autoAlpha: 0, duration: settings.fadeDistance }, 'fade')
          .fromTo(
            compactHeader,
            { autoAlpha: 0, y: -8 },
            { autoAlpha: 1, y: 0, duration: headerDuration },
            revealAt,
          );

        return () => {
          shrinkTimeline.kill();
          fadeTimeline.kill();
        };
      },
    );

    requestAnimationFrame(() => ScrollTrigger.refresh());
  };

  const renderPlaylist = async (playlist: Playlist): Promise<void> => {
    activePlaylist = playlist;
    title.textContent = playlist.title;
    compactTitle.textContent = playlist.title;
    description.textContent = playlist.description;
    owner.textContent = playlist.owner;
    followers.textContent = playlist.followers;
    totalDuration.textContent = playlist.totalDuration;
    cover.alt = `${playlist.title}のプレイリストカバー`;
    document.title = `${playlist.title} — Playlist Lab`;

    if (cover.getAttribute('src') !== playlist.image) {
      cover.src = playlist.image;
    }

    trackList.replaceChildren(...playlist.tracks.map(createTrackRow));

    const accent = await extractAccentColor(cover);
    if (activePlaylist !== playlist) return;
    root.style.setProperty('--accent-rgb', accent.join(', '));
    rebuildAnimation();
  };

  const controller: PlaylistController = {
    settings,
    selectPlaylist: async (id) => {
      const playlist = playlists.find((item) => item.id === id);
      if (playlist) await renderPlaylist(playlist);
    },
    updateSettings: (nextSettings, shouldRebuild = true) => {
      Object.assign(settings, nextSettings);
      root.style.setProperty('--gradient-strength', String(settings.gradientStrength));
      if (shouldRebuild) rebuildAnimation();
    },
  };

  setupTweakpane(playlists, controller);
  void renderPlaylist(activePlaylist);

  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  window.addEventListener('beforeunload', () => media?.revert(), { once: true });
}
