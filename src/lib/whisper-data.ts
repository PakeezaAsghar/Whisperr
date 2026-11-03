import { supabase } from "@/integrations/supabase/client";
import type { Confession, Reply } from "./whisper";

const DEVICE_KEY = "whisper-device-id";
const LIT_KEY = "whisper-lit";
const BOOKMARKS_KEY = "whisper-bookmarks";
const REACTIONS_KEY = "whisper-reactions";
const CACHED_CONFESSIONS_KEY = "whisper-cached-confessions";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server0000";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getLitIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(LIT_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function saveLitIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIT_KEY, JSON.stringify([...ids]));
}

export function getBookmarkedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function toggleBookmarkId(id: string): Set<string> {
  const current = getBookmarkedIds();
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...current]));
  }
  return new Set(current);
}

export function getAllReactions(): Record<string, Record<string, number>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(REACTIONS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function addLocalReaction(confessionId: string, emojiKey: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  const all = getAllReactions();
  const cardReactions = all[confessionId] || {};
  cardReactions[emojiKey] = (cardReactions[emojiKey] || 0) + 1;
  all[confessionId] = cardReactions;
  localStorage.setItem(REACTIONS_KEY, JSON.stringify(all));
  return { ...cardReactions };
}

function normalize(row: Record<string, unknown>): Confession {
  return {
    ...(row as unknown as Confession),
    replies: Array.isArray(row.replies) ? (row.replies as Reply[]) : [],
  };
}

export async function fetchConfessions(): Promise<Confession[]> {
  try {
    const { data, error } = await supabase
      .from("confessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    const normalized = (data || []).map(normalize);
    if (typeof window !== "undefined" && normalized.length > 0) {
      localStorage.setItem(CACHED_CONFESSIONS_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (err) {
    console.warn("Using cached confessions fallback", err);
    if (typeof window !== "undefined") {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHED_CONFESSIONS_KEY) || "[]");
        if (cached.length > 0) return cached;
      } catch {
        // fallback
      }
    }
    throw err;
  }
}

export async function createConfession(input: {
  category: string;
  to_whom: string | null;
  mood: string | null;
  content: string;
  expires_at: string | null;
  seal_until: string | null;
}): Promise<Confession> {
  const { data, error } = await supabase.from("confessions").insert(input).select().single();
  if (error) throw error;
  return normalize(data);
}

export async function lightCandleRpc(confessionId: string): Promise<number> {
  const { data, error } = await supabase.rpc("light_candle", {
    _confession_id: confessionId,
    _device_id: getDeviceId(),
  });
  if (error) throw error;
  return data as number;
}

export async function addReplyRpc(confessionId: string, text: string): Promise<Reply[]> {
  const { data, error } = await supabase.rpc("add_reply", {
    _confession_id: confessionId,
    _text: text,
  });
  if (error) throw error;
  return (data as Reply[]) || [];
}
