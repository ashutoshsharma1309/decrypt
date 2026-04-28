import type { Hex } from "viem";
import { SEALED_BID_AUCTION_ABI, AUCTION_NFT_ABI } from "./abis";

const env = import.meta.env;

export const AUCTION_ADDRESS = (env.VITE_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as Hex;
export const NFT_ADDRESS = (env.VITE_NFT_ADDRESS || "0x0000000000000000000000000000000000000000") as Hex;
export const CHAIN_ID = Number(env.VITE_CHAIN_ID || 11155111);

export { SEALED_BID_AUCTION_ABI, AUCTION_NFT_ABI };

export const auctionContract = {
  address: AUCTION_ADDRESS,
  abi: SEALED_BID_AUCTION_ABI,
} as const;

export const nftContract = {
  address: NFT_ADDRESS,
  abi: AUCTION_NFT_ABI,
} as const;

export enum Phase {
  Inactive = 0,
  Commit = 1,
  Reveal = 2,
  Finalized = 3,
}

export const PHASE_LABEL: Record<Phase, string> = {
  [Phase.Inactive]: "INACTIVE",
  [Phase.Commit]: "COMMIT",
  [Phase.Reveal]: "REVEAL",
  [Phase.Finalized]: "FINALIZED",
};
