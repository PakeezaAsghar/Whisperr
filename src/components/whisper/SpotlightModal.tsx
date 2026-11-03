import { useState } from "react";
import { X, Share2, Check, Bookmark } from "lucide-react";
import { catInfo, moodInfo, timeAgo, type Confession, type Theme } from "@/lib/whisper";
import { CandleButton } from "./ConfessionCard";

export function SpotlightModal({
  t,
  confession,
  onClose,
  lit,
  onLight,
  now,
  bookmarked = false,
  onToggleBookmark,
}: {
  t: Theme;
  confession: Confession;
  onClose: () => void;
  lit: boolean;
  onLight: () => void;
  now: number;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const cat = catInfo(confession.category);
  const md = moodInfo(confession.mood);
  const Icon = cat.icon;
  const sealed = !!confession.seal_until && new Date(confession.seal_until).getTime() > now;

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const attribution = confession.to_whom ? ` (to ${confession.to_whom})` : "";
      void navigator.clipboard.writeText(`"${confession.content}"${attribution} — Whisper Wall`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: t.modalBg, backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl"
        style={{
          background: t.panelAlt,
          backdropFilter: t.blur,
          border: `1px solid ${t.borderStrong}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <span
            className="whisper-sans flex min-w-0 items-center gap-1.5 text-xs"
            style={{ color: t.textDim }}
          >
            <Icon size={13} className="shrink-0" />
            <span className="truncate">
              {cat.label}
              {md && <span style={{ color: md.color }}> · {md.label}</span>}
            </span>
          </span>

          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                onClick={onToggleBookmark}
                title={bookmarked ? "Saved in your pocket" : "Save to your pocket"}
                className="whisper-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  border: `1px solid ${t.border}`,
                  color: bookmarked ? t.accent : t.textDim,
                }}
              >
                <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
              </button>
            )}

            <button
              onClick={handleCopy}
              title={copied ? "Copied" : "Copy quote"}
              className="whisper-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ border: `1px solid ${t.border}`, color: copied ? t.accent : t.textDim }}
            >
              {copied ? <Check size={15} /> : <Share2 size={15} />}
            </button>

            <button
              onClick={onClose}
              aria-label="Close"
              className="whisper-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ border: `1px solid ${t.border}`, color: t.textDim }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {sealed ? (
          <p className="whisper-serif text-lg italic" style={{ color: t.textDim }}>
            This whisper is still sealed as a time capsule. Come back later.
          </p>
        ) : (
          <>
            {confession.to_whom && (
              <p className="whisper-sans mb-2 text-xs italic" style={{ color: t.textDim }}>
                to {confession.to_whom}
              </p>
            )}
            <p
              className="whisper-serif whitespace-pre-wrap break-words text-xl leading-relaxed sm:text-2xl"
              style={{ color: t.text }}
            >
              &ldquo;{confession.content}&rdquo;
            </p>
          </>
        )}

        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
          style={{ borderColor: t.border }}
        >
          <CandleButton
            t={t}
            lit={lit}
            count={confession.candle_count}
            onLight={onLight}
            label="light a candle"
          />

          <span className="whisper-mono text-xs" style={{ color: t.textFaint }}>
            {timeAgo(confession.created_at, now)}
          </span>
        </div>
      </div>
    </div>
  );
}
