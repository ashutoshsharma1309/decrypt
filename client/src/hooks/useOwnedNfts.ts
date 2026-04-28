import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { erc721Abi, type Hex } from "viem";
import { NFT_ADDRESS, AUCTION_NFT_ABI } from "../lib/contracts";

export type OwnedNft = { tokenId: bigint; tokenURI?: string };

/**
 * Iterate tokenIds [0..totalMinted) and check ownerOf(i) === owner. Avoids
 * event-log scans which can fail on rate-limited RPCs.
 */
export function useOwnedNfts(owner?: Hex, nft?: Hex) {
  const client = usePublicClient();
  const nftAddr = nft || NFT_ADDRESS;
  const [items, setItems] = useState<OwnedNft[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!owner || !client || !nftAddr) {
      setItems([]);
      return;
    }
    setLoading(true);

    async function load() {
      try {
        // Use totalMinted() if available on our AuctionNFT, fall back to scanning a small range.
        let total = 0n;
        try {
          total = (await client!.readContract({
            address: nftAddr,
            abi: AUCTION_NFT_ABI,
            functionName: "totalMinted",
          })) as bigint;
        } catch {
          total = 100n; // generic fallback
        }

        const verified: OwnedNft[] = [];
        const ids = Array.from({ length: Number(total) }, (_, i) => BigInt(i));
        const owners = await Promise.all(
          ids.map((id) =>
            client!
              .readContract({
                address: nftAddr,
                abi: erc721Abi,
                functionName: "ownerOf",
                args: [id],
              })
              .catch(() => undefined)
          )
        );
        for (let i = 0; i < ids.length; i++) {
          const cur = owners[i] as string | undefined;
          if (cur && cur.toLowerCase() === (owner as string).toLowerCase()) {
            verified.push({ tokenId: ids[i] });
          }
        }
        if (!cancelled) setItems(verified);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [owner, client, nftAddr]);

  return { items, loading };
}

/** All-time minted NFTs — iterate [0..totalMinted) on the AuctionNFT contract. */
export function useAllMintedNfts(nft?: Hex) {
  const client = usePublicClient();
  const nftAddr = nft || NFT_ADDRESS;
  const [items, setItems] = useState<{ tokenId: bigint; to: Hex }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!client || !nftAddr) return;
    setLoading(true);
    async function load() {
      try {
        let total = 0n;
        try {
          total = (await client!.readContract({
            address: nftAddr,
            abi: AUCTION_NFT_ABI,
            functionName: "totalMinted",
          })) as bigint;
        } catch {
          total = 0n;
        }
        const ids = Array.from({ length: Number(total) }, (_, i) => BigInt(i));
        // Newest first
        ids.reverse();
        const owners = await Promise.all(
          ids.map((id) =>
            client!
              .readContract({
                address: nftAddr,
                abi: erc721Abi,
                functionName: "ownerOf",
                args: [id],
              })
              .catch(() => undefined)
          )
        );
        const list: { tokenId: bigint; to: Hex }[] = [];
        for (let i = 0; i < ids.length; i++) {
          const o = owners[i] as Hex | undefined;
          if (o) list.push({ tokenId: ids[i], to: o });
        }
        if (!cancelled) setItems(list);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [client, nftAddr]);

  return { items, loading };
}
