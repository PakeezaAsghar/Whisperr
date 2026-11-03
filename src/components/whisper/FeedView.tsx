import { useState } from "react";
import { Flame, Loader2, Search, Shuffle, Star, Rows3 } from "lucide-react";
import {
  CATEGORIES,
  isAlive,
  isSealed,
  moodInfo,
  catInfo,
  type Confession,
  type Theme,
} from "@/lib/whisper";
import { ConfessionCard } from "./ConfessionCard";

function hashPos(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const x = (h % 9000) / 100 + 4;
  const y = ((h >>> 8) % 7500) / 100 + 6;
  return { x: Math.min(x, 94), y: Math.min(y, 80) };
}

function SkyView({
  t,
  visible,
  now,
  onOpen,
}: {
  t: Theme;
  visible: Confession[];
  now: number;
  onOpen: (c: Confession) => void;
}) {
  const [hovered, setHovered] = useState<Confession | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  // Calculate constellation pairs for whispers with the same mood
  const starsWithPos = visible.map((c) => ({
    c,
    ...hashPos(c.id),
  }));

  const lines: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
  for (let i = 0; i < Math.min(starsWithPos.length, 25); i++) {
    for (let j = i + 1; j < Math.min(starsWithPos.length, 25); j++) {
      const s1 = starsWithPos[i];
      const s2 = starsWithPos[j];
      if (s1.c.mood && s1.c.mood === s2.c.mood) {
        const dx = s1.x - s2.x;
        const dy = s1.y - s2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 28) {
          const md = moodInfo(s1.c.mood);
          lines.push({
            x1: s1.x,
            y1: s1.y,
            x2: s2.x,
            y2: s2.y,
            color: md?.color || t.accent,
          });
        }
      }
    }
  }

  return (
    <div
      className="fade-in relative overflow-hidden rounded-2xl"
      style={{
        height: 440,
        background: t.panelAlt,
        backdropFilter: t.blur,
        border: `1px solid ${t.border}`,
      }}
      onMouseLeave={() => setHovered(null)}
    >
      {/* SVG Constellation Lines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-35" aria-hidden>
        {lines.map((l, idx) => (
          <line
            key={idx}
            x1={`${l.x1}%`}
            y1={`${l.y1}%`}
            x2={`${l.x2}%`}
            y2={`${l.y2}%`}
            stroke={l.color}
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
        ))}
      </svg>

      {visible.map((c) => {
        const md = moodInfo(c.mood);
        const color = md?.color || t.accent;
        const { x, y } = hashPos(c.id);
        const size = Math.max(10, Math.min(24, 10 + c.candle_count * 1.8));
        const sealed = isSealed(c, now);
        return (
          <button
            key={c.id}
            onClick={() => onOpen(c)}
            onMouseEnter={(e) => {
              setHovered(c);
              const rect = e.currentTarget.parentElement?.getBoundingClientRect();
              if (rect) {
                setHoverPos({
                  x: Math.min(Math.max(16, (x / 100) * rect.width - 100), rect.width - 220),
                  y: Math.max(12, (y / 100) * rect.height - 70),
                });
              }
            }}
            aria-label={sealed ? "A sealed whisper" : c.content.slice(0, 60)}
            className="whisper-btn flame-flicker absolute rounded-full transition-transform hover:scale-150"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              background: sealed ? t.textFaint : color,
              boxShadow: sealed ? "none" : `0 0 ${size * 1.4}px ${color}`,
              opacity: sealed ? 0.45 : 0.9,
              animationDuration: `${2.2 + (size % 3)}s`,
              zIndex: 2,
            }}
          />
        );
      })}

      {/* Floating Hover Card */}
      {hovered && (
        <div
          className="fade-in pointer-events-none absolute z-10 w-56 rounded-xl p-3 shadow-2xl transition-all"
          style={{
            left: hoverPos.x,
            top: hoverPos.y,
            background: t.modalBg,
            backdropFilter: t.blur,
            border: `1px solid ${t.borderStrong}`,
            color: t.text,
          }}
        >
          <div
            className="mb-1 flex items-center justify-between text-[10px]"
            style={{ color: t.textFaint }}
          >
            <span>{catInfo(hovered.category).label}</span>
            <span className="flex items-center gap-1">
              <Flame size={10} style={{ color: t.accent }} />
              {hovered.candle_count}
            </span>
          </div>
          <p
            className="whisper-serif line-clamp-2 text-xs italic leading-tight"
            style={{ color: t.text }}
          >
            &ldquo;{hovered.content}&rdquo;
          </p>
        </div>
      )}

      <div
        className="whisper-mono absolute bottom-3 left-4 right-4 flex items-center justify-between text-[10px]"
        style={{ color: t.textFaint }}
      >
        <span>Constellation view · Connected by shared emotion</span>
        <span>Tap any star to open</span>
      </div>
    </div>
  );
}

export function FeedView({
  t,
  loading,
  visible,
  confessions,
  search,
  setSearch,
  activeCat,
  setActiveCat,
  sortBy,
  setSortBy,
  litIds,
  onLight,
  openReplies,
  toggleReplies,
  replyDrafts,
  setReplyDraft,
  onReply,
  now,
  onShuffle,
  goConfess,
  layout,
  setLayout,
  onOpenSpotlight,
  bookmarkedIds,
  onToggleBookmark,
}: {
  t: Theme;
  loading: boolean;
  visible: Confession[];
  confessions: Confession[];
  search: string;
  setSearch: (v: string) => void;
  activeCat: string;
  setActiveCat: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  litIds: Set<string>;
  onLight: (id: string) => void;
  openReplies: Set<string>;
  toggleReplies: (id: string) => void;
  replyDrafts: Record<string, string>;
  setReplyDraft: (id: string, v: string) => void;
  onReply: (id: string) => void;
  now: number;
  onShuffle: () => void;
  goConfess: () => void;
  layout: "list" | "sky";
  setLayout: (v: "list" | "sky") => void;
  onOpenSpotlight: (c: Confession) => void;
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string) => void;
}) {
  if (loading) {
    return (
      <div
        className="whisper-sans flex flex-col items-center justify-center py-24 text-sm"
        style={{ color: t.textDim }}
      >
        <Loader2 className="mb-3 animate-spin" size={20} />
        Lighting the candles...
      </div>
    );
  }

  const control = {
    background: t.panel,
    backdropFilter: t.blur,
    border: `1px solid ${t.border}`,
    color: t.text,
  };

  return (
    <div className="fade-in">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div
          className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-4 py-2"
          style={control}
        >
          <Search size={15} style={{ color: t.textFaint }} className="shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search whispers, names, words..."
            className="whisper-sans w-full min-w-0 bg-transparent text-sm outline-none"
            style={{ color: t.text }}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort whispers"
            className="whisper-sans min-h-11 flex-1 rounded-xl px-3 text-sm outline-none sm:flex-none"
            style={control}
          >
            <option value="new">Newest</option>
            <option value="candles">Most resonated</option>
          </select>

          {/* Random Whisper Shuffle */}
          <button
            onClick={onShuffle}
            title="Draw a random whisper from the dark"
            aria-label="Draw a random whisper from the dark"
            className="whisper-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ ...control, color: t.textDim }}
          >
            <Shuffle size={15} />
          </button>

          {/* Constellation Sky vs List Toggle */}
          <button
            onClick={() => setLayout(layout === "list" ? "sky" : "list")}
            title={layout === "list" ? "View as a constellation" : "View as a list"}
            aria-label={layout === "list" ? "View as a constellation" : "View as a list"}
            className="whisper-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              ...control,
              background: layout === "sky" ? t.accentSoft : t.panel,
              color: layout === "sky" ? t.accentText : t.textDim,
            }}
          >
            {layout === "list" ? <Star size={15} /> : <Rows3 size={15} />}
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
        {[{ key: "all", label: "All Topics" }, ...CATEGORIES].map((c) => {
          const active = activeCat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCat(c.key)}
              className="whisper-btn whisper-sans min-h-10 whitespace-nowrap rounded-full px-3 text-xs"
              style={{
                background: active ? t.accentSoft : t.panel,
                backdropFilter: t.blur,
                border: `1px solid ${active ? t.accent : t.border}`,
                color: active ? t.accentText : t.textDim,
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="py-20 text-center">
          <Flame className="flame-flicker mx-auto mb-3" size={24} style={{ color: t.accent }} />
          <p className="whisper-serif mb-3 text-xl italic" style={{ color: t.textDim }}>
            {confessions.length === 0 ? "The wall is empty." : "No whispers match this search."}
          </p>
          {confessions.length === 0 && (
            <button
              onClick={goConfess}
              className="whisper-sans text-sm underline"
              style={{ color: t.accentText }}
            >
              be the first to confess
            </button>
          )}
        </div>
      ) : layout === "sky" ? (
        <SkyView t={t} visible={visible} now={now} onOpen={onOpenSpotlight} />
      ) : (
        <div className="columns-1 gap-4 md:columns-2">
          {visible.map((c, idx) => (
            <div
              key={c.id}
              className="fade-in mb-4 break-inside-avoid"
              style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
            >
              <ConfessionCard
                t={t}
                c={c}
                lit={litIds.has(c.id)}
                onLight={() => onLight(c.id)}
                repliesOpen={openReplies.has(c.id)}
                onToggleReplies={() => toggleReplies(c.id)}
                draft={replyDrafts[c.id] || ""}
                setDraft={(v) => setReplyDraft(c.id, v)}
                onReply={() => onReply(c.id)}
                now={now}
                bookmarked={bookmarkedIds.has(c.id)}
                onToggleBookmark={() => onToggleBookmark(c.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
