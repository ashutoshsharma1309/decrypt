import { Phase } from "../lib/contracts";
import { Lock, Eye, CheckCircle2, CircleDashed } from "lucide-react";

const META: Record<Phase, { label: string; classes: string; icon: any }> = {
  [Phase.Inactive]: {
    label: "INACTIVE",
    classes: "border-border bg-card text-muted",
    icon: CircleDashed,
  },
  [Phase.Commit]: {
    label: "COMMIT",
    classes: "border-accent/40 bg-accent/15 text-accent-glow shadow-[0_0_20px_-6px] shadow-accent/40",
    icon: Lock,
  },
  [Phase.Reveal]: {
    label: "REVEAL",
    classes: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_-6px] shadow-cyan-500/40",
    icon: Eye,
  },
  [Phase.Finalized]: {
    label: "FINALIZED",
    classes: "border-success/40 bg-success/10 text-success",
    icon: CheckCircle2,
  },
};

export function PhaseBadge({ phase, size = "md" }: { phase: Phase; size?: "sm" | "md" | "lg" }) {
  const { label, classes, icon: Icon } = META[phase] ?? META[Phase.Inactive];
  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : size === "lg" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";
  const ic = size === "sm" ? "w-3 h-3" : size === "lg" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wider ${classes} ${px}`}>
      <Icon className={`${ic} ${phase === Phase.Commit || phase === Phase.Reveal ? "animate-pulse-slow" : ""}`} />
      {label}
    </span>
  );
}
