import { Image as ImageIcon } from "lucide-react";
import { useNftMetadata } from "../hooks/useNftMetadata";
import type { Hex } from "viem";

export function NftPreview({
  nftAddr,
  tokenId,
  className = "",
}: {
  nftAddr?: Hex;
  tokenId?: bigint;
  className?: string;
}) {
  const { metadata, imageUrl, loading } = useNftMetadata(nftAddr, tokenId);

  return (
    <div className={`relative aspect-square rounded-xl overflow-hidden border border-border bg-card ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={metadata?.name || `Token #${tokenId}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <FallbackArt tokenId={tokenId} loading={loading} />
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
        <div className="text-xs text-muted">Token ID</div>
        <div className="text-sm font-semibold font-mono">#{tokenId?.toString()}</div>
        {metadata?.name && <div className="text-sm font-semibold truncate">{metadata.name}</div>}
      </div>
    </div>
  );
}

/** Procedural fallback when no metadata is available. */
function FallbackArt({ tokenId, loading }: { tokenId?: bigint; loading?: boolean }) {
  const id = Number(tokenId ?? 0n);
  const hue = (id * 137) % 360;
  return (
    <div
      className="w-full h-full flex items-center justify-center relative"
      style={{
        background: `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 55%) 0%, hsl(${(hue + 60) % 360}, 70%, 25%) 50%, #0a0a0a 100%)`,
      }}
    >
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="relative flex flex-col items-center gap-2">
        <ImageIcon className={`w-12 h-12 text-white/80 ${loading ? "animate-pulse-slow" : ""}`} />
        <div className="text-xs uppercase tracking-widest font-bold text-white/90">DECRYPTO</div>
        <div className="text-2xl font-mono font-black text-white">#{id}</div>
      </div>
    </div>
  );
}
