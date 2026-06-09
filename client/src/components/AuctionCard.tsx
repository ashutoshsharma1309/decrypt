import { Link } from "react-router-dom";
import { useAuction, useCurrentPhase } from "../hooks/useAuction";
import { Phase } from "../lib/contracts";
import { PhaseBadge } from "./PhaseBadge";
import { Countdown } from "./Countdown";
import { NftPreview } from "./NftPreview";
import { fmtEth, shortAddr } from "../lib/format";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { AuctionRow } from "../hooks/useAuctionsList";

/**
 * Pass `row` from a parent that already loaded the auctions list — we'll skip
 * per-card RPC reads. If not provided we'll fall back to fetching the auction.
 */
export function AuctionCard({ id, row }: { id: bigint; row?: AuctionRow }) {
  // Only fetch if no row was given.
  const { auction } = useAuction(row ? undefined : id);
  const { data: live } = useCurrentPhase(row ? undefined : id);

  const data = row
    ? {
        seller: row.seller,
        nft: row.nft,
        tokenId: row.tokenId,
        commitDeadline: row.commitDeadline,
        revealDeadline: row.revealDeadline,
        minBid: row.minBid,
        secondBid: row.secondBid,
        finalized: row.finalized,
        highestBidder: row.highestBidder,
        livePhase: row.livePhase,
      }
    : auction
      ? {
          seller: auction.seller,
          nft: auction.nft,
          tokenId: auction.tokenId,
          commitDeadline: auction.commitDeadline,
          revealDeadline: auction.revealDeadline,
          minBid: auction.minBid,
          secondBid: auction.secondBid,
          finalized: auction.finalized,
          highestBidder: auction.highestBidder,
          livePhase: (live !== undefined ? Number(live) : auction.phase) as Phase,
        }
      : undefined;

  if (!data) {
    return <div className="rounded-2xl h-[420px] bg-card animate-pulse-slow border border-border" />;
  }

  const phase = data.livePhase;
  const deadline = phase === Phase.Commit ? data.commitDeadline : phase === Phase.Reveal ? data.revealDeadline : undefined;
  const isLive = phase === Phase.Commit || phase === Phase.Reveal;

  return (
    <Link
      to={`/auctions/${id.toString()}`}
      className="group relative rounded-2xl overflow-hidden flex flex-col bg-card border border-border transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-accent/60"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/0 to-cyan-500/0 group-hover:from-accent/5 group-hover:to-cyan-500/5 transition-colors pointer-events-none" />

      <div className="relative">
        <NftPreview nftAddr={data.nft} tokenId={data.tokenId} className="rounded-none border-0" />
        {isLive ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <PhaseBadge phase={phase} />
            <span className="chip border-success/40 bg-success/10 text-success !py-0.5 !px-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
            </span>
          </div>
        ) : (
          <div className="absolute top-3 left-3"><PhaseBadge phase={phase} /></div>
        )}
        <div className="absolute top-3 right-3 chip border-border bg-bg/80 text-white">
          <span className="text-muted">#</span>
          <span className="font-mono">{id.toString()}</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg/80 to-transparent pointer-events-none" />
      </div>

      <div className="relative p-4 space-y-3 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted">Min bid</div>
            <div className="text-base font-bold font-mono">
              {fmtEth(data.minBid)} <span className="text-xs text-muted">ETH</span>
            </div>
          </div>
          {!!deadline && phase !== Phase.Finalized && (
            <Countdown deadline={deadline} label={phase === Phase.Commit ? "Commit ends" : "Reveal ends"} />
          )}
          {phase === Phase.Finalized && data.finalized && data.highestBidder !== "0x0000000000000000000000000000000000000000" && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted flex items-center gap-1 justify-end">
                <Sparkles className="w-3 h-3" /> Sold
              </div>
              <div className="text-base font-bold text-success font-mono">{fmtEth(data.secondBid)} ETH</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
          <span className="text-muted">Seller <span className="font-mono text-white">{shortAddr(data.seller)}</span></span>
          <span className="text-accent flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            View <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
