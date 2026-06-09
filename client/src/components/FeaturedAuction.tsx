import { Link } from "react-router-dom";
import { Flame, ArrowUpRight, Users, Lock, Eye } from "lucide-react";
import { useAuctionsList } from "../hooks/useAuctionsList";
import { Phase } from "../lib/contracts";
import { NftPreview } from "./NftPreview";
import { Countdown } from "./Countdown";
import { fmtEth } from "../lib/format";

/**
 * Picks the most-active live auction (most bidders; tie → newest) and displays
 * it as a wide hero card with NFT preview, countdown, and CTA.
 */
export function FeaturedAuction() {
  const { rows } = useAuctionsList();
  const live = rows.filter((r) => r.livePhase !== Phase.Finalized);
  if (live.length === 0) return null;

  const featured = [...live].sort((a, b) => {
    if (b.bidderCount !== a.bidderCount) return b.bidderCount - a.bidderCount;
    return Number(b.id - a.id);
  })[0];

  if (!featured) return null;

  const isCommit = featured.livePhase === Phase.Commit;
  const deadline = isCommit ? featured.commitDeadline : featured.revealDeadline;

  return (
    <Link
      to={`/auctions/${featured.id.toString()}`}
      className="relative glass glass-hover rounded-2xl overflow-hidden mb-6 grid grid-cols-1 sm:grid-cols-[280px_1fr] sm:max-h-[280px] group"
    >
      {/* Static gradient glow — no filter:blur, no scroll repaint cost */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle 240px at 100% 0%, rgba(168,85,247,0.22), transparent 70%), radial-gradient(circle 240px at 0% 100%, rgba(34,211,238,0.16), transparent 70%)",
        }}
      />

      <div className="relative overflow-hidden">
        <NftPreview nftAddr={featured.nft} tokenId={featured.tokenId} className="rounded-none border-0 h-full sm:aspect-auto" />
      </div>

      <div className="relative p-5 sm:p-6 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="chip border-accent/40 bg-accent/15 text-accent-glow">
              <Flame className="w-3 h-3 animate-pulse-slow" />
              Featured · most bids
            </span>
            <span className={`chip ${isCommit ? "border-accent/40 bg-accent/15 text-accent-glow" : "border-cyan-500/40 bg-cyan-500/15 text-cyan-300"}`}>
              {isCommit ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {isCommit ? "COMMIT" : "REVEAL"}
            </span>
            <span className="chip border-border bg-card/50 text-muted">
              <Users className="w-3 h-3" />
              {featured.bidderCount} {featured.bidderCount === 1 ? "bidder" : "bidders"}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1.5">
            Auction <span className="neon-text">#{featured.id.toString()}</span>
          </h2>
          <p className="text-sm text-muted">
            Token #{featured.tokenId.toString()} · Min bid <span className="text-white font-mono">{fmtEth(featured.minBid, 4)}</span> ETH · Min deposit <span className="text-white font-mono">{fmtEth(featured.minDeposit, 4)}</span> ETH
          </p>
        </div>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <Countdown deadline={deadline} label={isCommit ? "Commit ends in" : "Reveal ends in"} size="lg" />
          <span className="btn-primary group-hover:shadow-accent/60">
            {isCommit ? "Place sealed bid" : "View"}
            <ArrowUpRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
