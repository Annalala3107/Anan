import { create } from 'zustand';
import { AmbientAudioEngine, AmbientPreset } from './ambientAudio';

export interface MusicTrack {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  url: string;
  isCustom?: boolean;
}

export type MusicPlayerState =
  | 'unstarted'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'cued'
  | 'error';

export interface TrackErrorInfo {
  code: number;
  message: string;
}

const PREFS_STORAGE_KEY = 'anan_music_prefs_v1';
export const POMODORO_FOCUS_SECONDS = 25 * 60;
export const POMODORO_BREAK_SECONDS = 5 * 60;

/**
 * Formats seconds cleanly as m:ss or mm:ss for seek bars and Pomodoro counters.
 */
export function formatSecondsMmSs(seconds: number, padMinutes = false): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  const minStr = padMinutes ? String(mins).padStart(2, '0') : String(mins);
  return `${minStr}:${String(secs).padStart(2, '0')}`;
}

/**
 * Extracts a YouTube 11-character video ID from common YouTube URL formats or a bare ID.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const seg = url.pathname.split('/').filter(Boolean)[0];
      return seg && /^[A-Za-z0-9_-]{11}$/.test(seg) ? seg : null;
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[A-Za-z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const parts = url.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return /^[A-Za-z0-9_-]{11}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    // Fallback regex if URL constructor rejects partial strings
  }

  const fallbackMatch = trimmed.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?.*?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/i
  );
  return fallbackMatch ? fallbackMatch[1] : null;
}

export const DEFAULT_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track-1',
    videoId: '9WO4_N9C0po',
    title: 'Thiên Lý Ơi (Piano Cover)',
    artist: 'Yuriko Piano · Jack',
    url: 'https://youtu.be/9WO4_N9C0po?si=EkaksrJQ48D5nNxU',
  },
  {
    id: 'track-2',
    videoId: 'metsH3X9lmU',
    title: 'Tìm Em (Piano Cover)',
    artist: 'Vũ Ngọc Tiến · Hngle ft. Bảo Anh',
    url: 'https://youtu.be/metsH3X9lmU?si=Pz6hMBo_08x2-zGz',
  },
  {
    id: 'track-3',
    videoId: 'Jkvn7npQlbE',
    title: 'Chúng Ta Của Hiện Tại (Piano Cover)',
    artist: 'An Coong · Sơn Tùng M-TP',
    url: 'https://youtu.be/Jkvn7npQlbE?si=CxhHVPdiCZYEbzFz',
  },
];

interface MusicPrefs {
  volume?: number;
  isMuted?: boolean;
  currentTrackId?: string;
  loopMode?: 'all' | 'one';
  isShuffle?: boolean;
  customTracks?: MusicTrack[];
  ambientVolume?: number;
  pomodoroAutoPauseMusic?: boolean;
  showMiniPlayer?: boolean;
  miniPlayerCollapsed?: boolean;
}

function savePrefs(partial: MusicPrefs) {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    const prev: MusicPrefs = raw ? JSON.parse(raw) : {};
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ ...prev, ...partial }));
  } catch {
    // Ignore storage quota or private mode failures
  }
}

async function fetchYouTubeMetaViaNoembed(
  videoId: string
): Promise<{ title?: string; artist?: string }> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    const endpoint = `https://noembed.com/embed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}`;
    const res = await fetch(endpoint, { signal: controller.signal });
    window.clearTimeout(timer);
    if (!res.ok) return {};
    const data = await res.json();
    if (data && typeof data.title === 'string' && data.title.trim()) {
      return {
        title: data.title.trim(),
        artist:
          typeof data.author_name === 'string' && data.author_name.trim()
            ? data.author_name.trim()
            : undefined,
      };
    }
  } catch {
    // Fallback gracefully if network or CORS prevents oEmbed lookup
  }
  return {};
}

export interface MusicStoreState {
  tracks: MusicTrack[];
  currentTrackId: string;
  isPlaying: boolean;
  isReady: boolean;
  playerState: MusicPlayerState;
  isMuted: boolean;
  volume: number;
  isDucked: boolean;
  loopMode: 'all' | 'one';
  isShuffle: boolean;
  trackErrors: Record<string, TrackErrorInfo>;

  // Timeline & Seek Bar
  currentTime: number;
  duration: number;
  seekRequest: number | null;

  // Ambient Sound Mixer
  ambientPreset: AmbientPreset;
  ambientVolume: number;

  // Pomodoro Study Timer
  pomodoroMode: 'focus' | 'break';
  pomodoroSecondsLeft: number;
  pomodoroRunning: boolean;
  pomodoroAutoPauseMusic: boolean;

  // Floating Mini-Player UI
  showMiniPlayer: boolean;
  miniPlayerCollapsed: boolean;

  selectTrack: (trackId: string, autoPlay?: boolean) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setDucked: (ducked: boolean) => void;
  setLoopMode: (mode: 'all' | 'one') => void;
  toggleShuffle: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  addCustomTrackAsync: (
    urlOrId: string,
    customTitle?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  removeCustomTrack: (trackId: string) => void;
  setReady: (ready: boolean) => void;
  setPlayerState: (state: MusicPlayerState) => void;
  setProgress: (currentTime: number, duration: number) => void;
  requestSeek: (seconds: number) => void;
  clearSeekRequest: () => void;
  setAmbientPreset: (preset: AmbientPreset) => void;
  setAmbientVolume: (volume: number) => void;
  togglePomodoro: () => void;
  resetPomodoro: (mode?: 'focus' | 'break') => void;
  tickPomodoro: () => void;
  setPomodoroAutoPause: (enabled: boolean) => void;
  setShowMiniPlayer: (show: boolean) => void;
  setMiniPlayerCollapsed: (collapsed: boolean) => void;
  recordTrackError: (videoId: string, code: number, message: string) => void;
  clearTrackError: (videoId: string) => void;
  hydratePrefs: () => void;
}

export const useMusicStore = create<MusicStoreState>((set, get) => ({
  tracks: DEFAULT_MUSIC_TRACKS,
  currentTrackId: 'track-1',
  isPlaying: false,
  isReady: false,
  playerState: 'unstarted',
  isMuted: false,
  volume: 65,
  isDucked: false,
  loopMode: 'all',
  isShuffle: false,
  trackErrors: {},

  currentTime: 0,
  duration: 0,
  seekRequest: null,

  ambientPreset: 'off',
  ambientVolume: 35,

  pomodoroMode: 'focus',
  pomodoroSecondsLeft: POMODORO_FOCUS_SECONDS,
  pomodoroRunning: false,
  pomodoroAutoPauseMusic: true,

  showMiniPlayer: true,
  miniPlayerCollapsed: true,

  hydratePrefs: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw) as MusicPrefs;

      const customList: MusicTrack[] = Array.isArray(prefs.customTracks)
        ? prefs.customTracks
            .filter((t) => t && typeof t.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(t.videoId))
            .map((t) => ({ ...t, isCustom: true }))
        : [];
      const mergedTracks = [
        ...DEFAULT_MUSIC_TRACKS,
        ...customList.filter((ct) => !DEFAULT_MUSIC_TRACKS.some((dt) => dt.videoId === ct.videoId)),
      ];

      const validTrack =
        prefs.currentTrackId && mergedTracks.some((t) => t.id === prefs.currentTrackId)
          ? prefs.currentTrackId
          : get().currentTrackId;
      const validVolume =
        typeof prefs.volume === 'number' && !Number.isNaN(prefs.volume)
          ? Math.max(0, Math.min(100, Math.round(prefs.volume)))
          : get().volume;
      const validMuted = typeof prefs.isMuted === 'boolean' ? prefs.isMuted : get().isMuted;
      const validLoop =
        prefs.loopMode === 'one' || prefs.loopMode === 'all' ? prefs.loopMode : get().loopMode;
      const validShuffle = typeof prefs.isShuffle === 'boolean' ? prefs.isShuffle : get().isShuffle;
      const validAmbientVol =
        typeof prefs.ambientVolume === 'number' && !Number.isNaN(prefs.ambientVolume)
          ? Math.max(0, Math.min(100, Math.round(prefs.ambientVolume)))
          : get().ambientVolume;
      const validAutoPause =
        typeof prefs.pomodoroAutoPauseMusic === 'boolean'
          ? prefs.pomodoroAutoPauseMusic
          : get().pomodoroAutoPauseMusic;
      const validShowMini =
        typeof prefs.showMiniPlayer === 'boolean' ? prefs.showMiniPlayer : get().showMiniPlayer;
      const validMiniCollapsed =
        typeof prefs.miniPlayerCollapsed === 'boolean'
          ? prefs.miniPlayerCollapsed
          : get().miniPlayerCollapsed;

      AmbientAudioEngine.setVolume(validAmbientVol);

      set({
        tracks: mergedTracks,
        currentTrackId: validTrack,
        volume: validVolume,
        isMuted: validMuted,
        loopMode: validLoop,
        isShuffle: validShuffle,
        ambientVolume: validAmbientVol,
        pomodoroAutoPauseMusic: validAutoPause,
        showMiniPlayer: validShowMini,
        miniPlayerCollapsed: validMiniCollapsed,
      });
    } catch {
      // Ignore malformed stored JSON
    }
  },

  selectTrack: (trackId, autoPlay = true) => {
    const track = get().tracks.find((t) => t.id === trackId);
    if (!track) return;
    savePrefs({ currentTrackId: trackId });
    set({
      currentTrackId: trackId,
      isPlaying: autoPlay,
      playerState: autoPlay ? 'buffering' : 'cued',
      currentTime: 0,
      duration: 0,
    });
  },

  togglePlay: () => {
    set({ isPlaying: !get().isPlaying });
  },

  setPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  toggleMute: () => {
    const next = !get().isMuted;
    savePrefs({ isMuted: next });
    set({ isMuted: next });
  },

  setMuted: (muted) => {
    savePrefs({ isMuted: muted });
    set({ isMuted: muted });
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    const nextMuted = clamped === 0 ? true : get().isMuted && clamped > 0 ? false : get().isMuted;
    savePrefs({ volume: clamped, isMuted: nextMuted });
    set({ volume: clamped, isMuted: nextMuted });
  },

  setDucked: (ducked) => set({ isDucked: ducked }),

  setLoopMode: (mode) => {
    savePrefs({ loopMode: mode });
    set({ loopMode: mode });
  },

  toggleShuffle: () => {
    const next = !get().isShuffle;
    savePrefs({ isShuffle: next });
    set({ isShuffle: next });
  },

  nextTrack: () => {
    const { tracks, currentTrackId, isPlaying, isShuffle } = get();
    if (tracks.length === 0) return;

    if (isShuffle && tracks.length > 1) {
      const candidates = tracks.filter((t) => t.id !== currentTrackId);
      const picked = candidates[Math.floor(Math.random() * candidates.length)];
      get().selectTrack(picked.id, isPlaying);
      return;
    }

    const idx = tracks.findIndex((t) => t.id === currentTrackId);
    const next = tracks[(idx + 1) % tracks.length];
    get().selectTrack(next.id, isPlaying);
  },

  prevTrack: () => {
    const { tracks, currentTrackId, isPlaying } = get();
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrackId);
    const prevIdx = (idx - 1 + tracks.length) % tracks.length;
    const prev = tracks[prevIdx];
    get().selectTrack(prev.id, isPlaying);
  },

  addCustomTrackAsync: async (urlOrId, customTitle) => {
    const videoId = extractYouTubeVideoId(urlOrId);
    if (!videoId) {
      return {
        ok: false,
        error:
          'Link hoặc Video ID YouTube không hợp lệ (cần đúng ID 11 ký tự hoặc link youtu.be / youtube.com).',
      };
    }

    const existing = get().tracks.find((t) => t.videoId === videoId);
    if (existing) {
      get().selectTrack(existing.id, true);
      return { ok: true };
    }

    const meta = customTitle?.trim() ? {} : await fetchYouTubeMetaViaNoembed(videoId);
    const cleanTitle =
      (customTitle || '').trim() || meta.title || `YouTube Custom (${videoId})`;
    const cleanArtist = meta.artist
      ? `${meta.artist} · YouTube`
      : `Custom YouTube · ${videoId}`;

    // Re-check deduplication after async fetch
    const duplicateAfterFetch = get().tracks.find((t) => t.videoId === videoId);
    if (duplicateAfterFetch) {
      get().selectTrack(duplicateAfterFetch.id, true);
      return { ok: true };
    }

    const newTrack: MusicTrack = {
      id: `custom-${videoId}`,
      videoId,
      title: cleanTitle,
      artist: cleanArtist,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      isCustom: true,
    };

    const nextTracks = [...get().tracks, newTrack];
    savePrefs({ customTracks: nextTracks.filter((t) => t.isCustom) });
    set({ tracks: nextTracks });
    get().selectTrack(newTrack.id, true);
    return { ok: true };
  },

  removeCustomTrack: (trackId) => {
    const target = get().tracks.find((t) => t.id === trackId);
    if (!target || !target.isCustom) return;

    const nextTracks = get().tracks.filter((t) => t.id !== trackId);
    const isRemovingCurrent = get().currentTrackId === trackId;
    const fallbackId = isRemovingCurrent
      ? nextTracks[0]?.id || DEFAULT_MUSIC_TRACKS[0].id
      : get().currentTrackId;

    savePrefs({
      customTracks: nextTracks.filter((t) => t.isCustom),
      currentTrackId: fallbackId,
    });

    set({
      tracks: nextTracks,
      currentTrackId: fallbackId,
      ...(isRemovingCurrent ? { currentTime: 0, duration: 0 } : {}),
    });
  },

  setReady: (ready) => set({ isReady: ready }),

  setPlayerState: (playerState) => set({ playerState }),

  setProgress: (currentTime, duration) =>
    set({
      currentTime: Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0,
      duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
    }),

  requestSeek: (seconds) =>
    set({
      seekRequest: Math.max(0, seconds),
      currentTime: Math.max(0, seconds),
    }),

  clearSeekRequest: () => set({ seekRequest: null }),

  setAmbientPreset: (preset) => {
    const vol = get().ambientVolume;
    AmbientAudioEngine.setPreset(preset, vol);
    set({ ambientPreset: preset });
  },

  setAmbientVolume: (volume) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    AmbientAudioEngine.setVolume(clamped);
    savePrefs({ ambientVolume: clamped });
    set({ ambientVolume: clamped });
  },

  togglePomodoro: () => {
    set({ pomodoroRunning: !get().pomodoroRunning });
  },

  resetPomodoro: (mode) => {
    const targetMode = mode || get().pomodoroMode;
    const nextSeconds =
      targetMode === 'focus' ? POMODORO_FOCUS_SECONDS : POMODORO_BREAK_SECONDS;
    set({
      pomodoroMode: targetMode,
      pomodoroSecondsLeft: nextSeconds,
      pomodoroRunning: false,
    });
  },

  tickPomodoro: () => {
    const { pomodoroRunning, pomodoroSecondsLeft, pomodoroMode, pomodoroAutoPauseMusic } = get();
    if (!pomodoroRunning) return;

    if (pomodoroSecondsLeft > 1) {
      set({ pomodoroSecondsLeft: pomodoroSecondsLeft - 1 });
      return;
    }

    if (pomodoroMode === 'focus') {
      set({
        pomodoroMode: 'break',
        pomodoroSecondsLeft: POMODORO_BREAK_SECONDS,
        pomodoroRunning: false,
        ...(pomodoroAutoPauseMusic ? { isPlaying: false } : {}),
      });
    } else {
      set({
        pomodoroMode: 'focus',
        pomodoroSecondsLeft: POMODORO_FOCUS_SECONDS,
        pomodoroRunning: false,
      });
    }
  },

  setPomodoroAutoPause: (enabled) => {
    savePrefs({ pomodoroAutoPauseMusic: enabled });
    set({ pomodoroAutoPauseMusic: enabled });
  },

  setShowMiniPlayer: (show) => {
    savePrefs({ showMiniPlayer: show });
    set({ showMiniPlayer: show });
  },

  setMiniPlayerCollapsed: (collapsed) => {
    savePrefs({ miniPlayerCollapsed: collapsed });
    set({ miniPlayerCollapsed: collapsed });
  },

  recordTrackError: (videoId, code, message) =>
    set((state) => ({
      trackErrors: {
        ...state.trackErrors,
        [videoId]: { code, message },
      },
    })),

  clearTrackError: (videoId) =>
    set((state) => {
      if (!state.trackErrors[videoId]) return state;
      const next = { ...state.trackErrors };
      delete next[videoId];
      return { trackErrors: next };
    }),
}));
