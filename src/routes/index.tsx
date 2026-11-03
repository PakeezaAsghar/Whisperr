import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Moon, Sun } from "lucide-react";
import {
  DAY_MS,
  THEMES,
  initialMode,
  isAlive,
  isSealed,
  type Confession,
  type Mode,
} from "@/lib/whisper";
import {
  addReplyRpc,
  createConfession,
  fetchConfessions,
  getLitIds,
  lightCandleRpc,
  saveLitIds,
  getBookmarkedIds,
  toggleBookmarkId,
} from "@/lib/whisper-data";
import { Ambient } from "@/components/whisper/Ambient";
import { ConfessView, type ConfessDraft } from "@/components/whisper/ConfessView";
import { FeedView } from "@/components/whisper/FeedView";
import { SpotlightModal } from "@/components/whisper/SpotlightModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Whisper — an anonymous confession wall" },
      {
        name: "description",
        content:
          "Say what you've been holding onto. Whisper is an anonymous confession wall — no accounts, no names. Light a candle for someone else's words.",
      },
      { property: "og:title", content: "Whisper — an anonymous confession wall" },
      {
        property: "og:description",
        content:
          "Anonymous confessions, candlelit. Post without an account, light a candle, reply quietly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WhisperApp,
});

function WhisperApp() {
  const [mode, setMode] = useState<Mode>("night");
  const t = THEMES[mode];

  const [view, setView] = useState<"confess" | "feed">("feed");
  const [loading, setLoading] = useState(true);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [litIds, setLitIds] = useState<Set<string>>(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState("");
  const [kindred, setKindred] = useState<Confession | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [sortBy, setSortBy] = useState("new");
  const [openReplies, setOpenReplies] = useState<Set<string>>(new Set());
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [spotlight, setSpotlight] = useState<Confession | null>(null);
  const [layout, setLayout] = useState<"list" | "sky">("list");

  useEffect(() => {
    setMode(initialMode());
    setLitIds(getLitIds());
    setBookmarkedIds(getBookmarkedIds());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchConfessions();
      setConfessions(data);
    } catch {
      setErrorMsg("The wall could not be reached right now.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(draft: ConfessDraft) {
    if (submitting) return false;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const created = await createConfession({
        category: draft.category,
        to_whom: draft.to.trim().slice(0, 60) || null,
        mood: draft.mood || null,
        content: draft.text.trim().slice(0, 1000),
        expires_at:
          draft.lifespan === "fading" ? new Date(Date.now() + DAY_MS).toISOString() : null,
        seal_until:
          draft.lifespan === "sealed"
            ? new Date(Date.now() + draft.sealDays * DAY_MS).toISOString()
            : null,
      });
      setConfessions((prev) => [created, ...prev]);
      setToast("Your whisper drifted onto the wall.");
      setTimeout(() => setToast(""), 4000);

      const pool = confessions.filter(
        (c) =>
          c.mood && c.mood === draft.mood && isAlive(c, Date.now()) && !isSealed(c, Date.now()),
      );
      setKindred(pool.length ? pool[Math.floor(Math.random() * pool.length)] : null);
      setSubmitting(false);
      return true;
    } catch {
      setErrorMsg("Your whisper could not be sent. Please try again.");
      setSubmitting(false);
      return false;
    }
  }

  const lightCandle = useCallback(
    async (id: string) => {
      if (litIds.has(id)) return;
      const nextLit = new Set(litIds);
      nextLit.add(id);
      setLitIds(nextLit);
      saveLitIds(nextLit);
      setConfessions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, candle_count: c.candle_count + 1 } : c)),
      );
      try {
        const count = await lightCandleRpc(id);
        setConfessions((prev) =>
          prev.map((c) => (c.id === id ? { ...c, candle_count: count } : c)),
        );
        setSpotlight((s) => (s && s.id === id ? { ...s, candle_count: count } : s));
      } catch {
        setErrorMsg("The candle would not stay lit. Try again.");
      }
    },
    [litIds],
  );

  function handleToggleBookmark(id: string) {
    const updated = toggleBookmarkId(id);
    setBookmarkedIds(updated);
  }

  async function addReply(id: string) {
    const draft = (replyDrafts[id] || "").trim();
    if (!draft) return;
    setReplyDrafts((d) => ({ ...d, [id]: "" }));
    try {
      const replies = await addReplyRpc(id, draft);
      setConfessions((prev) => prev.map((c) => (c.id === id ? { ...c, replies } : c)));
    } catch {
      setErrorMsg("Your reply could not be sent.");
    }
  }

  function toggleReplies(id: string) {
    setOpenReplies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visible = useMemo(() => {
    let list = confessions.filter((c) => isAlive(c, now));
    if (activeCat !== "all") list = list.filter((c) => c.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          !isSealed(c, now) &&
          (c.content.toLowerCase().includes(q) || (c.to_whom || "").toLowerCase().includes(q)),
      );
    }
    return [...list].sort((a, b) =>
      sortBy === "new"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : b.candle_count - a.candle_count,
    );
  }, [confessions, activeCat, search, sortBy, now]);

  function randomWhisper() {
    const pool = confessions.filter((c) => isAlive(c, now) && !isSealed(c, now));
    if (!pool.length) return;
    setSpotlight(pool[Math.floor(Math.random() * pool.length)]);
  }

  return (
    <div
      className="whisper-sans relative min-h-screen w-full overflow-x-hidden transition-colors duration-500"
      style={{ background: t.bg, color: t.text }}
    >
      <Ambient t={t} />

      <div
        className="relative mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-5 sm:pt-10"
        style={{ zIndex: 1 }}
      >
        <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flame-flicker relative flex shrink-0 items-center justify-center rounded-full"
              style={{
                width: "clamp(38px, 11vw, 50px)",
                height: "clamp(38px, 11vw, 50px)",
                background: `radial-gradient(circle, ${t.accent}55, transparent 70%)`,
                border: `1.5px solid ${t.accent}`,
                boxShadow: `0 0 16px -2px ${t.accent}99`,
              }}
            >
              <Flame
                size={22}
                style={{
                  color: t.accent,
                  filter: `drop-shadow(0 0 5px ${t.accent}aa)`,
                }}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1 leading-none">
              <span
                className="whisper-serif truncate italic"
                style={{
                  fontSize: "clamp(1.7rem, 7.5vw, 2.4rem)",
                  fontWeight: 700,
                  letterSpacing: "0.01em",
                  color: t.wordmark,
                  textShadow: mode === "night" ? `0 0 18px ${t.accent}55` : "none",
                }}
              >
                Whisper
              </span>
              <span
                className="block"
                style={{
                  height: 2,
                  width: "85%",
                  borderRadius: 9999,
                  background: `linear-gradient(90deg, ${t.accent}, transparent)`,
                  boxShadow: `0 0 10px 1px ${t.accent}88`,
                }}
              />
              <span
                className="whisper-mono hidden truncate text-[8px] uppercase tracking-[0.25em] sm:block"
                style={{ color: t.textFaint }}
              >
                anonymous &amp; unheard
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <nav
              className="flex items-center gap-1 rounded-full p-1"
              style={{
                background: t.panel,
                backdropFilter: t.blur,
                border: `1px solid ${t.border}`,
              }}
            >
              {(["confess", "feed"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="whisper-btn rounded-full px-3 py-1.5 text-xs sm:px-4 sm:text-sm"
                  style={{
                    background: view === v ? t.accent : "transparent",
                    color: view === v ? t.ink : t.textDim,
                  }}
                >
                  {v === "confess" ? "Confess" : "Feed"}
                </button>
              ))}
            </nav>

            {/* Day / Night Theme Toggle */}
            <button
              onClick={() => setMode(mode === "night" ? "day" : "night")}
              title={mode === "night" ? "Switch to daylight" : "Switch to candlelight"}
              aria-label={mode === "night" ? "Switch to daylight" : "Switch to candlelight"}
              className="whisper-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                background: t.panel,
                backdropFilter: t.blur,
                border: `1px solid ${t.border}`,
                color: t.textDim,
              }}
            >
              {mode === "night" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </header>

        {errorMsg && (
          <div
            className="fade-in mb-6 rounded-xl px-4 py-3 text-sm"
            style={{
              background: t.dangerBg,
              border: `1px solid ${t.dangerBorder}`,
              color: t.danger,
            }}
          >
            {errorMsg}
          </div>
        )}

        {view === "confess" ? (
          <ConfessView
            t={t}
            mode={mode}
            submitting={submitting}
            onSubmit={handleSubmit}
            toast={toast}
            kindred={kindred}
            goFeed={() => setView("feed")}
          />
        ) : (
          <FeedView
            t={t}
            loading={loading}
            visible={visible}
            confessions={confessions}
            search={search}
            setSearch={setSearch}
            activeCat={activeCat}
            setActiveCat={setActiveCat}
            sortBy={sortBy}
            setSortBy={setSortBy}
            litIds={litIds}
            onLight={lightCandle}
            openReplies={openReplies}
            toggleReplies={toggleReplies}
            replyDrafts={replyDrafts}
            setReplyDraft={(id, v) => setReplyDrafts((d) => ({ ...d, [id]: v }))}
            onReply={addReply}
            now={now}
            onShuffle={randomWhisper}
            goConfess={() => setView("confess")}
            layout={layout}
            setLayout={setLayout}
            onOpenSpotlight={setSpotlight}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
          />
        )}
      </div>

      {spotlight && (
        <SpotlightModal
          t={t}
          confession={spotlight}
          onClose={() => setSpotlight(null)}
          lit={litIds.has(spotlight.id)}
          onLight={() => lightCandle(spotlight.id)}
          now={now}
          bookmarked={bookmarkedIds.has(spotlight.id)}
          onToggleBookmark={() => handleToggleBookmark(spotlight.id)}
        />
      )}
    </div>
  );
}
