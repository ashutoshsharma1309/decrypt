import { Loader2 } from "lucide-react";

export function FullScreenLoader({ message = "Verifying credentials…" }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent/40 blur-2xl" />
        <Loader2 className="w-10 h-10 text-accent-glow animate-spin relative" />
      </div>
      <div className="text-sm text-muted tracking-wide">{message}</div>
    </div>
  );
}
