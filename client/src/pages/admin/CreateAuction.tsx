import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import { erc721Abi, parseEther, type Hex } from "viem";
import { ArrowLeft, Check, Loader2, Plus, Image as ImageIcon, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useApproveNft, useCreateAuction } from "../../hooks/useAuctionActions";
import { useOwnedNfts } from "../../hooks/useOwnedNfts";
import { useNftMetadata } from "../../hooks/useNftMetadata";
import { AUCTION_ADDRESS, NFT_ADDRESS } from "../../lib/contracts";
import { ContractMissingBanner } from "../../components/ContractMissingBanner";
import { useUserRole } from "../../hooks/useUserRole";
import { isZeroAddr, gatewayUrl } from "../../lib/format";

export function CreateAuction() {
  const nav = useNavigate();
  const { address, isConnected } = useAccount();
  const { contractDeployed } = useUserRole();
  const { approve, isPending: approving, isLoading: approveWaiting } = useApproveNft();
  const { create, isPending: creating, isLoading: createWaiting } = useCreateAuction();

  const [nftAddr, setNftAddr] = useState<string>(NFT_ADDRESS);
  const [tokenId, setTokenId] = useState("");
  // Durations now in SECONDS for fast hackathon demos.
  const [commitSec, setCommitSec] = useState("60");
  const [revealSec, setRevealSec] = useState("60");
  const [minBid, setMinBid] = useState("0.001");
  const [minDeposit, setMinDeposit] = useState("0.001");

  const isDefaultNft = !!nftAddr && nftAddr.toLowerCase() === NFT_ADDRESS.toLowerCase() && !isZeroAddr(NFT_ADDRESS);
  const { items: owned, loading: loadingOwned } = useOwnedNfts(
    isDefaultNft ? (address as Hex | undefined) : undefined,
    nftAddr as Hex
  );

  const tokenIdBig = (() => {
    try {
      return tokenId ? BigInt(tokenId) : undefined;
    } catch {
      return undefined;
    }
  })();

  const { data: owner } = useReadContract({
    address: nftAddr as Hex,
    abi: erc721Abi,
    functionName: "ownerOf",
    args: tokenIdBig !== undefined ? [tokenIdBig] : undefined,
    query: { enabled: !!nftAddr && tokenIdBig !== undefined && contractDeployed },
  });
  const ownsToken = !!owner && !!address && (owner as string).toLowerCase() === address.toLowerCase();

  const { data: approvedTo } = useReadContract({
    address: nftAddr as Hex,
    abi: erc721Abi,
    functionName: "getApproved",
    args: tokenIdBig !== undefined ? [tokenIdBig] : undefined,
    query: { enabled: !!nftAddr && tokenIdBig !== undefined && contractDeployed, refetchInterval: 8_000 },
  });
  const isApproved = !!approvedTo && (approvedTo as string).toLowerCase() === AUCTION_ADDRESS.toLowerCase();

  const { metadata, imageUrl } = useNftMetadata(nftAddr as Hex, tokenIdBig);

  // Auto-pick first owned NFT once it loads, if user hasn't picked manually.
  useEffect(() => {
    if (!tokenId && owned.length > 0) {
      setTokenId(owned[0].tokenId.toString());
    }
  }, [owned.length]); // eslint-disable-line

  async function onApprove() {
    if (!nftAddr || tokenIdBig === undefined) return;
    try {
      await approve(nftAddr as Hex, AUCTION_ADDRESS, tokenIdBig);
    } catch (e: any) {
      toast.error(e?.shortMessage || "Approve failed");
    }
  }

  async function onCreate() {
    if (!nftAddr || tokenIdBig === undefined) return;
    let commitS: bigint, revealS: bigint, mb: bigint, md: bigint;
    try {
      commitS = BigInt(Math.floor(Number(commitSec)));
      revealS = BigInt(Math.floor(Number(revealSec)));
      mb = parseEther(minBid);
      md = parseEther(minDeposit);
    } catch {
      toast.error("Invalid number");
      return;
    }
    if (md < mb) {
      toast.error("Min deposit must be ≥ min bid");
      return;
    }
    if (commitS <= 0n || revealS <= 0n) {
      toast.error("Durations must be > 0");
      return;
    }
    try {
      await create(nftAddr as Hex, tokenIdBig, commitS, revealS, mb, md);
      toast.success("Auction created!");
      setTimeout(() => nav("/admin"), 1200);
    } catch (e: any) {
      toast.error(e?.shortMessage || "Create failed");
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Connect a wallet</h2>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/admin" className="text-muted hover:text-white text-sm flex items-center gap-2 mb-6">
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>

      <h1 className="text-3xl font-bold mb-1">Create Auction</h1>
      <p className="text-muted mb-6">Two transactions: approve the NFT, then create the auction.</p>

      {!contractDeployed && <ContractMissingBanner />}

      <div className="glass rounded-2xl p-6 space-y-5">
        <div>
          <label className="label">NFT contract</label>
          <input className="input font-mono text-xs" value={nftAddr} onChange={(e) => setNftAddr(e.target.value)} placeholder="0x..." />
          <div className="text-[11px] text-muted mt-1">Defaults to the platform AuctionNFT. Replace to use any ERC-721.</div>
        </div>

        {/* NFT picker — only when using the default contract and address loaded */}
        {isDefaultNft && (
          <div>
            <label className="label flex items-center gap-2">
              <Wand2 className="w-3 h-3" /> Your NFTs in this contract
            </label>
            {loadingOwned ? (
              <div className="text-xs text-muted py-3">Scanning your wallet…</div>
            ) : owned.length === 0 ? (
              <div className="text-xs text-muted py-3">
                No NFTs found in your wallet for this contract. Mint one first at{" "}
                <Link to="/admin/nfts" className="text-accent hover:underline">/admin/nfts</Link>.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {owned.map((n) => (
                  <button
                    key={n.tokenId.toString()}
                    onClick={() => setTokenId(n.tokenId.toString())}
                    className={`chip transition-colors ${
                      tokenId === n.tokenId.toString()
                        ? "border-accent bg-accent/15 text-accent-glow"
                        : "border-border bg-card/40 text-muted hover:text-white"
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    Token #{n.tokenId.toString()}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">Token ID</label>
          <input className="input font-mono" value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="0" inputMode="numeric" />
          {tokenIdBig !== undefined && owner !== undefined && (
            <div className={`text-[11px] mt-1 ${ownsToken ? "text-success" : "text-danger"}`}>
              {ownsToken ? "✓ You own this token." : `Owner: ${owner as string}`}
            </div>
          )}
        </div>

        {/* Live preview */}
        {tokenIdBig !== undefined && (
          <div className="rounded-xl border border-border bg-card/40 p-3 flex gap-3 items-center">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-card shrink-0">
              {imageUrl ? (
                <img src={gatewayUrl(imageUrl)} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted">Preview</div>
              <div className="font-medium truncate">{metadata?.name || `Token #${tokenIdBig.toString()}`}</div>
              {metadata?.description && <div className="text-[11px] text-muted truncate">{metadata.description}</div>}
            </div>
          </div>
        )}

        <div>
          <label className="label">Quick presets (commit / reveal)</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "30s / 30s", c: 30, r: 30, hint: "fastest demo" },
              { label: "1m / 1m", c: 60, r: 60, hint: "demo" },
              { label: "2m / 2m", c: 120, r: 120 },
              { label: "5m / 5m", c: 300, r: 300 },
              { label: "10m / 10m", c: 600, r: 600 },
              { label: "1h / 1h", c: 3600, r: 3600, hint: "production" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setCommitSec(String(p.c));
                  setRevealSec(String(p.r));
                }}
                className={`chip transition-colors ${
                  Number(commitSec) === p.c && Number(revealSec) === p.r
                    ? "border-accent bg-accent/15 text-accent-glow"
                    : "border-border bg-card/40 text-muted hover:text-white"
                }`}
              >
                {p.label}
                {p.hint && <span className="opacity-60 ml-1">· {p.hint}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Commit window (sec)</label>
            <input className="input font-mono" value={commitSec} onChange={(e) => setCommitSec(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label className="label">Reveal window (sec)</label>
            <input className="input font-mono" value={revealSec} onChange={(e) => setRevealSec(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label className="label">Min bid (ETH)</label>
            <input className="input font-mono" value={minBid} onChange={(e) => setMinBid(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <label className="label">Min deposit (ETH)</label>
            <input className="input font-mono" value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} inputMode="decimal" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card/40 p-3 text-xs text-muted leading-relaxed">
          Hackathon demo? Try <strong>30s / 30s</strong>. Switching wallets + revealing
          fits comfortably in that window. The deposit caps each bidder's max revealable bid.
        </div>

        <Step
          number={1}
          title="Approve NFT to auction contract"
          done={!!isApproved}
          loading={approving || approveWaiting}
          disabled={!ownsToken || tokenIdBig === undefined}
          onClick={onApprove}
        />

        <Step
          number={2}
          title="Create auction"
          done={false}
          loading={creating || createWaiting}
          disabled={!isApproved || !ownsToken}
          onClick={onCreate}
          icon={<Plus className="w-4 h-4" />}
          primary
        />
      </div>
    </div>
  );
}

function Step({ number, title, done, loading, disabled, onClick, icon, primary }: {
  number: number;
  title: string;
  done: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  primary?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${done ? "border-success/40 bg-success/5" : "border-border bg-card/40"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-success text-white" : "bg-card border border-border text-muted"}`}>
            {done ? <Check className="w-4 h-4" /> : number}
          </div>
          <div className="font-semibold text-sm">{title}</div>
        </div>
        <button onClick={onClick} disabled={disabled || loading || done} className={primary ? "btn-primary" : "btn-secondary"}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
          {done ? "Done" : loading ? "Pending…" : "Run"}
        </button>
      </div>
    </div>
  );
}
