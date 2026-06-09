import { useReadContract } from "wagmi";
import { auctionContract, Phase } from "../lib/contracts";

export type AuctionData = {
  seller: `0x${string}`;
  nft: `0x${string}`;
  tokenId: bigint;
  commitDeadline: bigint;
  revealDeadline: bigint;
  minBid: bigint;
  minDeposit: bigint;
  highestBidder: `0x${string}`;
  highestBid: bigint;
  secondBid: bigint;
  phase: Phase;
  finalized: boolean;
};

export function useAuction(id: bigint | number | undefined) {
  const enabled = id !== undefined && id !== null;
  const { data, refetch, isLoading, isError } = useReadContract({
    ...auctionContract,
    functionName: "auctions",
    args: enabled ? [BigInt(id!)] : undefined,
    query: { enabled, refetchInterval: 20_000, staleTime: 10_000 },
  });

  const auction = data
    ? ({
        seller: data[0],
        nft: data[1],
        tokenId: data[2],
        commitDeadline: data[3],
        revealDeadline: data[4],
        minBid: data[5],
        minDeposit: data[6],
        highestBidder: data[7],
        highestBid: data[8],
        secondBid: data[9],
        phase: Number(data[10]) as Phase,
        finalized: data[11] as boolean,
      } as AuctionData)
    : undefined;

  return { auction, refetch, isLoading, isError };
}

export function useNextAuctionId() {
  return useReadContract({
    ...auctionContract,
    functionName: "nextAuctionId",
    query: { refetchInterval: 20_000, staleTime: 10_000 },
  });
}

export function useCurrentPhase(id: bigint | number | undefined) {
  const enabled = id !== undefined && id !== null;
  return useReadContract({
    ...auctionContract,
    functionName: "getCurrentPhase",
    args: enabled ? [BigInt(id!)] : undefined,
    query: { enabled, refetchInterval: 20_000, staleTime: 10_000 },
  });
}

export function useBidders(id: bigint | number | undefined) {
  const enabled = id !== undefined && id !== null;
  return useReadContract({
    ...auctionContract,
    functionName: "getBidders",
    args: enabled ? [BigInt(id!)] : undefined,
    query: { enabled, refetchInterval: 20_000, staleTime: 10_000 },
  });
}

export function useBid(id: bigint | number | undefined, bidder: `0x${string}` | undefined) {
  const enabled = id !== undefined && id !== null && !!bidder;
  const { data, refetch } = useReadContract({
    ...auctionContract,
    functionName: "bids",
    args: enabled ? [BigInt(id!), bidder!] : undefined,
    query: { enabled, refetchInterval: 20_000, staleTime: 10_000 },
  });
  const bid = data
    ? {
        sealedHash: data[0] as `0x${string}`,
        deposit: data[1] as bigint,
        revealedAmount: data[2] as bigint,
        revealed: data[3] as boolean,
        refunded: data[4] as boolean,
      }
    : undefined;
  return { bid, refetch };
}
