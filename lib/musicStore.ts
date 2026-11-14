import { create } from 'zustand';

export interface MusicTrack {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  url: string;
}

export type MusicPlayerState =
  | 'unstarted'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'cued'
  | 'error';

export interface MusicEventLog {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warn' | 'error';
  text: string;
}

export interface TrackErrorInfo {
  code: number;
  message: string;
}

const PREFS_STORAGE_KEY = 'anan_music_prefs_v1';

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
}

function formatNowTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
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
  autoSkipOnError: boolean;
  trackErrors: Record<string, TrackErrorInfo>;
  eventLogs: MusicEventLog[];

  selectTrack: (trackId: string, autoPlay?: boolean) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setDucked: (ducked: boolean) => void;
  setLoopMode: (mode: 'all' | 'one') => void;
  setAutoSkipOnError: (enabled: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  addCustomTrack: (urlOrId: string, customTitle?: string) => { ok: boolean; error?: string };
  setReady: (ready: boolean) => void;
  setPlayerState: (state: MusicPlayerState) => void;
  recordTrackError: (videoId: string, code: number, message: string) => void;
  clearTrackError: (videoId: string) => void;
  pushLog: (type: MusicEventLog['type'], text: string) => void;
  clearLogs: () => void;
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
  autoSkipOnError: false,
  trackErrors: {},
  eventLogs: [],

  pushLog: (type, text) =>
    set((state) => {
      const entry: MusicEventLog = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        time: formatNowTime(),
        type,
        text,
      };
      return { eventLogs: [entry, ...state.eventLogs].slice(0, 40) };
    }),

  clearLogs: () => set({ eventLogs: [] }),

  hydratePrefs: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw) as MusicPrefs;
      const tracks = get().tracks;
      const validTrack =
        prefs.currentTrackId && tracks.some((t) => t.id === prefs.currentTrackId)
          ? prefs.currentTrackId
          : get().currentTrackId;
      const validVolume =
        typeof prefs.volume === 'number' && !Number.isNaN(prefs.volume)
          ? Math.max(0, Math.min(100, Math.round(prefs.volume)))
          : get().volume;
      const validMuted = typeof prefs.isMuted === 'boolean' ? prefs.isMuted : get().isMuted;
      const validLoop =
        prefs.loopMode === 'one' || prefs.loopMode === 'all' ? prefs.loopMode : get().loopMode;

      set({
        currentTrackId: validTrack,
        volume: validVolume,
        isMuted: validMuted,
        loopMode: validLoop,
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
    });
    get().pushLog(
      'info',
      `Chọn bài "${track.title}" (${track.videoId})${autoPlay ? ' → phát ngay' : ''}`
    );
  },

  togglePlay: () => {
    const next = !get().isPlaying;
    set({ isPlaying: next });
    get().pushLog('info', next ? 'Người dùng bấm Phát nhạc' : 'Người dùng bấm Tạm dừng');
  },

  setPlaying: (playing) => {
    set({ isPlaying: playing });
  },

  toggleMute: () => {
    const next = !get().isMuted;
    savePrefs({ isMuted: next });
    set({ isMuted: next });
    get().pushLog('info', next ? 'Đã tắt âm (Mute)' : 'Đã bật lại âm thanh (Unmute)');
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
    get().pushLog('info', mode === 'one' ? 'Chế độ lặp: Lặp 1 bài' : 'Chế độ lặp: Toàn danh sách');
  },

  setAutoSkipOnError: (enabled) => set({ autoSkipOnError: enabled }),

  nextTrack: () => {
    const { tracks, currentTrackId, isPlaying } = get();
    if (tracks.length === 0) return;
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

  addCustomTrack: (urlOrId, customTitle) => {
    const videoId = extractYouTubeVideoId(urlOrId);
    if (!videoId) {
      return {
        ok: false,
        error: 'Link hoặc Video ID YouTube không hợp lệ (cần đúng ID 11 ký tự hoặc link youtu.be / youtube.com).',
      };
    }

    const existing = get().tracks.find((t) => t.videoId === videoId);
    if (existing) {
      get().selectTrack(existing.id, true);
      return { ok: true };
    }

    const cleanTitle = (customTitle || '').trim() || `YouTube Custom (${videoId})`;
    const newTrack: MusicTrack = {
      id: `custom-${videoId}`,
      videoId,
      title: cleanTitle,
      artist: `Custom YouTube · ${videoId}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
    };

    set((state) => ({
      tracks: [...state.tracks, newTrack],
    }));
    get().selectTrack(newTrack.id, true);
    get().pushLog('success', `Đã thêm & chọn bài mới: "${cleanTitle}" (${videoId})`);
    return { ok: true };
  },

  setReady: (ready) => set({ isReady: ready }),

  setPlayerState: (playerState) => set({ playerState }),

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
