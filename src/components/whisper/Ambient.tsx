import { useEffect, useMemo, useState } from "react";
import type { Theme } from "@/lib/whisper";

type Particle = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  op: number;
};

export function Ambient({ t }: { t: Theme }) {
  const [mounted, setMounted] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 25 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setPointer({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    }
    function onTouch(e: TouchEvent) {
      const touch = e.touches[0];
      if (!touch) return;
      setPointer({
        x: (touch.clientX / window.innerWidth) * 100,
        y: (touch.clientY / window.innerHeight) * 100,
      });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 10 + Math.random() * 14,
        size: 3 + Math.random() * 5,
        op: Math.random(),
      })),
    [],
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      <div className="absolute inset-0" style={{ background: t.bgGradient }} />
      <div
        className="absolute inset-0 transition-all duration-300 ease-out"
        style={{
          background: `radial-gradient(circle 380px at ${pointer.x}% ${pointer.y}%, ${t.accent}14, transparent 70%)`,
        }}
      />
      <div className="grain-overlay absolute inset-0" style={{ opacity: 0.045 }} />
      {mounted &&
        particles.map((p) => (
          <div
            key={p.id}
            className="whisper-particle absolute rounded-full"
            style={
              {
                left: `${p.left}%`,
                bottom: -10,
                width: p.size,
                height: p.size,
                background: t.particle,
                boxShadow: `0 0 ${p.size * 2}px ${t.particle}`,
                "--op": t.particleOpacity[0] + p.op * (t.particleOpacity[1] - t.particleOpacity[0]),
                animation: `whisper-drift ${p.duration}s linear ${p.delay}s infinite`,
              } as React.CSSProperties
            }
          />
        ))}
    </div>
  );
}
