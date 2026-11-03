import { useState } from "react";
import { Flame, Loader2, Send, Sparkles, FlameKindling, RefreshCw } from "lucide-react";
import { CATEGORIES, MOODS, THEMES, type Mode, type Theme, type Confession } from "@/lib/whisper";
import { soundEngine } from "@/lib/sound-engine";

type Lifespan = "open" | "fading" | "sealed";

export type ConfessDraft = {
  category: string;
  to: string;
  mood: string;
  text: string;
  lifespan: Lifespan;
  sealDays: number;
};

const PROMPT_SPARKS = [
  "What did you want to say right before the elevator doors closed?",
  "A promise you made to yourself that you haven't kept yet.",
  "The secret kindness you did that nobody on earth knows about.",
  "Someone you forgive in your heart, even though they never said sorry.",
  "What you really think about when staring out the train window late at night.",
  "The truth about why you left without looking back.",
  "Something you wish your younger self knew during that hard year.",
  "The words you typed into a message box, then erased and never sent.",
];

export function ConfessView({
  t,
  mode,
  submitting,
  onSubmit,
  toast,
  kindred,
  goFeed,
}: {
  t: Theme;
  mode: Mode;
  submitting: boolean;
  onSubmit: (draft: ConfessDraft) => Promise<boolean>;
  toast: string;
  kindred: Confession | null;
  goFeed: () => void;
}) {
  const [category, setCategory] = useState("other");
  const [to, setTo] = useState("");
  const [mood, setMood] = useState("");
  const [text, setText] = useState("");
  const [lifespan, setLifespan] = useState<Lifespan>("open");
  const [sealDays, setSealDays] = useState(3);

  // Interactive Burning Secret state
  const [isBurning, setIsBurning] = useState(false);
  const [burnedNote, setBurnedNote] = useState<string | null>(null);

  // Interactive Prompt spark
  const [promptIndex, setPromptIndex] = useState<number | null>(null);

  const label = "mb-2 block text-[10px] uppercase tracking-wider whisper-sans";
  const activeMood = MOODS.find((m) => m.key === mood);

  const panelStyle = {
    background: t.panel,
    backdropFilter: t.blur,
    border: `1px solid ${activeMood ? `${activeMood.color}44` : t.border}`,
    color: t.text,
    boxShadow: activeMood ? `0 0 24px -10px ${activeMood.color}33` : undefined,
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || submitting || isBurning) return;
    const ok = await onSubmit({ category, to, mood, text, lifespan, sealDays });
    if (ok) {
      soundEngine.playCandleChime();
      setText("");
      setTo("");
      setCategory("other");
      setMood("");
      setLifespan("open");
      setSealDays(3);
      setBurnedNote(null);
    }
  }

  function handleBurnSecret() {
    if (!text.trim() || isBurning) return;
    setIsBurning(true);
    soundEngine.playBurnSwoosh();
    setTimeout(() => {
      setIsBurning(false);
      setText("");
      setTo("");
      setBurnedNote(
        "Your words burned into ash and drifted away. You do not have to carry them anymore.",
      );
    }, 1500);
  }

  function cyclePrompt() {
    setPromptIndex((prev) => (prev === null ? 0 : (prev + 1) % PROMPT_SPARKS.length));
  }

  return (
    <div className="fade-in">
      <h1
        className="whisper-serif mb-4 leading-[1.02]"
        style={{ fontSize: "clamp(2.6rem, 11vw, 3.6rem)" }}
      >
        <span
          className="headline-in block"
          style={{
            color: t.text,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            animationDelay: "0ms",
          }}
        >
          Say what you&apos;ve been
        </span>
        <span
          className="shimmer-text headline-in relative block italic"
          style={{
            backgroundImage: `linear-gradient(90deg, ${t.accent}, ${mode === "night" ? "#FFFFFF" : "#5A3A12"}, ${t.accent})`,
            filter: `drop-shadow(0 0 22px ${t.accent}55)`,
            animationDelay: "160ms",
          }}
        >
          holding onto.
        </span>
      </h1>
      <div className="ornament mb-4 text-xs font-bold" style={{ color: t.accent }}>
        · · ✦ · ·
      </div>
      <p className="whisper-sans mb-6 text-sm" style={{ color: t.textDim }}>
        No sign-up, no name. Just an empty page and your thoughts.
      </p>

      {/* Interactive Writing Prompt Generator */}
      <div
        className="mb-6 rounded-2xl p-4 transition-all"
        style={{
          background: t.panelAlt,
          backdropFilter: t.blur,
          border: `1px solid ${t.border}`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: t.accent }} />
            <span
              className="whisper-sans text-xs uppercase tracking-wider"
              style={{ color: t.textDim }}
            >
              {promptIndex !== null ? "Writing Prompt" : "Looking for inspiration?"}
            </span>
          </div>
          <button
            type="button"
            onClick={cyclePrompt}
            className="whisper-btn whisper-sans flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
            style={{
              background: t.panel,
              border: `1px solid ${t.border}`,
              color: t.accentText,
            }}
          >
            <RefreshCw
              size={12}
              className={promptIndex !== null ? "rotate-180 transition-transform duration-300" : ""}
            />
            <span>{promptIndex === null ? "Give me a spark" : "Next prompt"}</span>
          </button>
        </div>

        {promptIndex !== null && (
          <div className="fade-in mt-3">
            <p className="whisper-serif text-base italic" style={{ color: t.text }}>
              &ldquo;{PROMPT_SPARKS[promptIndex]}&rdquo;
            </p>
          </div>
        )}
      </div>

      {burnedNote && (
        <div
          className="fade-in mb-6 rounded-2xl p-5 text-center"
          style={{
            background: "rgba(220, 120, 50, 0.08)",
            border: "1px dashed rgba(220, 120, 50, 0.35)",
            color: t.accent,
          }}
        >
          <FlameKindling size={24} className="flame-flicker mx-auto mb-2" />
          <p className="whisper-serif text-lg italic leading-relaxed">{burnedNote}</p>
          <button
            onClick={() => setBurnedNote(null)}
            className="whisper-mono mt-3 text-xs underline opacity-80"
          >
            Write another
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <span className={label} style={{ color: t.textDim }}>
            What is it about?
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.key;
              return (
                <button
                  type="button"
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className="whisper-btn whisper-sans flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs"
                  style={{
                    background: active ? t.accentSoft : t.panel,
                    backdropFilter: t.blur,
                    border: `1px solid ${active ? t.accent : t.border}`,
                    color: active ? t.accentText : t.textDim,
                  }}
                >
                  <Icon size={13} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className={label} style={{ color: t.textDim }}>
            How does it feel? (optional)
          </span>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const active = mood === m.key;
              return (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setMood(active ? "" : m.key)}
                  className="whisper-btn whisper-sans flex min-h-9 items-center gap-2 rounded-full px-3 text-xs"
                  style={{
                    background: active ? `${m.color}22` : "transparent",
                    border: `1px solid ${active ? m.color : t.border}`,
                    color: active ? m.color : t.textDim,
                  }}
                >
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 7, height: 7, background: m.color }}
                  />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={label} style={{ color: t.textDim }} htmlFor="to-field">
            To (optional)
          </label>
          <input
            id="to-field"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            maxLength={60}
            placeholder="No one — just the page"
            className="whisper-sans min-h-11 w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-all"
            style={panelStyle}
          />
        </div>

        <div className={isBurning ? "burning-card" : ""}>
          <label className={label} style={{ color: t.textDim }} htmlFor="confession-field">
            Your whisper
          </label>
          <textarea
            id="confession-field"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 1000))}
            rows={6}
            placeholder="Whisper it here..."
            className="whisper-serif w-full resize-y rounded-xl px-4 py-3 text-lg leading-relaxed outline-none transition-all"
            style={panelStyle}
          />
          <div className="whisper-mono mt-1 text-right text-xs" style={{ color: t.textFaint }}>
            {text.length}/1000
          </div>
        </div>

        <div>
          <span className={label} style={{ color: t.textDim }}>
            How long should it live?
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                { key: "open", label: "Open", hint: "stays on the wall" },
                { key: "fading", label: "Fading", hint: "fades after a day" },
                { key: "sealed", label: "Sealed", hint: "a time capsule" },
              ] as const
            ).map((opt) => {
              const active = lifespan === opt.key;
              return (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => setLifespan(opt.key)}
                  className="whisper-btn whisper-sans min-h-11 rounded-xl px-3 py-2 text-left"
                  style={{
                    background: active ? t.accentSoft : t.panel,
                    backdropFilter: t.blur,
                    border: `1px solid ${active ? t.accent : t.border}`,
                  }}
                >
                  <div className="text-sm" style={{ color: active ? t.accentText : t.text }}>
                    {opt.label}
                  </div>
                  <div className="mt-0.5 text-[10px]" style={{ color: t.textFaint }}>
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
          {lifespan === "sealed" && (
            <div className="fade-in mt-3 flex flex-wrap items-center gap-2">
              <span className="whisper-sans text-xs" style={{ color: t.textDim }}>
                Unlock in
              </span>
              {[1, 3, 7, 30].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setSealDays(d)}
                  className="whisper-btn whisper-mono rounded-full px-3 py-2 text-xs"
                  style={{
                    background: sealDays === d ? t.accentSoft : "transparent",
                    border: `1px solid ${sealDays === d ? t.accent : t.border}`,
                    color: sealDays === d ? t.accentText : t.textDim,
                  }}
                >
                  {d} day{d > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={!text.trim() || submitting || isBurning}
            className="whisper-btn whisper-sans flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium"
            style={{
              background: t.accent,
              color: THEMES[mode].ink,
              opacity: !text.trim() || submitting || isBurning ? 0.5 : 1,
              boxShadow: `0 0 26px -10px ${t.accent}`,
            }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Whisper to Wall
          </button>

          {/* Interactive Burn Secret feature */}
          <button
            type="button"
            onClick={handleBurnSecret}
            disabled={!text.trim() || isBurning}
            title="Burn without posting to the wall"
            className="whisper-btn whisper-sans flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm"
            style={{
              background: t.panel,
              backdropFilter: t.blur,
              border: `1px solid ${t.border}`,
              color: t.accent,
              opacity: !text.trim() || isBurning ? 0.5 : 1,
            }}
          >
            <FlameKindling size={16} className={isBurning ? "flame-flicker" : ""} />
            <span>{isBurning ? "Burning..." : "Burn into Ashes"}</span>
          </button>
        </div>

        {toast && (
          <div
            className="whisper-serif fade-in text-center text-sm italic"
            style={{ color: t.accentText }}
          >
            {toast}
          </div>
        )}
      </form>

      {kindred && (
        <div
          className="fade-in mt-8 rounded-2xl p-5"
          style={{
            background: t.panelAlt,
            backdropFilter: t.blur,
            border: `1px solid ${t.borderStrong}`,
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <Flame size={14} className="flame-flicker" style={{ color: t.accent }} />
            <span
              className="whisper-sans text-xs uppercase tracking-wider"
              style={{ color: t.accentText }}
            >
              A kindred whisper
            </span>
          </div>
          <p className="whisper-serif text-lg italic leading-relaxed" style={{ color: t.text }}>
            {kindred.content}
          </p>
          <p className="whisper-sans mt-3 text-xs" style={{ color: t.textDim }}>
            Someone else out there felt this too.
          </p>
        </div>
      )}

      <div className="whisper-mono mt-10 flex items-center justify-center text-xs">
        <button onClick={goFeed} className="min-h-11 underline" style={{ color: t.textDim }}>
          read the wall
        </button>
      </div>
    </div>
  );
}
