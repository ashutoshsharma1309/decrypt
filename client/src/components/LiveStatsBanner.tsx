import { Gavel, Activity, Coins, Users, Flame } from "lucide-react";
import { useMemo } from "react";
import { useAuctionsList } from "../hooks/useAuctionsList";
import { Phase } from "../lib/contracts";
import { AnimatedNumber } from "./AnimatedNumber";
import { fmtEth } from "../lib/format";

export function LiveStatsBanner() {
  const { rows, loading } = useAuctionsList();

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.livePhase !== Phase.Finalized).length;
    const sold = rows.filter((r) => r.finalized && r.highestBidder !== "0x0000000000000000000000000000000000000000").length;
    const volume = rows
      .filter((r) => r.finalized && r.highestBidder !== "0x0000000000000000000000000000000000000000")
      .reduce((acc, r) => acc + r.secondBid, 0n);
    const totalBidders = rows.reduce((acc, r) => acc + r.bidderCount, 0);
    return { total, active, sold, volume, totalBidders };
  }, [rows]);

  const items = [
    { label: "Active auctions", value: stats.active, icon: <Flame className="w-3.5 h-3.5" />, tone: "from-accent/30 to-transparent text-accent-glow", numeric: true },
    { label: "All auctions", value: stats.total, icon: <Gavel className="w-3.5 h-3.5" />, tone: "from-cyan-500/30 to-transparent text-cyan-300", numeric: true },
    { label: "Total bids", value: stats.totalBidders, icon: <Users className="w-3.5 h-3.5" />, tone: "from-warning/30 to-transparent text-warning", numeric: true },
    { label: "Volume settled", value: stats.volume, icon: <Coins className="w-3.5 h-3.5" />, tone: "from-success/30 to-transparent text-success", numeric: false },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {items.map((it) => (
        <div key={it.label} className={`relative glass rounded-xl p-4 overflow-hidden`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${it.tone} opacity-40 pointer-events-none`} />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted">{it.label}</div>
              <div className="text-2xl font-mono font-bold tabular-nums mt-1">
                {loading ? (
                  <span className="text-muted">—</span>
                ) : it.numeric ? (
                  <AnimatedNumber value={Number(it.value)} />
                ) : (
                  <>
                    <AnimatedNumber
                      value={Number(it.value as bigint) / 1e18}
                      format={(n) => n.toFixed(3)}
                    />
                    <span className="text-xs text-muted ml-1">ETH</span>
                  </>
                )}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center ${it.tone.split(" ").slice(-1)[0]}`}>
              {it.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
