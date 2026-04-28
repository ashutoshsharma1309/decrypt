import { formatEther, type Hex } from "viem";

export function shortAddr(addr?: string): string {
  if (!addr) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function fmtEth(wei?: bigint, decimals = 4): string {
  if (wei === undefined || wei === null) return "—";
  const s = formatEther(wei);
  const [int, frac = ""] = s.split(".");
  return decimals > 0 ? int + "." + frac.slice(0, decimals).padEnd(decimals, "0") : int;
}

export function isZeroAddr(a?: string): boolean {
  return !a || a === "0x0000000000000000000000000000000000000000";
}

/** Convert ipfs:// or generic URI to HTTPS gateway. */
export function gatewayUrl(uri: string): string {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) {
    return "https://ipfs.io/ipfs/" + uri.slice("ipfs://".length);
  }
  return uri;
}

export function fmtCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return "00:00:00";
  const h = Math.floor(secondsRemaining / 3600);
  const m = Math.floor((secondsRemaining % 3600) / 60);
  const s = secondsRemaining % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

export function bigintMax(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function asHex(s: string): Hex {
  return s.toLowerCase().startsWith("0x") ? (s as Hex) : (`0x${s}` as Hex);
}
