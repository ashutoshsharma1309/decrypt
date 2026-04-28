import { Link } from "react-router-dom";
import { useAuction, useCurrentPhase } from "../hooks/useAuction";
import { Phase } from "../lib/contracts";
import { PhaseBadge } from "./PhaseBadge";
import { Countdown } from "./Countdown";
import { NftPreview } from "./NftPreview";
import { fmtEth, shortAddr } from "../lib/format";
import { ArrowUpRight, Users, Sparkles } from "lucide-react";

export function AuctionCard({ id }: { id: bigint }) {
  const { auction } = useAuction(id);
  const { data: live } = useCurrentPhase(id);

  if (!auction) {
    return <div className="glass rounded-2xl h-[420px] animate-pulse-slow" />;
  }

  const phase = (live !== undefined ? Number(live) : auction.phase) as Phase;
  const deadline = phase === Phase.Commit ? auction.commitDeadline : phase === Phase.Reveal ? auction.revealDeadline : undefined;
  const isLive = phase === Phase.Commit || phase === Phase.Reveal;

  return (
    <Link
      to={`/auctions/${id.toString()}`}
      className="group relative rounded-2xl overflow-hidden flex flex-col bg-card border border-border transition-all hover:-translate-y-1 hover:border-accent/60"
    >
      {/* Glow ring on hover */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/0 via-accent/0 to-cyan-500/0 group-hover:from-accent/40 group-hover:via-accent/20 group-hover:to-cyan-500/40 transition-all opacity-0 group-hover:opacity-100 blur-md pointer-events-none" />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/0 to-cyan-500/0 group-hover:from-accent/5 group-hover:to-cyan-500/5 transition-all pointer-events-none" />

      <div className="relative">
        <NftPreview nftAddr={auction.nft} tokenId={auction.tokenId} className="rounded-none border-0 transition-transform duration-500 group-hover:scale-[1.02]" />
        {/* Live pulse for active */}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <PhaseBadge phase={phase} />
            <span className="chip border-success/40 bg-success/10 text-success !py-0.5 !px-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
            </span>
          </div>
        )}
        {!isLive && (
          <div className="absolute top-3 left-3"><PhaseBadge phase={phase} /></div>
        )}
        <div className="absolute top-3 right-3 chip border-border bg-bg/80 text-white">
          <span className="text-muted">#</span>
          <span className="font-mono">{id.toString()}</span>
        </div>
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-bg/80 to-transparent pointer-events-none" />
      </div>

      <div className="relative p-4 space-y-3 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted">Min bid</div>
            <div className="text-base font-bold font-mono">
              {fmtEth(auction.minBid)} <span className="text-xs text-muted">ETH</span>
            </div>
          </div>
          {!!deadline && phase !== Phase.Finalized && (
            <Countdown deadline={deadline} label={phase === Phase.Commit ? "Commit ends" : "Reveal ends"} />
          )}
          {phase === Phase.Finalized && auction.finalized && auction.highestBidder !== "0x0000000000000000000000000000000000000000" && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted flex items-center gap-1 justify-end">
                <Sparkles className="w-3 h-3" /> Sold
              </div>
              <div className="text-base font-bold text-success font-mono">{fmtEth(auction.secondBid)} ETH</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
          <div className="flex items-center gap-3">
            <span className="text-muted">Seller <span className="font-mono text-white">{shortAddr(auction.seller)}</span></span>
          </div>
          <span className="text-accent flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all">
            View <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
