import { create } from 'zustand';
import { AmbientAudioEngine, AmbientPreset } from './ambientAudio';

export interface MusicTrack {
  id: string;
  videoId: string;
  playlistId?: string;
  title: string;
  artist: string;
  url: string;
  isCustom?: boolean;
  isPinned?: boolean;
  isLocalFile?: boolean;
  localBlobUrl?: string;
}

export function getTrackErrorKey(
  track: Pick<MusicTrack, 'videoId' | 'playlistId'> & { id?: string; isLocalFile?: boolean }
): string {
  if (track.isLocalFile && track.id) return track.id;
  return track.playlistId ? `playlist:${track.playlistId}` : track.videoId;
}

export interface MusicPlayerController {
  loadTrack: (videoId: string, autoPlay: boolean, playlistId?: string, localBlobUrl?: string) => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  syncAudio: (isMuted: boolean, volume: number, isDucked: boolean, immediate?: boolean) => void;
}

let playerController: MusicPlayerController | null = null;
export function registerMusicPlayerController(ctrl: MusicPlayerController | null) {
  playerController = ctrl;
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

export type PomodoroPresetKey = '15/3' | '25/5' | '50/10';

export const POMODORO_PRESETS: Record<
  PomodoroPresetKey,
  { label: string; focusSeconds: number; breakSeconds: number }
> = {
  '15/3': { label: '15/3', focusSeconds: 15 * 60, breakSeconds: 3 * 60 },
  '25/5': { label: '25/5', focusSeconds: 25 * 60, breakSeconds: 5 * 60 },
  '50/10': { label: '50/10', focusSeconds: 50 * 60, breakSeconds: 10 * 60 },
};

export type SleepTimerMode = 'off' | '15' | '30' | '60' | 'end';

function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

/**
 * Extracts a YouTube playlist ID (?list=...) from common YouTube playlist or watch URLs.
 */
export function extractYouTubePlaylistId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  if (/^(PL|OLAK5uy_|UU|LL|RD)[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'youtu.be'
    ) {
      const listParam = url.searchParams.get('list');
      if (listParam && /^[A-Za-z0-9_-]{12,}$/.test(listParam)) {
        return listParam;
      }
    }
  } catch {
    // Fallback regex
  }

  const listMatch = trimmed.match(/[?&]list=([A-Za-z0-9_-]{12,})/i);
  return listMatch ? listMatch[1] : null;
}

export interface CuratedStation {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  category: 'lofi' | 'coding' | 'piano';
  url: string;
}

export const CURATED_FOCUS_STATIONS: CuratedStation[] = [
  {
    id: 'station-lofi-study',
    videoId: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio — Beats to Relax / Study',
    artist: 'Lofi Girl · 24/7 Focus',
    category: 'lofi',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
  },
  {
    id: 'station-1am-study',
    videoId: 'lTRiuFIWV54',
    title: '1 A.M Study Session (Deep Focus)',
    artist: 'Lofi Girl · Ambient Mix',
    category: 'lofi',
    url: 'https://www.youtube.com/watch?v=lTRiuFIWV54',
  },
  {
    id: 'station-chillhop',
    videoId: '5yx6BWlEVcY',
    title: 'Chillhop Radio — Jazzy & Lofi Hip Hop Beats',
    artist: 'Chillhop Music · 24/7 Stream',
    category: 'lofi',
    url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY',
  },
  {
    id: 'station-synthwave',
    videoId: '4xDzrJKXOOY',
    title: 'Synthwave Radio — Chill / Coding',
    artist: 'Lofi Girl · Retro Focus',
    category: 'coding',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
  },
  {
    id: 'station-lofi-best',
    videoId: 'n61ULEU7CO0',
    title: 'Best of Lofi Hip Hop (Focus Mix)',
    artist: 'Lofi Girl · Long Session',
    category: 'coding',
    url: 'https://www.youtube.com/watch?v=n61ULEU7CO0',
  },
  {
    id: 'station-sleep-chill',
    videoId: 'DWcJFNfaw9c',
    title: 'Beats to Sleep / Late Night Study',
    artist: 'Lofi Girl · Soft Beats',
    category: 'lofi',
    url: 'https://www.youtube.com/watch?v=DWcJFNfaw9c',
  },
  {
    id: 'track-1',
    videoId: '9WO4_N9C0po',
    title: 'Thiên Lý Ơi (Piano Cover)',
    artist: 'Yuriko Piano · Jack',
    category: 'piano',
    url: 'https://youtu.be/9WO4_N9C0po',
  },
  {
    id: 'track-2',
    videoId: 'metsH3X9lmU',
    title: 'Tìm Em (Piano Cover)',
    artist: 'Vũ Ngọc Tiến · Hngle ft. Bảo Anh',
    category: 'piano',
    url: 'https://youtu.be/metsH3X9lmU',
  },
  {
    id: 'track-3',
    videoId: 'Jkvn7npQlbE',
    title: 'Chúng Ta Của Hiện Tại (Piano Cover)',
    artist: 'An Coong · Sơn Tùng M-TP',
    category: 'piano',
    url: 'https://youtu.be/Jkvn7npQlbE',
  },
];

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
  pinnedTrackIds?: string[];
  trackOrderIds?: string[];
  ambientPreset?: AmbientPreset;
  ambientVolume?: number;
  pomodoroPreset?: PomodoroPresetKey;
  pomodoroAutoPauseMusic?: boolean;
  pomodoroCompletedToday?: number;
  pomodoroCompletedDate?: string;
  examAutoDuckMusic?: boolean;
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

async function fetchYouTubeMeta(
  targetUrlOrVideoId: string
): Promise<{ title?: string; artist?: string }> {
  const targetUrl = /^https?:\/\//i.test(targetUrlOrVideoId)
    ? targetUrlOrVideoId
    : `https://www.youtube.com/watch?v=${targetUrlOrVideoId}`;

  // Primary: Local Next.js YouTube oEmbed proxy (immune to third-party noembed timeouts & CORS)
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);
    const res = await fetch(
      `/api/music/meta?url=${encodeURIComponent(targetUrl)}`,
      { signal: controller.signal }
    );
    window.clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && typeof data.title === 'string' && data.title.trim()) {
        return {
          title: data.title.trim(),
          artist:
            typeof data.artist === 'string' && data.artist.trim()
              ? data.artist.trim()
              : undefined,
        };
      }
    }
  } catch {
    // Fall back to noembed
  }

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    const endpoint = `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`;
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

  // Live Active Song Info (updates dynamically inside YouTube Playlists & auto-heals custom titles)
  liveVideoId: string | null;
  liveTitle: string | null;
  liveArtist: string | null;
  livePlaylistIndex: number;
  livePlaylistTotal: number;

  // Ambient Sound Presets ('off' | 'rain' | 'brown')
  ambientPreset: AmbientPreset;
  ambientVolume: number;

  // Smart Pomodoro Study Timer
  pomodoroPreset: PomodoroPresetKey;
  pomodoroMode: 'focus' | 'break';
  pomodoroSecondsLeft: number;
  pomodoroRunning: boolean;
  pomodoroAutoPauseMusic: boolean;
  pomodoroCompletedToday: number;
  pomodoroCompletedDate: string;

  // Exam Auto-Duck & Sleep Timer & Zen Focus Overlay
  examAutoDuckMusic: boolean;
  sleepTimerMode: SleepTimerMode;
  sleepSecondsLeft: number;
  isZenModeOpen: boolean;

  // Floating Mini-Player UI (hidden by default; appears when user plays music or pins it)
  showMiniPlayer: boolean;
  miniPlayerCollapsed: boolean;
  miniPlayerDismissed: boolean;

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
  addLocalFileTrack: (file: File) => { ok: boolean; error?: string };
  removeCustomTrack: (trackId: string) => void;
  playCuratedStation: (station: CuratedStation) => void;
  addStationToQueue: (station: CuratedStation) => void;
  repairTrackMeta: (trackId: string, title: string, artist?: string) => void;
  setLiveTrackInfo: (
    info: {
      videoId?: string | null;
      title?: string | null;
      artist?: string | null;
      playlistIndex?: number;
      playlistTotal?: number;
    } | null
  ) => void;
  togglePinTrack: (trackId: string) => void;
  moveTrack: (trackId: string, direction: 'up' | 'down') => void;
  setReady: (ready: boolean) => void;
  setPlayerState: (state: MusicPlayerState) => void;
  setProgress: (currentTime: number, duration: number) => void;
  requestSeek: (seconds: number) => void;
  clearSeekRequest: () => void;
  setAmbientPreset: (preset: AmbientPreset) => void;
  setAmbientVolume: (volume: number) => void;
  togglePomodoro: () => void;
  setPomodoroPreset: (preset: PomodoroPresetKey) => void;
  resetPomodoro: (mode?: 'focus' | 'break') => void;
  adjustPomodoroSeconds: (deltaSeconds: number) => void;
  tickPomodoro: () => void;
  setPomodoroAutoPause: (enabled: boolean) => void;
  setExamAutoDuck: (enabled: boolean) => void;
  setSleepTimer: (mode: SleepTimerMode) => void;
  tickSleepTimer: () => void;
  setZenModeOpen: (open: boolean) => void;
  setShowMiniPlayer: (show: boolean) => void;
  setMiniPlayerCollapsed: (collapsed: boolean) => void;
  recordTrackError: (errorKey: string, code: number, message: string) => void;
  clearTrackError: (errorKey: string) => void;
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

  liveVideoId: null,
  liveTitle: null,
  liveArtist: null,
  livePlaylistIndex: -1,
  livePlaylistTotal: 0,

  ambientPreset: 'off',
  ambientVolume: 35,

  pomodoroPreset: '25/5',
  pomodoroMode: 'focus',
  pomodoroSecondsLeft: POMODORO_PRESETS['25/5'].focusSeconds,
  pomodoroRunning: false,
  pomodoroAutoPauseMusic: true,
  pomodoroCompletedToday: 0,
  pomodoroCompletedDate: getTodayDateKey(),

  examAutoDuckMusic: true,
  sleepTimerMode: 'off',
  sleepSecondsLeft: 0,
  isZenModeOpen: false,

  showMiniPlayer: false,
  miniPlayerCollapsed: true,
  miniPlayerDismissed: false,

  hydratePrefs: () => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw) as MusicPrefs;

      let didMigrateLegacyIds = false;
      const customList: MusicTrack[] = Array.isArray(prefs.customTracks)
        ? prefs.customTracks
            .filter(
              (t) =>
                t &&
                ((typeof t.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(t.videoId)) ||
                  (typeof t.playlistId === 'string' && t.playlistId.length >= 12))
            )
            .map((t) => {
              let resolvedVideoId =
                typeof t.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(t.videoId)
                  ? t.videoId
                  : DEFAULT_MUSIC_TRACKS[0].videoId;
              let resolvedUrl = t.url;

              if (resolvedVideoId === '5qap5aO4i9A') {
                resolvedVideoId = 'jfKfPfyJRdk';
                resolvedUrl = 'https://www.youtube.com/watch?v=jfKfPfyJRdk';
                didMigrateLegacyIds = true;
              } else if (resolvedVideoId === '7NOSDKb0HlU') {
                resolvedVideoId = '5yx6BWlEVcY';
                resolvedUrl = 'https://www.youtube.com/watch?v=5yx6BWlEVcY';
                didMigrateLegacyIds = true;
              }

              return {
                ...t,
                videoId: resolvedVideoId,
                url: resolvedUrl,
                isCustom: true,
              };
            })
        : [];

      if (didMigrateLegacyIds) {
        savePrefs({ customTracks: customList });
      }

      const pinnedSet = new Set(Array.isArray(prefs.pinnedTrackIds) ? prefs.pinnedTrackIds : []);
      const baseMerged = [
        ...DEFAULT_MUSIC_TRACKS,
        ...customList.filter(
          (ct) =>
            !DEFAULT_MUSIC_TRACKS.some(
              (dt) => !ct.playlistId && dt.videoId === ct.videoId
            )
        ),
      ].map((t) => ({
        ...t,
        isPinned: pinnedSet.has(t.id),
      }));

      let orderedTracks = baseMerged;
      if (Array.isArray(prefs.trackOrderIds) && prefs.trackOrderIds.length > 0) {
        const orderIndex = new Map<string, number>(
          prefs.trackOrderIds.map((id, idx) => [id, idx])
        );
        orderedTracks = [...baseMerged].sort((a, b) => {
          const ia = orderIndex.get(a.id);
          const ib = orderIndex.get(b.id);
          if (ia !== undefined && ib !== undefined) return ia - ib;
          if (ia !== undefined) return -1;
          if (ib !== undefined) return 1;
          return 0;
        });
      }

      const validTrack =
        prefs.currentTrackId && orderedTracks.some((t) => t.id === prefs.currentTrackId)
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
      const validAmbientPreset: AmbientPreset =
        prefs.ambientPreset === 'rain' ||
        prefs.ambientPreset === 'brown' ||
        prefs.ambientPreset === 'off'
          ? prefs.ambientPreset
          : get().ambientPreset;
      const validAmbientVol =
        typeof prefs.ambientVolume === 'number' && !Number.isNaN(prefs.ambientVolume)
          ? Math.max(0, Math.min(100, Math.round(prefs.ambientVolume)))
          : get().ambientVolume;
      const validPreset: PomodoroPresetKey =
        prefs.pomodoroPreset === '15/3' ||
        prefs.pomodoroPreset === '25/5' ||
        prefs.pomodoroPreset === '50/10'
          ? prefs.pomodoroPreset
          : get().pomodoroPreset;
      const validAutoPause =
        typeof prefs.pomodoroAutoPauseMusic === 'boolean'
          ? prefs.pomodoroAutoPauseMusic
          : get().pomodoroAutoPauseMusic;
      const validExamAutoDuck =
        typeof prefs.examAutoDuckMusic === 'boolean'
          ? prefs.examAutoDuckMusic
          : get().examAutoDuckMusic;

      const today = getTodayDateKey();
      const validCompletedToday =
        prefs.pomodoroCompletedDate === today &&
        typeof prefs.pomodoroCompletedToday === 'number' &&
        prefs.pomodoroCompletedToday >= 0
          ? Math.floor(prefs.pomodoroCompletedToday)
          : 0;

      const validShowMini =
        typeof prefs.showMiniPlayer === 'boolean' ? prefs.showMiniPlayer : get().showMiniPlayer;
      const validMiniCollapsed =
        typeof prefs.miniPlayerCollapsed === 'boolean'
          ? prefs.miniPlayerCollapsed
          : get().miniPlayerCollapsed;

      AmbientAudioEngine.setPreset(validAmbientPreset, validAmbientVol);

      set({
        tracks: orderedTracks,
        currentTrackId: validTrack,
        volume: validVolume,
        isMuted: validMuted,
        loopMode: validLoop,
        isShuffle: validShuffle,
        ambientPreset: validAmbientPreset,
        ambientVolume: validAmbientVol,
        pomodoroPreset: validPreset,
        pomodoroSecondsLeft: POMODORO_PRESETS[validPreset].focusSeconds,
        pomodoroAutoPauseMusic: validAutoPause,
        pomodoroCompletedToday: validCompletedToday,
        pomodoroCompletedDate: today,
        examAutoDuckMusic: validExamAutoDuck,
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
    const shouldRevealMini = autoPlay && !get().miniPlayerDismissed ? true : get().showMiniPlayer;
    set({
      currentTrackId: trackId,
      isPlaying: autoPlay,
      playerState: autoPlay ? 'buffering' : 'cued',
      currentTime: 0,
      duration: 0,
      liveVideoId: null,
      liveTitle: null,
      liveArtist: null,
      livePlaylistIndex: -1,
      livePlaylistTotal: 0,
      showMiniPlayer: shouldRevealMini,
    });
    playerController?.loadTrack(
      track.videoId,
      autoPlay,
      track.playlistId,
      track.isLocalFile ? track.localBlobUrl : undefined
    );
  },

  togglePlay: () => {
    const { isPlaying, playerState, miniPlayerDismissed, showMiniPlayer } = get();
    const next = !isPlaying;
    const shouldRevealMini = next && !miniPlayerDismissed ? true : showMiniPlayer;
    set({
      isPlaying: next,
      showMiniPlayer: shouldRevealMini,
      ...(next && playerState === 'error' ? { playerState: 'buffering' } : {}),
    });
    if (next) {
      playerController?.play();
    } else {
      playerController?.pause();
    }
  },

  setPlaying: (playing) => {
    const { playerState, miniPlayerDismissed, showMiniPlayer } = get();
    const shouldRevealMini = playing && !miniPlayerDismissed ? true : showMiniPlayer;
    set({
      isPlaying: playing,
      showMiniPlayer: shouldRevealMini,
      ...(playing && playerState === 'error' ? { playerState: 'buffering' } : {}),
    });
    if (playing) {
      playerController?.play();
    } else {
      playerController?.pause();
    }
  },

  toggleMute: () => {
    const next = !get().isMuted;
    const { volume, isDucked } = get();
    savePrefs({ isMuted: next });
    set({ isMuted: next });
    playerController?.syncAudio(next, volume, isDucked, true);
  },

  setMuted: (muted) => {
    const { volume, isDucked } = get();
    savePrefs({ isMuted: muted });
    set({ isMuted: muted });
    playerController?.syncAudio(muted, volume, isDucked, true);
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    const { isMuted, isDucked } = get();
    const nextMuted = clamped === 0 ? true : isMuted && clamped > 0 ? false : isMuted;
    savePrefs({ volume: clamped, isMuted: nextMuted });
    set({ volume: clamped, isMuted: nextMuted });
    playerController?.syncAudio(nextMuted, clamped, isDucked, true);
  },

  setDucked: (ducked) => {
    const { isMuted, volume } = get();
    set({ isDucked: ducked });
    playerController?.syncAudio(isMuted, volume, ducked, false);
  },

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
    const { tracks, currentTrackId, isShuffle, trackErrors } = get();
    if (tracks.length === 0) return;

    const validOthers = tracks.filter(
      (t) => t.id !== currentTrackId && !trackErrors[getTrackErrorKey(t)]
    );

    if (isShuffle && validOthers.length > 0) {
      const picked = validOthers[Math.floor(Math.random() * validOthers.length)];
      get().selectTrack(picked.id, true);
      return;
    }

    const idx = tracks.findIndex((t) => t.id === currentTrackId);
    for (let step = 1; step <= tracks.length; step++) {
      const candidate = tracks[(idx + step) % tracks.length];
      if (!trackErrors[getTrackErrorKey(candidate)]) {
        get().selectTrack(candidate.id, true);
        return;
      }
    }

    const next = tracks[(idx + 1) % tracks.length];
    get().selectTrack(next.id, true);
  },

  prevTrack: () => {
    const { tracks, currentTrackId } = get();
    if (tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrackId);
    const prevIdx = (idx - 1 + tracks.length) % tracks.length;
    const prev = tracks[prevIdx];
    get().selectTrack(prev.id, true);
  },

  addCustomTrackAsync: async (urlOrId, customTitle) => {
    const playlistId = extractYouTubePlaylistId(urlOrId);
    const videoId = extractYouTubeVideoId(urlOrId);

    if (!videoId && !playlistId) {
      return {
        ok: false,
        error:
          'Link hoặc ID YouTube không hợp lệ (hỗ trợ video youtu.be / youtube.com và YouTube Playlist ?list=...).',
      };
    }

    if (playlistId) {
      const existingPlaylist = get().tracks.find((t) => t.playlistId === playlistId);
      if (existingPlaylist) {
        get().selectTrack(existingPlaylist.id, true);
        return { ok: true };
      }

      const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
      const meta = customTitle?.trim()
        ? {}
        : await fetchYouTubeMeta(videoId ? `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}` : playlistUrl);
      const cleanTitle =
        (customTitle || '').trim() || meta.title || `YouTube Playlist (${playlistId.slice(0, 10)})`;
      const cleanArtist = meta.artist
        ? `${meta.artist} · YouTube Playlist`
        : 'YouTube Playlist';

      const duplicateAfterFetch = get().tracks.find((t) => t.playlistId === playlistId);
      if (duplicateAfterFetch) {
        get().selectTrack(duplicateAfterFetch.id, true);
        return { ok: true };
      }

      const newTrack: MusicTrack = {
        id: `playlist-${playlistId}`,
        videoId: videoId || DEFAULT_MUSIC_TRACKS[0].videoId,
        playlistId,
        title: cleanTitle,
        artist: cleanArtist,
        url: playlistUrl,
        isCustom: true,
      };

      const nextTracks = [...get().tracks, newTrack];
      savePrefs({
        customTracks: nextTracks.filter((t) => t.isCustom && !t.isLocalFile),
        trackOrderIds: nextTracks.filter((t) => !t.isLocalFile).map((t) => t.id),
      });
      set({ tracks: nextTracks });
      get().selectTrack(newTrack.id, true);
      return { ok: true };
    }

    if (!videoId) {
      return { ok: false, error: 'Không tìm thấy mã Video YouTube hợp lệ.' };
    }

    const existing = get().tracks.find((t) => !t.playlistId && t.videoId === videoId);
    if (existing) {
      get().selectTrack(existing.id, true);
      return { ok: true };
    }

    const meta = customTitle?.trim() ? {} : await fetchYouTubeMeta(videoId);
    const cleanTitle =
      (customTitle || '').trim() || meta.title || `YouTube Custom (${videoId})`;
    const cleanArtist = meta.artist
      ? `${meta.artist} · YouTube`
      : `Custom YouTube · ${videoId}`;

    // Re-check deduplication after async fetch
    const duplicateAfterFetch = get().tracks.find(
      (t) => !t.playlistId && t.videoId === videoId
    );
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
    savePrefs({
      customTracks: nextTracks.filter((t) => t.isCustom && !t.isLocalFile),
      trackOrderIds: nextTracks.filter((t) => !t.isLocalFile).map((t) => t.id),
    });
    set({ tracks: nextTracks });
    get().selectTrack(newTrack.id, true);
    return { ok: true };
  },

  addLocalFileTrack: (file: File) => {
    if (typeof window === 'undefined' || typeof URL === 'undefined' || !file) {
      return { ok: false, error: 'Trình duyệt không hỗ trợ phát file âm thanh cục bộ.' };
    }

    const isSupportedExt = /\.(mp3|m4a|wav|ogg|aac|flac|webm|opus)$/i.test(file.name);
    const isAudioMime = Boolean(file.type && file.type.startsWith('audio/'));
    if (!isSupportedExt && !isAudioMime) {
      return {
        ok: false,
        error: `File "${file.name}" không phải định dạng âm thanh (.mp3, .m4a, .wav, .ogg).`,
      };
    }

    const blobUrl = URL.createObjectURL(file);
    const cleanTitle =
      file.name.replace(/\.[^.]+$/, '').trim() || 'Nhạc từ máy của bạn';
    const newTrack: MusicTrack = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      videoId: 'jfKfPfyJRdk',
      title: cleanTitle,
      artist: 'Nhạc trên thiết bị (Offline)',
      url: blobUrl,
      isCustom: true,
      isLocalFile: true,
      localBlobUrl: blobUrl,
    };

    const nextTracks = [...get().tracks, newTrack];
    set({ tracks: nextTracks });
    get().selectTrack(newTrack.id, true);
    return { ok: true };
  },

  removeCustomTrack: (trackId) => {
    const target = get().tracks.find((t) => t.id === trackId);
    if (!target || !target.isCustom) return;

    if (target.isLocalFile && target.localBlobUrl && typeof URL !== 'undefined') {
      try {
        URL.revokeObjectURL(target.localBlobUrl);
      } catch {
        // Ignore revoke errors
      }
    }

    const nextTracks = get().tracks.filter((t) => t.id !== trackId);
    const isRemovingCurrent = get().currentTrackId === trackId;
    const fallbackId = isRemovingCurrent
      ? nextTracks[0]?.id || DEFAULT_MUSIC_TRACKS[0].id
      : get().currentTrackId;

    savePrefs({
      customTracks: nextTracks.filter((t) => t.isCustom && !t.isLocalFile),
      pinnedTrackIds: nextTracks.filter((t) => t.isPinned && !t.isLocalFile).map((t) => t.id),
      trackOrderIds: nextTracks.filter((t) => !t.isLocalFile).map((t) => t.id),
      currentTrackId: nextTracks.find((t) => t.id === fallbackId)?.isLocalFile
        ? DEFAULT_MUSIC_TRACKS[0].id
        : fallbackId,
    });

    set({
      tracks: nextTracks,
      currentTrackId: fallbackId,
      ...(isRemovingCurrent
        ? {
            currentTime: 0,
            duration: 0,
            liveVideoId: null,
            liveTitle: null,
            liveArtist: null,
            livePlaylistIndex: -1,
            livePlaylistTotal: 0,
          }
        : {}),
    });
  },

  playCuratedStation: (station) => {
    const { tracks, selectTrack } = get();
    const existing = tracks.find(
      (t) => !t.playlistId && (t.id === station.id || t.videoId === station.videoId)
    );
    if (existing) {
      selectTrack(existing.id, true);
      return;
    }

    const newTrack: MusicTrack = {
      id: `custom-${station.videoId}`,
      videoId: station.videoId,
      title: station.title,
      artist: station.artist,
      url: station.url,
      isCustom: true,
    };
    const nextTracks = [...tracks, newTrack];
    savePrefs({
      customTracks: nextTracks.filter((t) => t.isCustom && !t.isLocalFile),
      trackOrderIds: nextTracks.filter((t) => !t.isLocalFile).map((t) => t.id),
    });
    set({ tracks: nextTracks });
    get().selectTrack(newTrack.id, true);
  },

  addStationToQueue: (station) => {
    const { tracks } = get();
    const existing = tracks.find(
      (t) => !t.playlistId && (t.id === station.id || t.videoId === station.videoId)
    );
    if (existing) return;

    const newTrack: MusicTrack = {
      id: `custom-${station.videoId}`,
      videoId: station.videoId,
      title: station.title,
      artist: station.artist,
      url: station.url,
      isCustom: true,
    };
    const nextTracks = [...tracks, newTrack];
    savePrefs({
      customTracks: nextTracks.filter((t) => t.isCustom && !t.isLocalFile),
      trackOrderIds: nextTracks.filter((t) => !t.isLocalFile).map((t) => t.id),
    });
    set({ tracks: nextTracks });
  },

  repairTrackMeta: (trackId, title, artist) => {
    const cleanTitle = (title || '').trim();
    if (!cleanTitle) return;
    const current = get().tracks;
    const target = current.find((t) => t.id === trackId);
    if (!target || target.isLocalFile) return;

    const needsHeal =
      target.title.startsWith('YouTube Custom (') ||
      target.title.startsWith('YouTube Playlist (');
    if (!needsHeal) return;

    const nextTracks = current.map((t) =>
      t.id === trackId
        ? {
            ...t,
            title: cleanTitle,
            artist: artist?.trim() ? `${artist.trim()} · YouTube` : t.artist,
          }
        : t
    );
    savePrefs({
      customTracks: nextTracks.filter((t) => t.isCustom && !t.isLocalFile),
    });
    set({ tracks: nextTracks });
  },

  setLiveTrackInfo: (info) => {
    if (!info) {
      set({
        liveVideoId: null,
        liveTitle: null,
        liveArtist: null,
        livePlaylistIndex: -1,
        livePlaylistTotal: 0,
      });
      return;
    }
    set({
      liveVideoId: info.videoId ?? null,
      liveTitle: info.title ?? null,
      liveArtist: info.artist ?? null,
      livePlaylistIndex: info.playlistIndex ?? -1,
      livePlaylistTotal: info.playlistTotal ?? 0,
    });
  },

  togglePinTrack: (trackId) => {
    const current = get().tracks;
    const target = current.find((t) => t.id === trackId);
    if (!target) return;

    const nextPinned = !target.isPinned;
    const toggled = current.map((t) =>
      t.id === trackId ? { ...t, isPinned: nextPinned } : t
    );

    // Keep pinned tracks grouped neatly at the top while preserving relative order
    const pinned = toggled.filter((t) => t.isPinned);
    const unpinned = toggled.filter((t) => !t.isPinned);
    const reordered = [...pinned, ...unpinned];

    savePrefs({
      pinnedTrackIds: pinned.filter((t) => !t.isLocalFile).map((t) => t.id),
      trackOrderIds: reordered.filter((t) => !t.isLocalFile).map((t) => t.id),
    });
    set({ tracks: reordered });
  },

  moveTrack: (trackId, direction) => {
    const current = get().tracks;
    const idx = current.findIndex((t) => t.id === trackId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= current.length) return;

    const next = [...current];
    const [moved] = next.splice(idx, 1);
    next.splice(swapIdx, 0, moved);

    savePrefs({ trackOrderIds: next.filter((t) => !t.isLocalFile).map((t) => t.id) });
    set({ tracks: next });
  },

  setReady: (ready) => set({ isReady: ready }),

  setPlayerState: (playerState) => set({ playerState }),

  setProgress: (currentTime, duration) =>
    set({
      currentTime: Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0,
      duration: Number.isFinite(duration) && duration >= 0 ? duration : 0,
    }),

  requestSeek: (seconds) => {
    const clamped = Math.max(0, seconds);
    set({
      seekRequest: clamped,
      currentTime: clamped,
    });
    playerController?.seekTo(clamped);
  },

  clearSeekRequest: () => set({ seekRequest: null }),

  setAmbientPreset: (preset) => {
    const vol = get().ambientVolume;
    AmbientAudioEngine.setPreset(preset, vol);
    savePrefs({ ambientPreset: preset });
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

  setPomodoroPreset: (preset) => {
    const cfg = POMODORO_PRESETS[preset];
    if (!cfg) return;
    savePrefs({ pomodoroPreset: preset });
    set({
      pomodoroPreset: preset,
      pomodoroMode: 'focus',
      pomodoroSecondsLeft: cfg.focusSeconds,
      pomodoroRunning: false,
    });
  },

  resetPomodoro: (mode) => {
    const targetMode = mode || get().pomodoroMode;
    const cfg = POMODORO_PRESETS[get().pomodoroPreset] || POMODORO_PRESETS['25/5'];
    const nextSeconds = targetMode === 'focus' ? cfg.focusSeconds : cfg.breakSeconds;
    set({
      pomodoroMode: targetMode,
      pomodoroSecondsLeft: nextSeconds,
      pomodoroRunning: false,
    });
  },

  adjustPomodoroSeconds: (deltaSeconds) => {
    const current = get().pomodoroSecondsLeft;
    const next = Math.min(7200, Math.max(60, current + deltaSeconds));
    set({ pomodoroSecondsLeft: next });
  },

  tickPomodoro: () => {
    const {
      pomodoroRunning,
      pomodoroSecondsLeft,
      pomodoroMode,
      pomodoroAutoPauseMusic,
      pomodoroPreset,
      pomodoroCompletedToday,
      pomodoroCompletedDate,
      isPlaying,
    } = get();
    if (!pomodoroRunning) return;

    if (pomodoroSecondsLeft > 1) {
      set({ pomodoroSecondsLeft: pomodoroSecondsLeft - 1 });
      return;
    }

    const cfg = POMODORO_PRESETS[pomodoroPreset] || POMODORO_PRESETS['25/5'];

    if (pomodoroMode === 'focus') {
      AmbientAudioEngine.playPomodoroChime('break');
      const today = getTodayDateKey();
      const nextCount = (pomodoroCompletedDate === today ? pomodoroCompletedToday : 0) + 1;
      savePrefs({
        pomodoroCompletedToday: nextCount,
        pomodoroCompletedDate: today,
      });

      if (pomodoroAutoPauseMusic && isPlaying) {
        playerController?.pause();
      }

      set({
        pomodoroMode: 'break',
        pomodoroSecondsLeft: cfg.breakSeconds,
        pomodoroRunning: false,
        pomodoroCompletedToday: nextCount,
        pomodoroCompletedDate: today,
        ...(pomodoroAutoPauseMusic ? { isPlaying: false } : {}),
      });
    } else {
      AmbientAudioEngine.playPomodoroChime('focus');
      set({
        pomodoroMode: 'focus',
        pomodoroSecondsLeft: cfg.focusSeconds,
        pomodoroRunning: false,
      });
    }
  },

  setPomodoroAutoPause: (enabled) => {
    savePrefs({ pomodoroAutoPauseMusic: enabled });
    set({ pomodoroAutoPauseMusic: enabled });
  },

  setExamAutoDuck: (enabled) => {
    savePrefs({ examAutoDuckMusic: enabled });
    set({ examAutoDuckMusic: enabled });
    if (!enabled && get().isDucked) {
      get().setDucked(false);
    }
  },

  setSleepTimer: (mode) => {
    const nextSeconds =
      mode === '15'
        ? 15 * 60
        : mode === '30'
        ? 30 * 60
        : mode === '60'
        ? 60 * 60
        : 0;
    set({
      sleepTimerMode: mode,
      sleepSecondsLeft: nextSeconds,
    });
  },

  tickSleepTimer: () => {
    const { isPlaying, sleepTimerMode, sleepSecondsLeft } = get();
    if (!isPlaying || (sleepTimerMode !== '15' && sleepTimerMode !== '30' && sleepTimerMode !== '60')) {
      return;
    }
    if (sleepSecondsLeft > 1) {
      set({ sleepSecondsLeft: sleepSecondsLeft - 1 });
      return;
    }
    playerController?.pause();
    set({
      sleepTimerMode: 'off',
      sleepSecondsLeft: 0,
      isPlaying: false,
    });
  },

  setZenModeOpen: (open) => set({ isZenModeOpen: open }),

  setShowMiniPlayer: (show) => {
    savePrefs({ showMiniPlayer: show });
    set({ showMiniPlayer: show, miniPlayerDismissed: !show });
  },

  setMiniPlayerCollapsed: (collapsed) => {
    savePrefs({ miniPlayerCollapsed: collapsed });
    set({ miniPlayerCollapsed: collapsed });
  },

  recordTrackError: (errorKey, code, message) =>
    set((state) => ({
      trackErrors: {
        ...state.trackErrors,
        [errorKey]: { code, message },
      },
    })),

  clearTrackError: (errorKey) =>
    set((state) => {
      if (!state.trackErrors[errorKey]) return state;
      const next = { ...state.trackErrors };
      delete next[errorKey];
      return { trackErrors: next };
    }),
}));
