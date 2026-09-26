import { Pane } from 'tweakpane';
import type { Playlist } from '../data/playlists';
import type { PlaylistController } from './playlist';

export function setupTweakpane(playlists: Playlist[], controller: PlaylistController): void {
  const host = document.querySelector<HTMLElement>('[data-tweakpane-host]');
  const toggle = document.querySelector<HTMLButtonElement>('[data-pane-toggle]');
  if (!host || !toggle) return;

  const params = {
    playlist: playlists[0]?.id ?? '',
    minScale: controller.settings.minScale,
    shrinkDistance: controller.settings.shrinkDistance,
    fadeDistance: controller.settings.fadeDistance,
    headerReveal: controller.settings.headerReveal,
    gradientColor: controller.settings.gradientColor,
    gradientStrength: controller.settings.gradientStrength,
    gradientRange: controller.settings.gradientRange,
    markers: controller.settings.markers,
  };

  const pane = new Pane({
    container: host,
    title: 'PLAYLIST LAB',
    expanded: true,
  });

  let syncGradientColor = (): void => {};

  const playlistBinding = pane
    .addBinding(params, 'playlist', {
      label: '画像 / リスト',
      options: Object.fromEntries(playlists.map((playlist) => [playlist.title, playlist.id])),
    })
    .on('change', async (event) => {
      await controller.selectPlaylist(event.value);
      syncGradientColor();
    });

  const motion = pane.addFolder({ title: 'スクロール演出', expanded: true });
  motion
    .addBinding(params, 'minScale', { label: '縮小率', min: 0.1, max: 0.75, step: 0.01 })
    .on('change', (event) => {
      if (event.last) controller.updateSettings({ minScale: event.value });
    });
  motion
    .addBinding(params, 'shrinkDistance', { label: '縮小距離', min: 120, max: 520, step: 5 })
    .on('change', (event) => {
      if (event.last) controller.updateSettings({ shrinkDistance: event.value });
    });
  motion
    .addBinding(params, 'fadeDistance', { label: 'フェード距離', min: 40, max: 280, step: 5 })
    .on('change', (event) => {
      if (event.last) controller.updateSettings({ fadeDistance: event.value });
    });
  motion
    .addBinding(params, 'headerReveal', { label: 'ヘッダー位置', min: 0, max: 1, step: 0.01 })
    .on('change', (event) => {
      if (event.last) controller.updateSettings({ headerReveal: event.value });
    });
  const appearance = pane.addFolder({ title: '表示', expanded: true });
  const gradientColorBinding = appearance
    .addBinding(params, 'gradientColor', { label: '背景色', view: 'color' })
    .on('change', (event) => {
      controller.updateSettings({ gradientColor: event.value }, false);
    });
  syncGradientColor = () => {
    params.gradientColor = controller.settings.gradientColor;
    gradientColorBinding.refresh();
  };

  const eventController = new AbortController();
  document.addEventListener(
    'playlistchange',
    (event) => {
      const id = (event as CustomEvent<{ id: string }>).detail.id;
      params.playlist = id;
      playlistBinding.refresh();
      syncGradientColor();
    },
    { signal: eventController.signal },
  );
  appearance
    .addBinding(params, 'gradientStrength', { label: 'グラデーション', min: 0.35, max: 1, step: 0.01 })
    .on('change', (event) => {
      controller.updateSettings({ gradientStrength: event.value }, false);
    });
  appearance
    .addBinding(params, 'gradientRange', { label: 'グラデーション範囲', min: 0.5, max: 2, step: 0.05 })
    .on('change', (event) => {
      controller.updateSettings({ gradientRange: event.value }, false);
    });
  appearance.addBinding(params, 'markers', { label: 'トリガー表示' }).on('change', (event) => {
    controller.updateSettings({ markers: event.value });
  });

  const setCollapsed = (collapsed: boolean): void => {
    host.dataset.collapsed = String(collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? '調整を開く' : '調整を閉じる';
  };

  toggle.addEventListener('click', () => {
    setCollapsed(host.dataset.collapsed !== 'true');
  });

  setCollapsed(true);
  window.addEventListener(
    'beforeunload',
    () => {
      eventController.abort();
      pane.dispose();
    },
    { once: true },
  );
}
