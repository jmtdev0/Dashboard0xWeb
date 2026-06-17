"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MusicTrack } from "@/lib/music-tracks";

type MusicControllerProps = {
  tracks: MusicTrack[];
};

export function MusicController({ tracks }: MusicControllerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.58);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(() => tracks[0]?.durationSeconds ?? 0);
  const [message, setMessage] = useState<string | null>(null);
  const track = tracks[trackIndex];
  const canSwitchTracks = tracks.length > 1;

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
    audio.muted = muted;
  }, [muted, volume]);

  const progress = useMemo(() => {
    if (!duration) {
      return 0;
    }

    return Math.min(100, (currentTime / duration) * 100);
  }, [currentTime, duration]);

  if (!track) {
    return null;
  }

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setMessage(null);

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setMessage("Press play again to start audio.");
    }
  };

  const handleProgressChange = (value: string) => {
    const audio = audioRef.current;
    const nextProgress = Number(value);

    if (!audio || !duration) {
      return;
    }

    const nextTime = (nextProgress / 100) * duration;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleTrackStep = (direction: 1 | -1) => {
    if (!canSwitchTracks) {
      return;
    }

    const audio = audioRef.current;
    const nextIndex =
      trackIndex + direction < 0
        ? tracks.length - 1
        : trackIndex + direction >= tracks.length
          ? 0
          : trackIndex + direction;

    audio?.pause();
    setTrackIndex(nextIndex);
    setCurrentTime(0);
    setDuration(tracks[nextIndex]?.durationSeconds ?? 0);
    setPlaying(false);
    setMessage(null);
  };

  return (
    <section
      className={
        expanded
          ? "fixed bottom-4 left-4 right-4 z-30 sm:left-auto sm:w-[340px] lg:w-[360px]"
          : "fixed bottom-4 right-4 z-30 sm:bottom-5 sm:right-6 lg:right-8"
      }
    >
      <audio
        ref={audioRef}
        src={track.audioUrl}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;
          setDuration(
            Number.isFinite(nextDuration) ? nextDuration : track.durationSeconds
          );
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => setPlaying(false)}
      />

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="grid h-14 w-14 place-items-center rounded-lg border border-amber-300/35 bg-slate-950/82 text-2xl font-black text-amber-100 shadow-2xl shadow-black/40 backdrop-blur-xl transition hover:border-amber-200/70 hover:bg-slate-900/90 focus:outline-none focus:ring-2 focus:ring-amber-200/70"
          aria-label="Open music player"
          title="Music player"
        >
          <MusicNoteIcon />
        </button>
      ) : (
      <div className="rounded-lg border border-white/15 bg-slate-950/82 px-3 py-2 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlayback}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-amber-300/35 bg-amber-400/15 text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-400/25"
            aria-label={playing ? "Pause music" : "Play music"}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">
              {track.title}
            </p>
            <p className="truncate text-xs text-slate-400">{track.artist}</p>
          </div>

          <a
            href={track.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-blue-100 transition hover:bg-white/10"
          >
            Source
          </a>

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/10"
            aria-label={expanded ? "Collapse music controls" : "Expand music controls"}
          >
            <ChevronIcon expanded={expanded} />
          </button>
        </div>

        {expanded && (
          <div className="mt-3 border-t border-white/10 pt-3">
            <ControllerBody
              canSwitchTracks={canSwitchTracks}
              compact
              currentTime={currentTime}
              duration={duration}
              handleProgressChange={handleProgressChange}
              handleTrackStep={handleTrackStep}
              message={message}
              muted={muted}
              playing={playing}
              progress={progress}
              setMuted={setMuted}
              setVolume={setVolume}
              togglePlayback={togglePlayback}
              track={track}
              volume={volume}
            />
          </div>
        )}
      </div>
      )}
    </section>
  );
}

type ControllerBodyProps = {
  canSwitchTracks: boolean;
  compact?: boolean;
  currentTime: number;
  duration: number;
  handleProgressChange: (value: string) => void;
  handleTrackStep: (direction: 1 | -1) => void;
  message: string | null;
  muted: boolean;
  playing: boolean;
  progress: number;
  setMuted: Dispatch<SetStateAction<boolean>>;
  setVolume: Dispatch<SetStateAction<number>>;
  togglePlayback: () => Promise<void>;
  track: MusicTrack;
  volume: number;
};

function ControllerBody({
  canSwitchTracks,
  compact = false,
  currentTime,
  duration,
  handleProgressChange,
  handleTrackStep,
  message,
  muted,
  playing,
  progress,
  setMuted,
  setVolume,
  togglePlayback,
  track,
  volume,
}: ControllerBodyProps) {
  return (
    <div className={`flex items-start gap-3 ${compact ? "gap-0" : ""}`}>
      {!compact && (
        <button
          type="button"
          onClick={togglePlayback}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-amber-300/35 bg-amber-400/15 text-amber-100 transition hover:border-amber-200/70 hover:bg-amber-400/25"
          aria-label={playing ? "Pause music" : "Play music"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
      )}

      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {track.title}
              </p>
              <p className="truncate text-xs text-slate-400">{track.artist}</p>
            </div>
            <a
              href={track.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] font-semibold text-blue-100 transition hover:bg-white/10"
            >
              Source
            </a>
          </div>
        )}

        <div className={`${compact ? "" : "mt-3"} flex items-center gap-2`}>
          <span className="w-10 text-[11px] tabular-nums text-slate-400">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(event) => handleProgressChange(event.target.value)}
            className="h-1 flex-1 accent-amber-300"
            aria-label="Music progress"
          />
          <span className="w-10 text-right text-[11px] tabular-nums text-slate-400">
            {formatDuration(duration || track.durationSeconds)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {compact && (
              <button
                type="button"
                onClick={togglePlayback}
                className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/10"
                aria-label={playing ? "Pause music" : "Play music"}
              >
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleTrackStep(-1)}
              disabled={!canSwitchTracks}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous track"
            >
              <PreviousIcon />
            </button>
            <button
              type="button"
              onClick={() => handleTrackStep(1)}
              disabled={!canSwitchTracks}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next track"
            >
              <NextIcon />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMuted((current) => !current)}
              className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-slate-300 transition hover:bg-white/10"
              aria-label={muted ? "Unmute music" : "Mute music"}
            >
              {muted || volume === 0 ? <MutedIcon /> : <VolumeIcon />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="w-20 accent-amber-300"
              aria-label="Music volume"
            />
          </div>
        </div>

        {message && <p className="mt-2 text-xs text-amber-100">{message}</p>}
      </div>
    </div>
  );
}

function formatDuration(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = Math.floor(safeSeconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function MusicNoteIcon() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 18V7l10-2v11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 18.5a3 2.2 0 1 1-2-2.08M19 16.5a3 2.2 0 1 1-2-2.08"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zM9 12l9 6V6z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6h2v12h-2zM6 18l9-6-9-6z" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 9v6h4l5 4V5L8 9H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MutedIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 9v6h4l5 4V5L8 9H4zM18 9l-4 6M14 9l4 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
