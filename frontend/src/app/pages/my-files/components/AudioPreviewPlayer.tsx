import { useEffect, useRef, useState } from "react";
import { formatTime } from "../myFilesPreviewUtils";

type AudioPreviewPlayerProps = {
  src: string | undefined;
  onError: (message: string) => void;
};

export function AudioPreviewPlayer({ src, onError }: AudioPreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset player state when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const el = audioRef.current;
    if (!el) return;

    el.pause();
    el.currentTime = 0;
  }, [src]);

  const togglePlayPause = async () => {
    const el = audioRef.current;
    if (!el) return;

    try {
      if (el.paused) {
        const p = el.play();
        if (p && typeof (p as Promise<void>).then === "function") {
          await p;
        }
        setIsPlaying(true);
      } else {
        el.pause();
        setIsPlaying(false);
      }
    } catch {
      onError("Gagal memuat preview audio.");
      setIsPlaying(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "1rem",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.10)",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <audio
          ref={audioRef}
          src={src ?? undefined}
          preload="metadata"
          className="hidden"
          onLoadedMetadata={() => {
            const el = audioRef.current;
            if (!el) return;
            setDuration(Number.isFinite(el.duration) ? el.duration : 0);
          }}
          onTimeUpdate={() => {
            const el = audioRef.current;
            if (!el) return;
            setCurrentTime(el.currentTime || 0);
          }}
          onEnded={() => {
            const el = audioRef.current;
            if (el) {
              el.currentTime = 0;
            }
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onError={() => {
            onError("Gagal memuat preview audio.");
            setIsPlaying(false);
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Play button + decorative equalizer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              paddingTop: 2,
              paddingBottom: 2,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: "rgba(59,130,246,0.14)",
                border: "1px solid rgba(59,130,246,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60a5fa",
                flex: "0 0 auto",
                fontSize: 18,
              }}
              aria-hidden="true"
            >
              {"♫"}
            </div>

            <button
              type="button"
              onClick={() => void togglePlayPause()}
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                border: "1px solid rgba(59,130,246,0.35)",
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(34,211,238,0.15))",
                color: "#e2e8f0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                height: 24,
                width: 120,
                opacity: isPlaying ? 1 : 0.6,
              }}
            >
              {Array.from({ length: 10 }).map((_, idx) => {
                const base = 6 + (idx % 5) * 3;
                const h = isPlaying ? base + (idx % 3) * 2 : base;
                const animate = isPlaying ? "pulse" : "none";
                const delay = `${idx * 60}ms`;
                return (
                  <div
                    key={idx}
                    style={{
                      width: 6,
                      height: h,
                      borderRadius: 999,
                      background: "rgba(96,165,250,0.75)",
                      animation: isPlaying
                        ? "bb-audio-eq 1.05s infinite ease-in-out"
                        : undefined,
                      animationDelay: isPlaying ? delay : undefined,
                      transition: "height 160ms ease",
                    }}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
          </div>

          {/* Seek + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                color: "#94a3b8",
                fontSize: 12,
                width: 44,
                textAlign: "left",
              }}
            >
              {formatTime(currentTime)}
            </div>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => {
                const el = audioRef.current;
                if (!el) return;
                const v = Number(e.target.value);
                el.currentTime = Number.isFinite(v) ? v : 0;
                setCurrentTime(el.currentTime || 0);
              }}
              style={{ width: "100%" }}
              aria-label="Seek audio"
            />

            <div
              style={{
                color: "#94a3b8",
                fontSize: 12,
                width: 44,
                textAlign: "right",
              }}
            >
              {formatTime(duration)}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bb-audio-eq {
          0% { transform: scaleY(0.75); opacity: 0.75; }
          50% { transform: scaleY(1.25); opacity: 1; }
          100% { transform: scaleY(0.85); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
