import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
  tint = "accent",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tint?: "accent" | "cyan" | "green" | "amber";
  hint?: string;
}) {
  const tints = {
    accent: { border: "border-accent/30", chip: "bg-accent/15 text-accent-glow" },
    cyan: { border: "border-cyan-500/30", chip: "bg-cyan-500/15 text-cyan-300" },
    green: { border: "border-success/30", chip: "bg-success/15 text-success" },
    amber: { border: "border-warning/30", chip: "bg-warning/15 text-warning" },
  } as const;
  const s = tints[tint];

  return (
    <div className={`glass rounded-2xl p-5 ${s.border}`}>
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.chip}`}>{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-mono font-bold tabular-nums tracking-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted mt-1.5">{hint}</div>}
    </div>
  );
}
