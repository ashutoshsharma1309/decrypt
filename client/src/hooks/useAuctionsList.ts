import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { auctionContract, Phase } from "../lib/contracts";
import type { Hex } from "viem";

export type AuctionRow = {
  id: bigint;
  seller: Hex;
  nft: Hex;
  tokenId: bigint;
  commitDeadline: bigint;
  revealDeadline: bigint;
  minBid: bigint;
  minDeposit: bigint;
  highestBidder: Hex;
  highestBid: bigint;
  secondBid: bigint;
  phase: Phase;
  finalized: boolean;
  livePhase: Phase;
  bidderCount: number;
};

/** Reads all auctions [0..nextAuctionId-1] in parallel + each one's getCurrentPhase + biddersCount. */
export function useAuctionsList() {
  const client = usePublicClient();
  const [rows, setRows] = useState<AuctionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    if (!client) return;
    setLoading(true);

    async function load() {
      try {
        const next = (await client!.readContract({
          ...auctionContract,
          functionName: "nextAuctionId",
        })) as bigint;
        const total = Number(next);
        if (!total) {
          if (!cancelled) setRows([]);
          return;
        }
        const ids = Array.from({ length: total }, (_, i) => BigInt(i));
        const auctions = await Promise.all(
          ids.map((id) =>
            client!.readContract({
              ...auctionContract,
              functionName: "auctions",
              args: [id],
            })
          )
        );
        const livePhases = await Promise.all(
          ids.map((id) =>
            client!.readContract({
              ...auctionContract,
              functionName: "getCurrentPhase",
              args: [id],
            })
          )
        );
        const counts = await Promise.all(
          ids.map((id) =>
            client!.readContract({
              ...auctionContract,
              functionName: "biddersCount",
              args: [id],
            })
          )
        );
        if (cancelled) return;
        const list: AuctionRow[] = ids.map((id, i) => {
          const a = auctions[i] as any;
          return {
            id,
            seller: a[0],
            nft: a[1],
            tokenId: a[2],
            commitDeadline: a[3],
            revealDeadline: a[4],
            minBid: a[5],
            minDeposit: a[6],
            highestBidder: a[7],
            highestBid: a[8],
            secondBid: a[9],
            phase: Number(a[10]) as Phase,
            finalized: a[11] as boolean,
            livePhase: Number(livePhases[i]) as Phase,
            bidderCount: Number(counts[i] as bigint),
          };
        });
        setRows(list);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [client, refreshKey]);

  return { rows, loading, refetch };
}
