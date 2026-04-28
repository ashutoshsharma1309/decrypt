import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAccount, usePublicClient } from "wagmi";
import { Trophy, X, KeyRound, Coins, Eye, History, ArrowRight, Lock, ExternalLink, Copy } from "lucide-react";
import type { Hex } from "viem";
import { auctionContract, Phase, NFT_ADDRESS, AUCTION_NFT_ABI } from "../lib/contracts";
import { fmtEth, isZeroAddr, shortAddr, gatewayUrl } from "../lib/format";
import { ContractMissingBanner } from "../components/ContractMissingBanner";
import { useUserRole } from "../hooks/useUserRole";
import { PhaseBadge } from "../components/PhaseBadge";
import { Countdown } from "../components/Countdown";
import { erc721Abi } from "viem";
import { toast } from "sonner";

type Row = {
  auctionId: bigint;
  nftAddr: Hex;
  tokenId: bigint;
  livePhase: Phase;
  finalized: boolean;
  commitDeadline: bigint;
  revealDeadline: bigint;
  highestBidder: Hex;
  secondBid: bigint;
  myBid: {
    sealedHash: Hex;
    deposit: bigint;
    revealedAmount: bigint;
    revealed: boolean;
    refunded: boolean;
  };
};

export function MyBids() {
  const { address, isConnected } = useAccount();
  const { contractDeployed } = useUserRole();
  const client = usePublicClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [wonNfts, setWonNfts] = useState<{ nftAddr: Hex; tokenId: bigint }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!client || !address || !contractDeployed) {
      setRows([]);
      setWonNfts([]);
      return;
    }
    setLoading(true);

    async function load() {
      try {
        // Enumerate every auction id and check if `address` placed a bid.
        const next = (await client!.readContract({
          ...auctionContract,
          functionName: "nextAuctionId",
        })) as bigint;
        const total = Number(next);
        const list: Row[] = [];

        for (let i = 0; i < total; i++) {
          const id = BigInt(i);
          const bid = (await client!.readContract({
            ...auctionContract,
            functionName: "bids",
            args: [id, address as Hex],
          })) as any;

          const sealedHash = bid[0] as Hex;
          if (sealedHash === "0x0000000000000000000000000000000000000000000000000000000000000000") continue;

          const a = (await client!.readContract({
            ...auctionContract,
            functionName: "auctions",
            args: [id],
          })) as any;
          const live = (await client!.readContract({
            ...auctionContract,
            functionName: "getCurrentPhase",
            args: [id],
          })) as unknown as number;

          list.push({
            auctionId: id,
            nftAddr: a[1] as Hex,
            tokenId: a[2] as bigint,
            livePhase: Number(live) as Phase,
            finalized: a[11] as boolean,
            commitDeadline: a[3] as bigint,
            revealDeadline: a[4] as bigint,
            highestBidder: a[7] as Hex,
            secondBid: a[9] as bigint,
            myBid: {
              sealedHash,
              deposit: bid[1] as bigint,
              revealedAmount: bid[2] as bigint,
              revealed: bid[3] as boolean,
              refunded: bid[4] as boolean,
            },
          });
        }

        if (cancelled) return;
        list.sort((a, b) => Number(b.auctionId - a.auctionId));
        setRows(list);

        // Won NFTs: auctions where this user is highestBidder + finalized.
        const wins: { nftAddr: Hex; tokenId: bigint }[] = [];
        for (const r of list) {
          if (r.finalized && r.highestBidder.toLowerCase() === (address as string).toLowerCase()) {
            wins.push({ nftAddr: r.nftAddr, tokenId: r.tokenId });
          }
        }
        setWonNfts(wins);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          setWonNfts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 12_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [client, address, contractDeployed]);

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center text-muted">
        Connect a wallet to see your bids.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 chip border-accent/40 bg-accent/10 text-accent-glow mb-3">
        <History className="w-3 h-3" /> Your activity
      </div>
      <h1 className="text-3xl font-bold mb-1">My Bids</h1>
      <p className="text-muted mb-6">All auctions you've committed to + NFTs you've won.</p>

      {!contractDeployed && <ContractMissingBanner />}

      {/* Won NFTs */}
      {wonNfts.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent-glow" /> NFTs you won
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {wonNfts.map((n) => (
              <WonNftTile key={`${n.nftAddr}-${n.tokenId}`} nftAddr={n.nftAddr} tokenId={n.tokenId} owner={address as Hex} />
            ))}
          </div>
        </section>
      )}

      {/* Bid history */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted mb-3">Bid history</h2>
        {loading && rows.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl h-20 animate-pulse-slow" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <BidRow key={r.auctionId.toString()} row={r} myAddress={address as Hex} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WonNftTile({ nftAddr, tokenId, owner }: { nftAddr: Hex; tokenId: bigint; owner: Hex }) {
  const client = usePublicClient();
  const [meta, setMeta] = useState<{ name?: string; image?: string }>();
  const [stillOwn, setStillOwn] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!client) return;
        const cur = (await client.readContract({
          address: nftAddr,
          abi: erc721Abi,
          functionName: "ownerOf",
          args: [tokenId],
        })) as string;
        if (cancelled) return;
        setStillOwn(cur.toLowerCase() === (owner as string).toLowerCase());

        const uri = (await client.readContract({
          address: nftAddr,
          abi: AUCTION_NFT_ABI,
          functionName: "tokenURI",
          args: [tokenId],
        })) as string;
        try {
          const r = await fetch(gatewayUrl(uri));
          const j = await r.json();
          if (!cancelled) setMeta({ name: j.name, image: j.image ? gatewayUrl(j.image) : undefined });
        } catch {
          /* no metadata */
        }
      } catch {
        /* ignore */
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [client, nftAddr, tokenId, owner]);

  const id = Number(tokenId);
  const hue = (id * 137) % 360;

  return (
    <div className="glass rounded-xl overflow-hidden border-accent/40 hover:border-accent">
      <div className="relative aspect-square">
        {meta?.image ? (
          <img src={meta.image} className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `radial-gradient(circle at 30% 30%, hsl(${hue}, 80%, 55%) 0%, hsl(${(hue + 60) % 360}, 70%, 25%) 50%, #0a0a0a 100%)` }}
          >
            <div className="text-2xl font-mono font-black text-white">#{id}</div>
          </div>
        )}
        <div className="absolute top-2 left-2 chip border-accent bg-accent/15 text-accent-glow text-[10px]">
          <Trophy className="w-3 h-3" /> Won
        </div>
        {stillOwn === false && (
          <div className="absolute top-2 right-2 chip border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-[10px]">Transferred</div>
        )}
      </div>
      <div className="p-3 space-y-1.5">
        <div className="font-medium text-sm truncate">{meta?.name || `Token #${id}`}</div>
        <div className="text-[10px] text-muted font-mono break-all">{shortAddr(nftAddr)} · #{id}</div>
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${nftAddr},${id}`);
              toast.success("Address + tokenId copied — paste in MetaMask Import NFT");
            }}
            className="text-[10px] text-muted hover:text-white inline-flex items-center gap-1"
            title="Copy contract,tokenId"
          >
            <Copy className="w-3 h-3" /> copy
          </button>
          <a
            href={`https://sepolia.etherscan.io/token/${nftAddr}?a=${id}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-muted hover:text-white inline-flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> etherscan
          </a>
        </div>
      </div>
    </div>
  );
}

function BidRow({ row, myAddress }: { row: Row; myAddress: Hex }) {
  const status = computeStatus(row, myAddress);

  return (
    <div className="glass glass-hover rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/40 to-cyan-500/40 flex items-center justify-center font-mono text-xs font-bold">
          #{row.auctionId.toString()}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate">Token #{row.tokenId.toString()}</div>
          <div className="text-[11px] text-muted flex flex-wrap items-center gap-2 mt-0.5">
            <PhaseBadge phase={row.livePhase} size="sm" />
            <span>·</span>
            <span>Deposit {fmtEth(row.myBid.deposit, 4)} ETH</span>
            {row.myBid.revealed && (
              <>
                <span>·</span>
                <span>Bid {fmtEth(row.myBid.revealedAmount, 4)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={`chip ${status.tone}`}>
          {status.icon}
          {status.label}
        </span>
        {(row.livePhase === Phase.Commit || row.livePhase === Phase.Reveal) && !row.finalized && (
          <Countdown
            deadline={row.livePhase === Phase.Commit ? row.commitDeadline : row.revealDeadline}
            size="sm"
          />
        )}
      </div>

      <Link to={`/auctions/${row.auctionId.toString()}`} className="btn-secondary text-xs whitespace-nowrap">
        {status.cta}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

function computeStatus(row: Row, myAddress: Hex) {
  const isWinner = row.highestBidder.toLowerCase() === myAddress.toLowerCase();

  if (row.finalized) {
    if (row.myBid.refunded) {
      return { label: isWinner ? "Won + refunded" : "Refunded", icon: <Coins className="w-3 h-3" />, tone: "border-success/40 bg-success/10 text-success", cta: "View" };
    }
    if (isWinner) {
      return { label: "Won — claim refund", icon: <Trophy className="w-3 h-3" />, tone: "border-accent/40 bg-accent/15 text-accent-glow", cta: "Claim" };
    }
    if (row.myBid.revealed) {
      return { label: "Lost — claim refund", icon: <Coins className="w-3 h-3" />, tone: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300", cta: "Claim" };
    }
    return { label: "Forfeited (no reveal)", icon: <X className="w-3 h-3" />, tone: "border-danger/40 bg-danger/10 text-danger", cta: "View" };
  }

  if (row.livePhase === Phase.Reveal) {
    if (row.myBid.revealed) {
      return { label: "Revealed", icon: <Eye className="w-3 h-3" />, tone: "border-cyan-500/40 bg-cyan-500/15 text-cyan-300", cta: "View" };
    }
    return { label: "Reveal now", icon: <KeyRound className="w-3 h-3" />, tone: "border-warning/40 bg-warning/15 text-warning", cta: "Reveal" };
  }

  if (row.livePhase === Phase.Commit) {
    return { label: "Committed", icon: <Lock className="w-3 h-3" />, tone: "border-accent/40 bg-accent/15 text-accent-glow", cta: "View" };
  }

  return { label: "Awaiting finalize", icon: <History className="w-3 h-3" />, tone: "border-border bg-card/40 text-muted", cta: "View" };
}

function Empty() {
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <History className="w-10 h-10 mx-auto text-muted opacity-50 mb-3" />
      <div className="font-bold mb-1">You haven't placed any bids yet</div>
      <p className="text-muted text-sm mb-5">Browse live auctions to get started.</p>
      <Link to="/auctions" className="btn-primary inline-flex">
        Browse auctions <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
