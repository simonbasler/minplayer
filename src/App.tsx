import { useState, useEffect, useRef, useCallback, memo, Component, ErrorInfo, ReactNode } from "react";
import "./App.css";
import { AudioEngine } from "./utils/AudioEngine";

interface Track {
  path: string;
  title: string;
  artist?: string;
  cover?: string;
  duration?: number;
}

interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  cover?: string;
}

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#e0e0e0' }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Memoized playlist item component
const PlaylistItem = memo(({
  track,
  index,
  isActive,
  isPlaying,
  isSelected,
  formatTime,
  onClick
}: {
  track: Track;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  formatTime: (time: number) => string;
  onClick: (e: React.MouseEvent) => void;
}) => (
  <div
    className={`playlist-row ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
    onClick={onClick}
  >
    <div className="col-idx">
      {isActive && isPlaying ? (
        <span>▶</span>
      ) : (
        (index + 1).toString().padStart(2, '0')
      )}
    </div>
    <div className="col-title">{track.title}</div>
    <div className="col-dur">{formatTime(track.duration || 0)}</div>
  </div>
));

PlaylistItem.displayName = 'PlaylistItem';

function App() {
  // Create AudioEngine instance once per component
  const audioEngineRef = useRef<AudioEngine | null>(null);
  if (!audioEngineRef.current) {
    audioEngineRef.current = new AudioEngine();
  }
  const audioEngine = audioEngineRef.current;

  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Track the current object URL to revoke it when switching
  const currentObjectUrlRef = useRef<string | null>(null);

  // State Refs for Callbacks
  const playlistRef = useRef(playlist);
  const indexRef = useRef(currentIndex);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { indexRef.current = currentIndex; }, [currentIndex]);


  // --- Helper Functions ---

  const isValidAudioFile = (path: string): boolean => {
    const validExtensions = ['.mp3', '.m4a', '.flac', '.wav', '.ogg', '.opus', '.aac', '.wma'];
    return validExtensions.some(ext => path.toLowerCase().endsWith(ext));
  };

  const getMimeType = (path: string): string => {
    const ext = path.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'm4a': 'audio/mp4',
      'flac': 'audio/flac',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'opus': 'audio/opus',
      'aac': 'audio/aac',
      'wma': 'audio/x-ms-wma'
    };
    return mimeTypes[ext || ''] || 'audio/mpeg'; // fallback to mp3
  };

  const playTrack = useCallback(async (index: number, currentList = playlist) => {
    if (index < 0 || index >= currentList.length) return;
    const track = currentList[index];

    // Validate file type before attempting to play
    if (!isValidAudioFile(track.path)) {
      const errorMsg = "Invalid audio file type";
      console.error(errorMsg, track.path);
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setCurrentIndex(index);

    try {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = null;
      }

      const { readFile } = await import('@tauri-apps/plugin-fs');
      const bytes = await readFile(track.path);
      const mimeType = getMimeType(track.path);
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);

      currentObjectUrlRef.current = url;

      audioEngine.load(url);
      audioEngine.setVolume(volume);
      await audioEngine.play();
      setIsPlaying(true);
      setErrorMessage(null);

    } catch (e) {
      const errorMsg = "Failed to load audio file";
      console.error(errorMsg, e);
      setErrorMessage(errorMsg);
      setTimeout(() => setErrorMessage(null), 3000);
      setIsPlaying(false);
    }
  }, [playlist, volume, audioEngine]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      if (currentIndex === -1 && playlist.length > 0) {
        playTrack(0);
      } else {
        audioEngine.play().then(() => {
          setIsPlaying(true);
        }).catch(e => {
          console.error("Playback failed:", e);
          setIsPlaying(false);
        });
      }
    }
  }, [isPlaying, currentIndex, playlist, audioEngine, playTrack]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    audioEngine.seek(time);
    setCurrentTime(time);
  };

  const formatTime = useCallback((time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const formatRemaining = useCallback((current: number, total: number) => {
    const remaining = total - current;
    if (remaining <= 0 || isNaN(remaining)) return "0:00";
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    return `-${m}:${s.toString().padStart(2, "0")}`;
  }, []);

  const handlePlaylistItemClick = useCallback((index: number, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl + Click: Toggle selection
      setSelectedIndices(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
          newSet.delete(index);
        } else {
          newSet.add(index);
        }
        return newSet;
      });
    } else {
      // Normal click: Play track and clear selection
      playTrack(index);
      setSelectedIndices(new Set());
    }
  }, [playTrack]);

  const deleteSelectedTracks = useCallback(() => {
    if (selectedIndices.size === 0) return;

    const indicesToDelete = Array.from(selectedIndices).sort((a, b) => b - a);

    setPlaylist(prev => {
      const newPlaylist = [...prev];
      indicesToDelete.forEach(idx => {
        newPlaylist.splice(idx, 1);
      });
      return newPlaylist;
    });

    // Adjust currentIndex if needed
    setCurrentIndex(prevIdx => {
      if (prevIdx === -1) return -1;

      let newIdx = prevIdx;
      for (const deletedIdx of indicesToDelete) {
        if (deletedIdx < prevIdx) {
          newIdx--;
        } else if (deletedIdx === prevIdx) {
          // Current track was deleted
          return -1;
        }
      }
      return newIdx;
    });

    setSelectedIndices(new Set());
  }, [selectedIndices]);


  // --- Effects ---

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Audio Engine Handlers
    audioEngine.setHandlers(
      (time) => setCurrentTime(time),
      () => {
        // On Ended
        const currentPlaylist = playlistRef.current;
        const currentIdx = indexRef.current;

        // Validate current index is still valid
        if (currentIdx < 0 || currentIdx >= currentPlaylist.length) {
          setIsPlaying(false);
          return;
        }

        const nextIndex = currentIdx + 1;
        if (nextIndex < currentPlaylist.length) {
          playTrack(nextIndex, currentPlaylist);
        } else {
          setIsPlaying(false);
        }
      },
      (dur) => setDuration(dur)
    );

    // Initial Drag & Drop Setup
    const setupListener = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const { invoke } = await import('@tauri-apps/api/core');

      const unlisten = await listen('tauri://drag-drop', async (event) => {
        const payload = event.payload as { paths: string[] };
        if (payload.paths && payload.paths.length > 0) {

          // Filter only valid audio files
          const validPaths = payload.paths.filter(path => isValidAudioFile(path));

          if (validPaths.length === 0) {
            console.warn("No valid audio files in dropped items");
            return;
          }

          // Metadata extraction
          const newTracks: Track[] = await Promise.all(validPaths.map(async (path) => {
            const name = path.split(/[\\/]/).pop()?.replace(/\.[^/.]+$/, "") || "Unknown Track";
            let metadata: AudioMetadata | null = null;
            try {
              metadata = await invoke('get_metadata', { path });
            } catch (e) {
              console.error("Metadata error:", e);
            }

            return {
              path: path,
              title: metadata?.title || name,
              artist: metadata?.artist || "Unknown Artist",
              cover: metadata?.cover,
              duration: metadata?.duration
            };
          }));

          setPlaylist(prev => {
            const updated = [...prev, ...newTracks];
            if (prev.length === 0 && updated.length > 0) {
              // Use queueMicrotask to defer playback until after state update
              queueMicrotask(() => playTrack(0, updated));
            }
            return updated;
          });
        }
      });

      return () => {
        unlisten();
      };
    };

    let cleanup: (() => void) | undefined;
    let isMounted = true;

    setupListener().then(c => {
      if (isMounted) {
        cleanup = c;
      } else {
        // Component already unmounted, cleanup immediately
        c();
      }
    });

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, []);

  // Keyboard and Media Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Cmd+A: Select all tracks
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyA") {
        e.preventDefault();
        setSelectedIndices(new Set(playlist.map((_, i) => i)));
        return;
      }

      // Delete or Backspace: Delete selected tracks
      if (e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        deleteSelectedTracks();
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          audioEngine.seek(currentTime - 5);
          setCurrentTime(t => t - 5);
          break;
        case "ArrowRight":
          audioEngine.seek(currentTime + 5);
          setCurrentTime(t => t + 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          const vUp = Math.min(1, volume + 0.1);
          setVolume(vUp);
          audioEngine.setVolume(vUp);
          break;
        case "ArrowDown":
          e.preventDefault();
          const vDown = Math.max(0, volume - 0.1);
          setVolume(vDown);
          audioEngine.setVolume(vDown);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [volume, currentTime, togglePlay, audioEngine, playlist, deleteSelectedTracks]);

  // Media Session API
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const track = playlist[currentIndex];
    if (track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || "Unknown Artist",
        artwork: track.cover ? [{ src: track.cover, sizes: '512x512', type: 'image/jpeg' }] : []
      });
    }

    navigator.mediaSession.setActionHandler('play', () => {
      audioEngine.play();
      setIsPlaying(true);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioEngine.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (currentIndex > 0) playTrack(currentIndex - 1);
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (currentIndex < playlist.length - 1) playTrack(currentIndex + 1);
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        audioEngine.seek(details.seekTime);
        setCurrentTime(details.seekTime);
      }
    });

  }, [currentIndex, playlist, isPlaying]);


  const currentTrack = playlist[currentIndex] || { title: "MinPlayer", artist: "Drop files to play" };

  return (
    <div className="app-container">
      <header className="titlebar" data-tauri-drag-region>
        <span>MinPlayer</span>
      </header>

      {/* Error Message */}
      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      {/* Player Section */}
      <section className="player-section">
        <div className="album-art">
          {currentTrack.cover ? (
            <img src={currentTrack.cover} alt="Cover" />
          ) : (
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="12" cy="12" r="10" /><path d="M6 13v3a1 1 0 0 0 1 1h3" /><path d="M20 13v3a1 1 0 0 1-1 1h-3" /><path d="M4 19h16" /></svg>
          )}
        </div>

        <div className="track-display">
          <h1 className="title">{currentTrack.title}</h1>
          <h2 className="artist">{currentTrack.artist}</h2>
        </div>

        <div className="controls">
          <button className="control-btn" onClick={() => {
            if (currentIndex > 0) playTrack(currentIndex - 1);
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"></line></svg>
          </button>

          <button className="play-message-btn" onClick={togglePlay}>
            {isPlaying ? (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            )}
          </button>

          <button className="control-btn" onClick={() => {
            if (currentIndex < playlist.length - 1) playTrack(currentIndex + 1);
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"></line></svg>
          </button>
        </div>

        <div className="progress-bar">
          <span className="time-curr">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="time-slider"
          />
          <span className="time-rem">{formatRemaining(currentTime, duration)}</span>
        </div>
      </section>

      {/* Playlist Section */}
      <section className="playlist-section">
        <div className="playlist-header">
          <div className="col-idx">#</div>
          <div className="col-title">Title</div>
          <div className="col-dur">Duration</div>
        </div>

        <div className="playlist-content">
          {playlist.map((track, i) => (
            <PlaylistItem
              key={i}
              track={track}
              index={i}
              isActive={i === currentIndex}
              isPlaying={isPlaying}
              isSelected={selectedIndices.has(i)}
              formatTime={formatTime}
              onClick={(e) => handlePlaylistItemClick(i, e)}
            />
          ))}
          {playlist.length === 0 && (
            <div className="empty-state">Drag & Drop files here</div>
          )}
        </div>
      </section>

      {/* Bottom Footer Bar */}
      <footer className="bottom-bar">
        <div className="footer-left">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="volume-icon">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            {volume > 0.5 && (
              <>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              </>
            )}
            {volume > 0 && volume <= 0.5 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>}
            {volume === 0 && (
              <>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
              </>
            )}
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              audioEngine.setVolume(v);
              // Update slider background
              const percent = v * 100;
              e.target.style.background = `linear-gradient(to right, #fca311 0%, #fca311 ${percent}%, #444 ${percent}%, #444 100%)`;
            }}
            className="volume-slider"
            style={{
              background: `linear-gradient(to right, #fca311 0%, #fca311 ${volume * 100}%, #444 ${volume * 100}%, #444 100%)`
            }}
          />
        </div>
        <div className="footer-right">
          {playlist.length} tracks, {formatTime(playlist.reduce((acc, t) => acc + (t.duration || 0), 0))}
        </div>
      </footer>
    </div>
  );
}

export default App;
export { ErrorBoundary };
