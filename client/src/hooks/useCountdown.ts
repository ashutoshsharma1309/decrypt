import { useEffect, useState } from "react";

export function useCountdown(deadline: bigint | undefined): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  if (!deadline) return 0;
  return Math.max(0, Number(deadline) - now);
}
