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
  gradientColor: string;
  gradientStrength: number;
  gradientRange: number;
  markers: boolean;
};

export type PlaylistController = {
  settings: AnimationSettings;
  selectPlaylist: (id: string) => Promise<void>;
  updateSettings: (settings: Partial<AnimationSettings>, rebuild?: boolean) => void;
};

const DEFAULT_ACCENT = [60, 73, 126] as const;

function hexToRgb(hex: string): [number, number, number] | undefined {
  const normalized = hex.replace('#', '');
  if (!/^[\da-f]{6}$/i.test(normalized)) return undefined;

  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: readonly number[]): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function perceivedBrightness([r, g, b]: readonly number[]): number {
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

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
  const appShell = requiredElement<HTMLElement>('.app-shell');
  const hero = requiredElement<HTMLElement>('[data-playlist-hero]');
  const heroInner = requiredElement<HTMLElement>('.playlist-hero__inner');
  const coverWrap = requiredElement<HTMLElement>('[data-cover-wrap]');
  const cover = requiredElement<HTMLImageElement>('[data-cover-art]');
  const compactHeader = requiredElement<HTMLElement>('[data-compact-header]');
  const scrollTopButton = requiredElement<HTMLButtonElement>('[data-scroll-top]');
  const trackTable = requiredElement<HTMLElement>('.track-table');
  const trackList = requiredElement<HTMLElement>('[data-track-list]');
  const playlistButtons = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-playlist-select]'),
  ];
  const title = requiredElement<HTMLElement>('[data-playlist-title]');
  const compactTitle = requiredElement<HTMLElement>('[data-compact-title]');
  const description = requiredElement<HTMLElement>('[data-playlist-description]');
  const owner = requiredElement<HTMLElement>('[data-playlist-owner]');
  const followers = requiredElement<HTMLElement>('[data-playlist-followers]');
  const totalDuration = requiredElement<HTMLElement>('[data-playlist-duration]');

  const settings: AnimationSettings = {
    minScale: 0.58,
    shrinkDistance: 250,
    fadeDistance: 250,
    scrub: true,
    headerReveal: 0.15,
    gradientColor: '#3c497e',
    gradientStrength: 1,
    gradientRange: 1,
    markers: false,
  };

  let media: gsap.MatchMedia | undefined;
  let activePlaylist = playlists[0];

  const setHeaderAccessibility = (visible: boolean): void => {
    compactHeader.setAttribute('aria-hidden', String(!visible));
  };

  const scrollToPageTop = (): void => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  const applyGradientColor = (rgb: readonly number[]): void => {
    root.style.setProperty('--accent-rgb', rgb.join(', '));
    root.style.setProperty(
      '--gradient-description-strength',
      perceivedBrightness(rgb) >= 0.7 ? '0.2' : '0.5',
    );
  };

  const updateGradientStops = (): void => {
    const shellTop = appShell.getBoundingClientRect().top;
    const descriptionEnd = description.getBoundingClientRect().bottom - shellTop;
    const trackStart = trackTable.getBoundingClientRect().top - shellTop;
    root.style.setProperty('--gradient-description-stop', `${Math.max(0, descriptionEnd)}px`);
    root.style.setProperty('--gradient-track-stop', `${Math.max(descriptionEnd, trackStart)}px`);
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
        const contentMaxWidth =
          Number.parseFloat(getComputedStyle(root).getPropertyValue('--content-max-width')) || 800;
        const responsiveScale = Math.min(1, heroInner.getBoundingClientRect().width / contentMaxWidth);
        const shrinkDistance = settings.shrinkDistance * responsiveScale;
        const fadeDistance = settings.fadeDistance * responsiveScale;
        const revealAt = fadeDistance * settings.headerReveal;
        const headerDuration = Math.max(12, fadeDistance * (1 - settings.headerReveal));

        const shrinkTimeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: `+=${shrinkDistance}`,
            scrub: settings.scrub,
            pin: true,
            pinSpacing: false,
            invalidateOnRefresh: true,
            markers: settings.markers,
            onUpdate: updateGradientStops,
          },
        });

        shrinkTimeline.to(coverWrap, {
          width: targetWidth,
          paddingTop: targetPadding,
          duration: shrinkDistance,
        });

        const fadeTimeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: hero,
            start: () => shrinkTimeline.scrollTrigger?.end ?? 0,
            end: () => (shrinkTimeline.scrollTrigger?.end ?? 0) + fadeDistance,
            scrub: settings.scrub,
            invalidateOnRefresh: true,
            markers: settings.markers,
            onUpdate: (self) => {
              setHeaderAccessibility(self.progress >= settings.headerReveal);
              updateGradientStops();
            },
          },
        });

        fadeTimeline
          .to(coverWrap, { autoAlpha: 0, duration: fadeDistance }, 'fade')
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

    requestAnimationFrame(() => {
      updateGradientStops();
      ScrollTrigger.refresh();
    });
  };

  const renderPlaylist = async (playlist: Playlist): Promise<void> => {
    activePlaylist = playlist;
    for (const button of playlistButtons) {
      if (button.dataset.playlistSelect === playlist.id) {
        button.setAttribute('aria-current', 'true');
      } else {
        button.removeAttribute('aria-current');
      }
    }
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
    settings.gradientColor = rgbToHex(accent);
    applyGradientColor(accent);
    rebuildAnimation();
    document.dispatchEvent(new CustomEvent('playlistchange', { detail: { id: playlist.id } }));
  };

  const controller: PlaylistController = {
    settings,
    selectPlaylist: async (id) => {
      const playlist = playlists.find((item) => item.id === id);
      if (playlist) {
        await renderPlaylist(playlist);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToPageTop();
          });
        });
      }
    },
    updateSettings: (nextSettings, shouldRebuild = true) => {
      Object.assign(settings, nextSettings);
      const gradientRgb = hexToRgb(settings.gradientColor);
      if (gradientRgb) applyGradientColor(gradientRgb);
      root.style.setProperty('--gradient-strength', String(settings.gradientStrength));
      root.style.setProperty('--gradient-range', String(settings.gradientRange));
      if (shouldRebuild) rebuildAnimation();
    },
  };

  const interactionController = new AbortController();
  scrollTopButton.addEventListener('click', scrollToPageTop, {
    signal: interactionController.signal,
  });
  for (const button of playlistButtons) {
    button.addEventListener(
      'click',
      () => {
        const id = button.dataset.playlistSelect;
        if (id && id !== activePlaylist.id) void controller.selectPlaylist(id);
      },
      { signal: interactionController.signal },
    );
  }

  setupTweakpane(playlists, controller);
  void renderPlaylist(activePlaylist);

  let observedWidth = heroInner.getBoundingClientRect().width;
  const resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry || Math.abs(entry.contentRect.width - observedWidth) < 1) return;
    observedWidth = entry.contentRect.width;
    rebuildAnimation();
  });
  resizeObserver.observe(heroInner);

  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  window.addEventListener(
    'beforeunload',
    () => {
      interactionController.abort();
      resizeObserver.disconnect();
      media?.revert();
    },
    { once: true },
  );
}
