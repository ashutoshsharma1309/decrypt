import { useQuery } from "@tanstack/react-query";
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

/**
 * Single shared query for the entire auctions list. Multiple callers
 * (Auctions page, LiveStatsBanner, FeaturedAuction) all dedupe via React Query's cache.
 */
export function useAuctionsList() {
  const client = usePublicClient();

  const q = useQuery({
    queryKey: ["auctions-list", client?.chain?.id ?? 0],
    enabled: !!client,
    refetchInterval: 20_000,
    staleTime: 10_000,
    queryFn: async (): Promise<AuctionRow[]> => {
      if (!client) return [];
      const next = (await client.readContract({
        ...auctionContract,
        functionName: "nextAuctionId",
      })) as bigint;
      const total = Number(next);
      if (!total) return [];

      const ids = Array.from({ length: total }, (_, i) => BigInt(i));

      // Batch all reads via multicall when possible — one RPC roundtrip instead of 3N.
      const calls = ids.flatMap((id) => [
        { ...auctionContract, functionName: "auctions", args: [id] },
        { ...auctionContract, functionName: "getCurrentPhase", args: [id] },
        { ...auctionContract, functionName: "biddersCount", args: [id] },
      ]);

      let results: any[];
      try {
        const mc = await client.multicall({
          contracts: calls as any,
          allowFailure: false,
        });
        results = [...(mc as readonly any[])];
      } catch {
        // Fallback if the chain has no Multicall3 — sequential reads.
        results = [];
        for (const c of calls) {
          results.push(await client.readContract(c as any));
        }
      }

      const list: AuctionRow[] = [];
      for (let i = 0; i < total; i++) {
        const a = results[i * 3] as any;
        const live = results[i * 3 + 1];
        const count = results[i * 3 + 2] as bigint;
        list.push({
          id: ids[i],
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
          livePhase: Number(live) as Phase,
          bidderCount: Number(count),
        });
      }
      return list;
    },
  });

  return {
    rows: q.data ?? [],
    loading: q.isLoading,
    refetch: () => q.refetch(),
  };
}
