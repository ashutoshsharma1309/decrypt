import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SavedSecret = {
  auctionId: number;
  bidder: string; // checksummed address
  amount: string; // wei as string
  secret: string; // 0x...32-byte hex
  deposit: string; // wei as string
  txHash: string;
  createdAt: number;
};

type SecretsState = {
  secrets: Record<string, SavedSecret>;
  saveSecret: (s: SavedSecret) => void;
  getSecret: (auctionId: number, bidder: string) => SavedSecret | undefined;
  removeSecret: (auctionId: number, bidder: string) => void;
};

const key = (auctionId: number, bidder: string) => `${auctionId}-${bidder.toLowerCase()}`;

export const useSecretsStore = create<SecretsState>()(
  persist(
    (set, get) => ({
      secrets: {},
      saveSecret: (s) =>
        set((state) => ({
          secrets: { ...state.secrets, [key(s.auctionId, s.bidder)]: s },
        })),
      getSecret: (auctionId, bidder) => get().secrets[key(auctionId, bidder)],
      removeSecret: (auctionId, bidder) =>
        set((state) => {
          const next = { ...state.secrets };
          delete next[key(auctionId, bidder)];
          return { secrets: next };
        }),
    }),
    { name: "decrypto-secrets-v1" }
  )
);
