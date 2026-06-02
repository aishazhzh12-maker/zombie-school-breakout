import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Coins, Clock, Loader2 } from "lucide-react";

type Row = {
  id: string;
  player_name: string;
  coins: number;
  levels_completed: number;
  time_seconds: number;
  won: boolean;
  created_at: string;
};

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function Leaderboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let alive = true;
    setRows(null); setErr("");
    supabase
      .from("leaderboard")
      .select("*")
      .order("coins", { ascending: false })
      .order("time_seconds", { ascending: true })
      .limit(20)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setErr(error.message);
        else setRows((data as Row[]) ?? []);
      });
    return () => { alive = false; };
  }, [refreshKey]);

  if (err) return <div className="text-red-400 text-sm text-center">Не удалось загрузить: {err}</div>;
  if (!rows) return <div className="flex justify-center text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (rows.length === 0) return <div className="text-center text-zinc-400 text-sm py-6">Пока нет рекордов. Стань первым!</div>;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[28px_1fr_70px_60px_70px] gap-2 text-[10px] text-zinc-400 font-pixel px-2 pb-1 border-b border-zinc-700">
        <span>#</span>
        <span>Игрок</span>
        <span className="text-right flex items-center justify-end gap-1"><Coins className="h-3 w-3" /></span>
        <span className="text-right">Этажи</span>
        <span className="text-right flex items-center justify-end gap-1"><Clock className="h-3 w-3" /></span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.id}
          className={`grid grid-cols-[28px_1fr_70px_60px_70px] gap-2 text-xs px-2 py-1.5 rounded items-center ${
            i === 0 ? "bg-amber-500/15 border border-amber-400/40" :
            i === 1 ? "bg-zinc-400/10 border border-zinc-400/30" :
            i === 2 ? "bg-orange-700/15 border border-orange-600/30" :
            "bg-black/30 border border-zinc-800"
          }`}
        >
          <span className="font-pixel text-amber-300">{i + 1}</span>
          <span className="truncate flex items-center gap-1">
            {r.won && <Trophy className="h-3 w-3 text-amber-300 shrink-0" />}
            {r.player_name}
          </span>
          <span className="text-right font-mono text-amber-200">{r.coins}</span>
          <span className="text-right font-mono">{r.levels_completed}</span>
          <span className="text-right font-mono text-zinc-300">{fmtTime(r.time_seconds)}</span>
        </div>
      ))}
    </div>
  );
}

export async function submitScore(args: {
  name: string; coins: number; levels_completed: number; time_seconds: number; won: boolean;
}) {
  const name = args.name.trim().slice(0, 24) || "Лана";
  const { error } = await supabase.from("leaderboard").insert({
    player_name: name,
    coins: Math.max(0, Math.floor(args.coins)),
    levels_completed: Math.max(0, Math.floor(args.levels_completed)),
    time_seconds: Math.max(0, Math.floor(args.time_seconds)),
    won: args.won,
  });
  if (error) throw error;
}
