import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { nftContract, NFT_ADDRESS } from "../lib/contracts";
import { gatewayUrl } from "../lib/format";
import { erc721Abi, type Hex } from "viem";

export type NftMetadata = {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
};

/**
 * Reads tokenURI from any ERC721 (defaults to deployed NFT contract) and fetches metadata.
 * Robust against IPFS gateway failures and broken JSON.
 */
export function useNftMetadata(nftAddr: Hex | undefined, tokenId: bigint | undefined) {
  const addr = nftAddr || NFT_ADDRESS;
  const isDefault = !nftAddr || nftAddr.toLowerCase() === NFT_ADDRESS.toLowerCase();
  const enabled = tokenId !== undefined && !!addr;

  const { data: tokenUri } = useReadContract({
    address: addr,
    abi: isDefault ? nftContract.abi : erc721Abi,
    functionName: "tokenURI",
    args: enabled ? [tokenId!] : undefined,
    query: { enabled, staleTime: 5 * 60_000, gcTime: 10 * 60_000 },
  });

  const [metadata, setMetadata] = useState<NftMetadata | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tokenUri || typeof tokenUri !== "string") return;
    let cancelled = false;
    setLoading(true);

    // Data URIs are cheap (no network). External fetches get a 4s timeout so
    // dead IPFS gateways don't block the UI.
    const url = gatewayUrl(tokenUri);
    const isDataUri = url.startsWith("data:");
    const ctrl = isDataUri ? null : new AbortController();
    const timeout = isDataUri ? 0 : window.setTimeout(() => ctrl?.abort(), 4000);

    fetch(url, { signal: ctrl?.signal })
      .then((r) => r.json())
      .then((j: NftMetadata) => {
        if (cancelled) return;
        setMetadata(j);
        if (j?.image) setImageUrl(gatewayUrl(j.image));
      })
      .catch(() => {
        // IPFS fetch failed / timed out — leave undefined; UI uses procedural fallback.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
        if (timeout) window.clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      ctrl?.abort();
      if (timeout) window.clearTimeout(timeout);
    };
  }, [tokenUri]);

  return { tokenUri: tokenUri as string | undefined, metadata, imageUrl, loading };
}
