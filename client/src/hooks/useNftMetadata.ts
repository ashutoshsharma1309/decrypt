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
    query: { enabled, staleTime: 60_000 },
  });

  const [metadata, setMetadata] = useState<NftMetadata | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tokenUri || typeof tokenUri !== "string") return;
    let cancelled = false;
    setLoading(true);
    const url = gatewayUrl(tokenUri);
    fetch(url)
      .then((r) => r.json())
      .then((j: NftMetadata) => {
        if (cancelled) return;
        setMetadata(j);
        if (j?.image) setImageUrl(gatewayUrl(j.image));
      })
      .catch(() => {
        // IPFS fetch failed (likely placeholder URI) — leave undefined.
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tokenUri]);

  return { tokenUri: tokenUri as string | undefined, metadata, imageUrl, loading };
}
