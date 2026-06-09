import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { erc721Abi, type Hex } from "viem";
import { ArrowLeft, ImagePlus, Image as ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMintNft } from "../../hooks/useAuctionActions";
import { useAllMintedNfts } from "../../hooks/useOwnedNfts";
import { useNftMetadata } from "../../hooks/useNftMetadata";
import { nftContract, NFT_ADDRESS, AUCTION_ADDRESS } from "../../lib/contracts";
import { isZeroAddr, shortAddr, gatewayUrl } from "../../lib/format";
import { ContractMissingBanner } from "../../components/ContractMissingBanner";
import { NftPreview } from "../../components/NftPreview";
import { useUserRole } from "../../hooks/useUserRole";

type Filter = "all" | "mine" | "auctions" | "sold";

export function NftManager() {
  const { address } = useAccount();
  const { contractDeployed } = useUserRole();
  const { mint, isPending, isLoading } = useMintNft();
  const { items, loading } = useAllMintedNfts();

  const [to, setTo] = useState("");
  const [uri, setUri] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: contractOwner } = useReadContract({
    ...nftContract,
    functionName: "owner",
    query: { enabled: !isZeroAddr(NFT_ADDRESS) },
  });
  const isContractOwner = !!contractOwner && !!address && (contractOwner as string).toLowerCase() === address.toLowerCase();

  async function onMint() {
    const target = (to || address) as Hex | undefined;
    if (!target) {
      toast.error("Recipient required");
      return;
    }
    if (!uri) {
      toast.error("Token URI required");
      return;
    }
    try {
      await mint(target, uri);
      toast.success("NFT minted");
      setUri("");
      setTo("");
    } catch (e: any) {
      toast.error(e?.shortMessage || "Mint failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/admin" className="text-muted hover:text-white text-sm flex items-center gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>
      <h1 className="text-3xl font-bold mb-1">NFT Manager</h1>
      <p className="text-muted mb-6">Mint new NFTs and browse all minted inventory.</p>

      {!contractDeployed && <ContractMissingBanner />}

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        {/* Left: mint form */}
        <div className="glass rounded-2xl p-5 h-fit space-y-4">
          <h2 className="font-bold flex items-center gap-2">
            <ImagePlus className="w-4 h-4" /> Mint NFT
          </h2>

          <div className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted">
            Contract owner: <span className="font-mono text-white">{contractOwner ? shortAddr(contractOwner as string) : "—"}</span>{" "}
            {isContractOwner !== undefined && (
              <span className={isContractOwner ? "text-success" : "text-danger"}>
                {isContractOwner ? "(you)" : "(not you)"}
              </span>
            )}
          </div>

          <div>
            <label className="label">Recipient</label>
            <input
              className="input font-mono text-xs"
              value={to}
              placeholder={address ?? "0x..."}
              onChange={(e) => setTo(e.target.value)}
            />
            <div className="text-[11px] text-muted mt-1">Defaults to your address.</div>
          </div>
          <div>
            <label className="label">Token URI</label>
            <input
              className="input font-mono text-xs"
              value={uri}
              placeholder="ipfs://Qm.../metadata.json"
              onChange={(e) => setUri(e.target.value)}
            />
            <div className="text-[11px] text-muted mt-1">JSON: <code className="font-mono">{`{ name, description, image }`}</code></div>
          </div>

          {uri && <UriPreview uri={uri} />}

          <button
            className="btn-primary w-full py-2.5"
            disabled={!isContractOwner || isPending || isLoading || !uri}
            onClick={onMint}
          >
            <ImagePlus className="w-4 h-4" />
            {isPending || isLoading ? "Minting…" : "Mint NFT"}
          </button>
          {!isContractOwner && contractDeployed && (
            <div className="text-xs text-danger text-center">
              Only the NFT contract owner can mint. (The deployer wallet is the owner.)
            </div>
          )}
        </div>

        {/* Right: gallery */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold">Minted NFTs</h2>
            <div className="flex gap-1.5 text-xs">
              {(["all", "mine", "auctions", "sold"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`chip transition-colors ${
                    filter === f ? "border-accent bg-accent/15 text-accent-glow" : "border-border bg-card/40 text-muted hover:text-white"
                  }`}
                >
                  {f === "all" ? "All" : f === "mine" ? "Owned by me" : f === "auctions" ? "In auctions" : "Sold"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-card animate-pulse-slow" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <ImageIcon className="w-10 h-10 text-muted opacity-50 mx-auto mb-3" />
              <div className="font-bold">No NFTs yet</div>
              <p className="text-muted text-sm">Use the form on the left to mint inventory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((n) => (
                <NftTile key={n.tokenId.toString()} tokenId={n.tokenId} myAddress={address as Hex | undefined} filter={filter} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UriPreview({ uri }: { uri: string }) {
  const [meta, setMeta] = useState<any>();
  useEffect(() => {
    let c = false;
    fetch(gatewayUrl(uri))
      .then((r) => r.json())
      .then((j) => !c && setMeta(j))
      .catch(() => !c && setMeta(undefined));
    return () => {
      c = true;
    };
  }, [uri]);
  if (!meta) return null;
  return (
    <div className="rounded-lg border border-success/30 bg-success/5 p-3 flex gap-3 items-center text-xs">
      {meta.image && <img src={gatewayUrl(meta.image)} className="w-12 h-12 rounded object-cover" />}
      <div className="min-w-0">
        <div className="font-bold truncate">{meta.name || "Untitled"}</div>
        <div className="text-muted truncate">{meta.description || ""}</div>
      </div>
    </div>
  );
}

function NftTile({ tokenId, myAddress, filter }: { tokenId: bigint; myAddress?: Hex; filter: Filter }) {
  const { data: currentOwner } = useReadContract({
    ...nftContract,
    functionName: "ownerOf",
    args: [tokenId],
  });
  const { metadata, imageUrl } = useNftMetadata(undefined, tokenId);

  const ownerAddr = currentOwner as Hex | undefined;
  const ownedByMe = !!myAddress && !!ownerAddr && ownerAddr.toLowerCase() === myAddress.toLowerCase();
  const inAuction = !!ownerAddr && ownerAddr.toLowerCase() === AUCTION_ADDRESS.toLowerCase();
  const sold = !!ownerAddr && !ownedByMe && !inAuction;

  if (filter === "mine" && !ownedByMe) return null;
  if (filter === "auctions" && !inAuction) return null;
  if (filter === "sold" && !sold) return null;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="relative aspect-square">
        <NftPreview nftAddr={NFT_ADDRESS as Hex} tokenId={tokenId} className="w-full h-full !rounded-none !border-0" />
        <div className="absolute top-2 left-2 chip border-border bg-bg/90 text-white text-[10px]">#{tokenId.toString()}</div>
        {inAuction && <div className="absolute top-2 right-2 chip border-accent/40 bg-accent/15 text-accent-glow text-[10px]">In auction</div>}
        {ownedByMe && !inAuction && <div className="absolute top-2 right-2 chip border-success/40 bg-success/15 text-success text-[10px]">Mine</div>}
        {sold && <div className="absolute top-2 right-2 chip border-cyan-500/40 bg-cyan-500/15 text-cyan-300 text-[10px]">Sold</div>}
      </div>
      <div className="p-3">
        <div className="font-medium text-sm truncate">{metadata?.name || `Token #${tokenId.toString()}`}</div>
        <div className="text-[11px] text-muted font-mono mt-1 flex items-center gap-1.5">
          <span>Owner: {shortAddr(ownerAddr || "")}</span>
          {ownerAddr && (
            <a
              href={`https://sepolia.etherscan.io/address/${ownerAddr}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-accent"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ProceduralArt({ id }: { id: number }) {
  const hue = (id * 137) % 360;
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 55%) 0%, hsl(${(hue + 60) % 360}, 70%, 25%) 50%, #0a0a0a 100%)` }}
    >
      <div className="text-2xl font-mono font-black text-white">#{id}</div>
    </div>
  );
}
