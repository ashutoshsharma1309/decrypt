import { useEffect, useState } from "react";
import { useWatchContractEvent, usePublicClient } from "wagmi";
import { auctionContract } from "../lib/contracts";
import { fmtEth, shortAddr } from "../lib/format";
import { Trophy, Eye } from "lucide-react";
import type { Hex } from "viem";

type RevealEntry = { bidder: Hex; amount: bigint; txHash: Hex };

export function BidLeaderboard({ auctionId }: { auctionId: bigint }) {
  const [entries, setEntries] = useState<RevealEntry[]>([]);
  const client = usePublicClient();

  // Backfill: read past BidRevealed events.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!client) return;
      try {
        const logs = await client.getContractEvents({
          ...auctionContract,
          eventName: "BidRevealed",
          args: { id: auctionId },
          fromBlock: "earliest",
          toBlock: "latest",
        });
        if (cancelled) return;
        const seen = new Set<string>();
        const list: RevealEntry[] = [];
        for (const l of logs) {
          const key = `${l.transactionHash}-${l.logIndex}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const a = l.args as any;
          if (a?.bidder && a?.amount !== undefined) {
            list.push({ bidder: a.bidder, amount: a.amount as bigint, txHash: l.transactionHash as Hex });
          }
        }
        setEntries(list);
      } catch (e) {
        // ignore — RPC may not support fromBlock=earliest with no filter
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [client, auctionId]);

  // Live updates.
  useWatchContractEvent({
    ...auctionContract,
    eventName: "BidRevealed",
    onLogs(logs) {
      setEntries((prev) => {
        const next = [...prev];
        for (const l of logs) {
          const a = l.args as any;
          if (a?.id !== auctionId) continue;
          if (next.some((e) => e.txHash === l.transactionHash)) continue;
          next.push({ bidder: a.bidder, amount: a.amount as bigint, txHash: l.transactionHash as Hex });
        }
        return next;
      });
    },
  });

  const sorted = [...entries].sort((a, b) => (b.amount > a.amount ? 1 : -1));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-6 text-muted text-sm flex flex-col items-center gap-2">
        <Eye className="w-6 h-6 opacity-50" />
        No reveals yet.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {sorted.map((e, i) => (
        <div
          key={e.txHash}
          className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
            i === 0
              ? "border-accent/40 bg-accent/10"
              : i === 1
                ? "border-cyan-500/30 bg-cyan-500/5"
                : "border-border bg-card/40"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-accent text-white" : "bg-card text-muted"}`}>
              {i === 0 ? <Trophy className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className="font-mono text-sm">{shortAddr(e.bidder)}</span>
          </div>
          <span className="font-mono font-bold tabular-nums">
            {fmtEth(e.amount)} <span className="text-xs text-muted">ETH</span>
          </span>
        </div>
      ))}
    </div>
  );
}
