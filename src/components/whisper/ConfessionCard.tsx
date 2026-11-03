import { useState } from "react";
import { Flame, Lock, MessageCircle, Send, Bookmark, Share2, Check } from "lucide-react";
import { DAY_MS, catInfo, moodInfo, type Confession, type Theme } from "@/lib/whisper";
import { soundEngine } from "@/lib/sound-engine";
export function CandleButton({
  t,
  lit,
  count,
  onLight,
  size = 15,
  label,
}: {
  t: Theme;
  lit: boolean;
  count: number;
  onLight: () => void;
  size?: number;
  label?: string;
}) {
  const [burst, setBurst] = useState(false);
  const sparks = [-1, -0.5, 0, 0.5, 1];

  function handleClick() {
    if (lit) return;
    setBurst(true);
    soundEngine.playCandleChime();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([30, 20, 40]);
    }
    onLight();
    setTimeout(() => setBurst(false), 900);
  }

  return (
    <button
      onClick={handleClick}
      disabled={lit}
      aria-label={lit ? "Candle lit" : "Light a candle"}
      className="whisper-btn whisper-sans relative flex min-h-11 items-center gap-1.5 text-sm"
      style={{ color: lit ? t.accent : t.textDim }}
    >
      <span className="relative inline-flex items-center">
        <Flame
          size={size}
          className={lit ? "flame-flicker" : ""}
          style={{ fill: lit ? t.accent : "none", color: lit ? t.accent : "currentColor" }}
        />
        {burst && (
          <>
            <span
              className="float-badge whisper-mono pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold"
              style={{ color: t.accent }}
            >
              +1 lit
            </span>
            {sparks.map((sx, i) => (
              <span
                key={i}
                className="spark"
                style={
                  {
                    color: t.accent,
                    "--tx": `${sx * 16}px`,
                    "--ty": `${-12 - Math.abs(sx) * 8}px`,
                  } as React.CSSProperties
                }
              />
            ))}
          </>
        )}
      </span>
      <span className="whisper-mono tabular-nums">{count}</span>
      {label && <span>{label}</span>}
    </button>
  );
}

export function ConfessionCard({
  t,
  c,
  lit,
  onLight,
  repliesOpen,
  onToggleReplies,
  draft,
  setDraft,
  onReply,
  now,
  bookmarked = false,
  onToggleBookmark,
}: {
  t: Theme;
  c: Confession;
  lit: boolean;
  onLight: () => void;
  repliesOpen: boolean;
  onToggleReplies: () => void;
  draft: string;
  setDraft: (v: string) => void;
  onReply: () => void;
  now: number;
  bookmarked?: boolean;
  onToggleBookmark?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const cat = catInfo(c.category);
  const md = moodInfo(c.mood);
  const Icon = cat.icon;
  const sealUntil = c.seal_until ? new Date(c.seal_until).getTime() : null;
  const expiresAt = c.expires_at ? new Date(c.expires_at).getTime() : null;
  const createdAt = new Date(c.created_at).getTime();
  const sealed = !!sealUntil && sealUntil > now;
  const fadePct = expiresAt ? Math.max(0, Math.min(100, ((expiresAt - now) / DAY_MS) * 100)) : null;
  const accentColor = md?.color || t.accent;

  function handleCopy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      const attribution = c.to_whom ? ` (to ${c.to_whom})` : "";
      void navigator.clipboard.writeText(`"${c.content}"${attribution} — Whisper Wall`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (sealed && sealUntil) {
    const totalWait = Math.max(1, sealUntil - createdAt);
    const remaining = sealUntil - now;
    const pct = Math.max(0, Math.min(100, 100 - (remaining / totalWait) * 100));
    const days = Math.floor(remaining / DAY_MS);
    const hours = Math.floor((remaining % DAY_MS) / 3600000);
    return (
      <div
        className="whisper-card rounded-2xl p-5 text-center"
        style={{
          background: t.panelAlt,
          backdropFilter: t.blur,
          border: `1px dashed ${t.borderStrong}`,
        }}
      >
        <Lock className="mx-auto mb-2" size={18} style={{ color: t.textFaint }} />
        <p className="whisper-serif mb-1 text-sm italic" style={{ color: t.textDim }}>
          A sealed time capsule
        </p>
        <p className="whisper-mono mb-3 text-xs" style={{ color: t.textFaint }}>
          opens in {days > 0 ? `${days}d ${hours}h` : `${hours}h`}
        </p>
        <div
          className="mx-auto h-0.5 overflow-hidden rounded-full"
          style={{ width: "70%", background: t.borderStrong }}
        >
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.accent }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="whisper-card group relative rounded-2xl p-5"
      style={{
        background: t.panel,
        backdropFilter: t.blur,
        border: `1px solid ${accentColor}3D`,
        boxShadow: `0 6px 24px -14px ${accentColor}`,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
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
              aria-label={bookmarked ? "Saved in your pocket" : "Save to your pocket"}
              className="whisper-btn opacity-60 hover:opacity-100"
              style={{ color: bookmarked ? t.accent : t.textFaint }}
            >
              <Bookmark size={13} fill={bookmarked ? "currentColor" : "none"} />
            </button>
          )}

          <button
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy whisper quote"}
            aria-label="Copy whisper quote"
            className="whisper-btn opacity-60 hover:opacity-100"
            style={{ color: copied ? t.accent : t.textFaint }}
          >
            {copied ? <Check size={13} /> : <Share2 size={13} />}
          </button>
        </div>
      </div>

      {c.to_whom && (
        <p className="whisper-sans mb-2 text-xs italic" style={{ color: t.textDim }}>
          to {c.to_whom}
        </p>
      )}

      <p
        className="whisper-serif mb-4 whitespace-pre-wrap break-words text-lg leading-relaxed"
        style={{ color: t.text }}
      >
        {c.content}
      </p>

      {fadePct !== null && (
        <div className="mb-4">
          <div
            className="h-0.5 overflow-hidden rounded-full"
            style={{ background: t.borderStrong }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${fadePct}%`, background: t.accent }}
            />
          </div>
          <p className="whisper-mono mt-1 text-[10px]" style={{ color: t.textFaint }}>
            fading
          </p>
        </div>
      )}

      {/* Action Row */}
      <div className="flex items-center gap-4 pt-1">
        <CandleButton t={t} lit={lit} count={c.candle_count} onLight={onLight} />
        <button
          onClick={onToggleReplies}
          className="whisper-btn whisper-sans flex min-h-11 items-center gap-1.5 text-sm"
          style={{ color: t.textDim }}
        >
          <MessageCircle size={15} />
          <span className="whisper-mono tabular-nums">{c.replies.length}</span>
        </button>
      </div>

      {repliesOpen && (
        <div className="fade-in mt-4 space-y-3 pt-4" style={{ borderTop: `1px solid ${t.border}` }}>
          {c.replies.map((r) => (
            <p
              key={r.id}
              className="whisper-sans break-words pl-3 text-sm"
              style={{ color: t.textDim, borderLeft: `2px solid ${t.border}` }}
            >
              {r.text}
            </p>
          ))}
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 300))}
              onKeyDown={(e) => {
                if (e.key === "Enter") onReply();
              }}
              placeholder="Whisper back, anonymously"
              className="whisper-sans min-h-11 min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: t.panelAlt, border: `1px solid ${t.border}`, color: t.text }}
            />
            <button
              onClick={onReply}
              aria-label="Send reply"
              className="whisper-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: t.accentSoft,
                border: `1px solid ${t.border}`,
                color: t.accentText,
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
