import { useCountdown } from "../hooks/useCountdown";
import { fmtCountdown } from "../lib/format";
import { Timer } from "lucide-react";

export function Countdown({ deadline, label, size = "md" }: { deadline?: bigint; label?: string; size?: "sm" | "md" | "lg" }) {
  const remaining = useCountdown(deadline);
  const text = fmtCountdown(remaining);
  const cls =
    size === "lg"
      ? "text-3xl sm:text-4xl"
      : size === "sm"
        ? "text-sm"
        : "text-xl";
  const isLow = remaining > 0 && remaining < 60;
  return (
    <div className="flex flex-col items-start gap-1">
      {label && <div className="text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5"><Timer className="w-3 h-3" />{label}</div>}
      <div className={`font-mono font-bold tabular-nums tracking-tight ${cls} ${isLow ? "text-danger animate-pulse-slow" : "text-white"}`}>
        {text}
      </div>
    </div>
  );
}
