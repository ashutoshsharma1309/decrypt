import { useEffect, useMemo, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAccount, useReadContract } from "wagmi";
import confetti from "canvas-confetti";
import { ArrowLeft, Gavel, Trophy, ExternalLink, RefreshCw, X, ChevronRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuction, useBid, useCurrentPhase, useBidders } from "../hooks/useAuction";
import { useUserRole } from "../hooks/useUserRole";
import { useFinalize, useClaimRefund } from "../hooks/useAuctionActions";
import { auctionContract, Phase } from "../lib/contracts";
import { fmtEth, shortAddr } from "../lib/format";
import { PhaseBadge } from "../components/PhaseBadge";
import { Countdown } from "../components/Countdown";
import { NftPreview } from "../components/NftPreview";
import { BidCommitForm } from "../components/BidCommitForm";
import { BidRevealForm } from "../components/BidRevealForm";
import { BidLeaderboard } from "../components/BidLeaderboard";
import { useCountdown } from "../hooks/useCountdown";
import { playRevealChime, playWinChime } from "../lib/sound";

export function AuctionDetail() {
  const { id } = useParams<{ id: string }>();
  const auctionId = id !== undefined ? BigInt(id) : undefined;
  const { address } = useAccount();
  const { auction, refetch: refetchAuction } = useAuction(auctionId);
  const { data: liveData, refetch: refetchPhase } = useCurrentPhase(auctionId);
  const { data: biddersData, refetch: refetchBidders } = useBidders(auctionId);
  const { bid, refetch: refetchBid } = useBid(auctionId, address);

  const phase = (liveData !== undefined ? Number(liveData) : auction?.phase ?? 0) as Phase;

  const refetchAll = () => {
    refetchAuction();
    refetchPhase();
    refetchBidders();
    refetchBid();
  };

  // Sound + confetti on phase change.
  const prevPhase = useRef<Phase | null>(null);
  useEffect(() => {
    if (prevPhase.current !== null && prevPhase.current !== phase) {
      if (phase === Phase.Reveal) playRevealChime();
    }
    prevPhase.current = phase;
  }, [phase]);

  // Confetti when finalized + connected user is the winner.
  const firedConfetti = useRef(false);
  useEffect(() => {
    if (!auction?.finalized || firedConfetti.current) return;
    if (auction.highestBidder?.toLowerCase() === address?.toLowerCase()) {
      firedConfetti.current = true;
      playWinChime();
      confetti({ particleCount: 180, spread: 80, origin: { y: 0.3 } });
      setTimeout(() => confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 } }), 300);
    }
  }, [auction?.finalized, auction?.highestBidder, address]);

  const { isAdmin } = useUserRole();

  if (auctionId === undefined || !auction) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center text-muted">
        Loading auction…
      </div>
    );
  }

  // Sanity: zero-address seller means auction doesn't exist.
  if (auction.seller === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <Link to="/" className="text-muted hover:text-white text-sm flex items-center gap-2 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="glass rounded-2xl p-10 text-center">
          <h2 className="text-xl font-bold mb-2">Auction not found</h2>
          <p className="text-muted text-sm">No auction exists at id #{auctionId.toString()}.</p>
        </div>
      </div>
    );
  }

  const isSeller = auction.seller.toLowerCase() === address?.toLowerCase();
  const isWinner = !!auction.highestBidder && auction.highestBidder.toLowerCase() === address?.toLowerCase();
  const hasBid = !!bid && bid.sealedHash !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <nav className="flex items-center gap-1.5 text-xs text-muted mb-3">
        <Link to="/auctions" className="hover:text-white">Auctions</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-white">Auction #{auctionId.toString()}</span>
        {isAdmin && (
          <span className="ml-2 chip border-accent/40 bg-accent/10 text-accent-glow text-[10px]">
            <ShieldCheck className="w-3 h-3" /> Admin view
          </span>
        )}
      </nav>
      <Link to="/auctions" className="text-muted hover:text-white text-sm flex items-center gap-2 mb-6">
        <ArrowLeft className="w-4 h-4" /> All auctions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        {/* Left column: NFT + status */}
        <div className="space-y-4">
          <NftPreview nftAddr={auction.nft} tokenId={auction.tokenId} />

          <div className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <PhaseBadge phase={phase} size="md" />
              <button onClick={refetchAll} className="btn-ghost p-1.5 hover:text-accent" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <PhaseTimeline auction={auction} phase={phase} />

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border text-sm">
              <Field label="Auction ID" value={`#${auctionId.toString()}`} mono />
              <Field label="Token ID" value={`#${auction.tokenId.toString()}`} mono />
              <Field label="Min bid" value={`${fmtEth(auction.minBid)} ETH`} mono />
              <Field label="Min deposit" value={`${fmtEth(auction.minDeposit)} ETH`} mono />
              <Field label="Seller" value={shortAddr(auction.seller)} mono />
              <Field label="Bidders" value={(biddersData as any[] | undefined)?.length.toString() ?? "—"} mono />
            </div>
          </div>
        </div>

        {/* Right column: action */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <ActionPanel
              phase={phase}
              auction={auction}
              auctionId={auctionId}
              isSeller={isSeller}
              isWinner={isWinner}
              hasBid={hasBid}
              bidRevealed={!!bid?.revealed}
              bidRefunded={!!bid?.refunded}
              onAfterTx={refetchAll}
            />
          </div>

          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm uppercase tracking-widest text-muted mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> Reveals
            </h3>
            <BidLeaderboard auctionId={auctionId} />
          </div>

          {auction.finalized && (
            <FinalizedSummary auction={auction} />
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function PhaseTimeline({ auction, phase }: { auction: any; phase: Phase }) {
  const commitRem = useCountdown(auction.commitDeadline);
  const revealRem = useCountdown(auction.revealDeadline);
  const showCommit = phase === Phase.Commit && commitRem > 0;
  const showReveal = phase === Phase.Reveal || (phase === Phase.Commit && commitRem === 0);

  if (auction.finalized) return null;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      {showCommit && <Countdown deadline={auction.commitDeadline} label="Commit ends in" size="lg" />}
      {showReveal && <Countdown deadline={auction.revealDeadline} label="Reveal ends in" size="lg" />}
      {!showCommit && !showReveal && phase !== Phase.Finalized && (
        <div className="text-sm text-muted">
          Reveal window closed — anyone can <strong className="text-white">finalize</strong> below.
        </div>
      )}
    </div>
  );
}

function ActionPanel(props: {
  phase: Phase;
  auction: any;
  auctionId: bigint;
  isSeller: boolean;
  isWinner: boolean;
  hasBid: boolean;
  bidRevealed: boolean;
  bidRefunded: boolean;
  onAfterTx: () => void;
}) {
  const { phase, auction, auctionId, isSeller, isWinner, hasBid, bidRevealed, bidRefunded, onAfterTx } = props;
  const { isConnected } = useAccount();
  const { finalize, isPending: finalizing, isLoading: finWaiting } = useFinalize();
  const { claim, isPending: claiming, isLoading: clmWaiting } = useClaimRefund();

  if (!isConnected) {
    return (
      <div className="text-center py-6">
        <h3 className="text-lg font-bold mb-1">Connect wallet to continue</h3>
        <p className="text-muted text-sm">Use the connect button in the top-right.</p>
      </div>
    );
  }

  // FINALIZED
  if (auction.finalized) {
    if (auction.highestBidder === "0x0000000000000000000000000000000000000000") {
      return (
        <div className="text-center py-2">
          <h3 className="text-lg font-bold">Auction closed — no valid bids.</h3>
          <p className="text-muted text-sm">NFT returned to seller.</p>
        </div>
      );
    }
    if (isWinner) {
      return (
        <div className="text-center py-2">
          <Trophy className="w-10 h-10 text-accent mx-auto mb-2" />
          <h3 className="text-2xl font-bold">You won!</h3>
          <p className="text-muted text-sm mb-4">
            You paid <span className="font-mono text-white font-semibold">{fmtEth(auction.secondBid)} ETH</span> (the second-highest bid).
          </p>
          {!bidRefunded && (
            <button
              className="btn-primary"
              disabled={claiming || clmWaiting}
              onClick={async () => {
                try {
                  await claim(auctionId);
                  onAfterTx();
                } catch (e: any) {
                  toast.error(e?.shortMessage || "Claim failed");
                }
              }}
            >
              {claiming || clmWaiting ? "Claiming…" : "Claim Refund"}
            </button>
          )}
          {bidRefunded && <div className="text-success text-sm">Refund already claimed.</div>}
          <RefundDetail auctionId={auctionId} />
        </div>
      );
    }
    if (hasBid && bidRevealed && !bidRefunded) {
      return <ClaimUI auctionId={auctionId} onAfterTx={onAfterTx} />;
    }
    if (hasBid && bidRefunded) {
      return <div className="text-center py-4 text-success text-sm">Refund already claimed.</div>;
    }
    if (hasBid && !bidRevealed) {
      return (
        <div className="text-center py-4">
          <X className="w-8 h-8 text-danger mx-auto mb-2" />
          <h3 className="font-bold">You did not reveal.</h3>
          <p className="text-muted text-sm">Your deposit was forfeited to the seller.</p>
        </div>
      );
    }
    return (
      <div className="text-center py-4">
        <h3 className="font-bold">Auction finalized</h3>
        <p className="text-muted text-sm">
          Winner: <span className="font-mono text-white">{shortAddr(auction.highestBidder)}</span> · Sold for{" "}
          <span className="font-mono text-white">{fmtEth(auction.secondBid)} ETH</span>
        </p>
      </div>
    );
  }

  // COMMIT
  if (phase === Phase.Commit) {
    if (isSeller) {
      return <SellerNotice msg="You are the seller. Bids are being collected." />;
    }
    if (hasBid) {
      return (
        <div className="text-center py-2">
          <h3 className="font-bold mb-1">You've committed a bid.</h3>
          <p className="text-muted text-sm">Come back during the reveal phase to disclose your bid.</p>
        </div>
      );
    }
    return (
      <>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">Commit Phase</h3>
        <p className="text-muted text-sm mb-4">
          Submit a sealed hash of your bid + a deposit. Your bid stays hidden until the reveal phase.
        </p>
        <BidCommitForm auctionId={auctionId} minBid={auction.minBid} minDeposit={auction.minDeposit} onSuccess={onAfterTx} />
      </>
    );
  }

  // REVEAL (or commit ended, awaiting reveal first action)
  if (phase === Phase.Reveal) {
    if (!hasBid) {
      return <SellerNotice msg="Reveal phase active. You did not commit a bid." />;
    }
    if (bidRevealed) {
      return (
        <div className="text-center py-2">
          <h3 className="font-bold mb-1">Bid revealed.</h3>
          <p className="text-muted text-sm">Awaiting reveal-phase end and finalization.</p>
        </div>
      );
    }
    return (
      <>
        <h3 className="text-lg font-bold mb-1">Reveal Phase</h3>
        <p className="text-muted text-sm mb-4">Disclose your bid amount and secret to participate in the final ranking.</p>
        <BidRevealForm auctionId={auctionId} onSuccess={onAfterTx} />
      </>
    );
  }

  // POST-REVEAL, AWAITING FINALIZE
  return (
    <div className="text-center py-2">
      <Gavel className="w-10 h-10 mx-auto text-accent mb-2" />
      <h3 className="text-lg font-bold mb-1">Reveal window closed</h3>
      <p className="text-muted text-sm mb-4">Anyone can finalize the auction now.</p>
      <button
        className="btn-primary"
        disabled={finalizing || finWaiting}
        onClick={async () => {
          try {
            await finalize(auctionId);
            onAfterTx();
          } catch (e: any) {
            toast.error(e?.shortMessage || "Finalize failed");
          }
        }}
      >
        {finalizing || finWaiting ? "Finalizing…" : "Finalize Auction"}
      </button>
    </div>
  );
}

function SellerNotice({ msg }: { msg: string }) {
  return <div className="text-center py-4 text-muted text-sm">{msg}</div>;
}

function ClaimUI({ auctionId, onAfterTx }: { auctionId: bigint; onAfterTx: () => void }) {
  const { claim, isPending, isLoading } = useClaimRefund();
  return (
    <div className="text-center py-2">
      <h3 className="font-bold mb-1">Claim your refund</h3>
      <p className="text-muted text-sm mb-4">You revealed but didn't win. Claim your full deposit back.</p>
      <button
        className="btn-primary"
        disabled={isPending || isLoading}
        onClick={async () => {
          try {
            await claim(auctionId);
            onAfterTx();
          } catch (e: any) {
            toast.error(e?.shortMessage || "Claim failed");
          }
        }}
      >
        {isPending || isLoading ? "Claiming…" : "Claim Refund"}
      </button>
    </div>
  );
}

function RefundDetail({ auctionId }: { auctionId: bigint }) {
  const { address } = useAccount();
  const { bid } = useBid(auctionId, address);
  const { auction } = useAuction(auctionId);
  if (!bid || !auction) return null;
  if (bid.refunded) return null;
  const refund = bid.deposit - auction.secondBid;
  return (
    <div className="mt-3 text-xs text-muted">
      Estimated refund: <span className="font-mono text-white">{fmtEth(refund)} ETH</span>
    </div>
  );
}

function FinalizedSummary({ auction }: { auction: any }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm uppercase tracking-widest text-muted mb-3">Final result</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Winner" value={shortAddr(auction.highestBidder)} mono />
        <Field label="Winning price (Vickrey)" value={`${fmtEth(auction.secondBid)} ETH`} mono />
        <Field label="Highest revealed bid" value={`${fmtEth(auction.highestBid)} ETH`} mono />
        <Field label="Seller" value={shortAddr(auction.seller)} mono />
      </div>
      <a
        href={`https://sepolia.etherscan.io/address/${import.meta.env.VITE_CONTRACT_ADDRESS}`}
        target="_blank"
        rel="noreferrer"
        className="mt-4 text-xs text-accent flex items-center gap-1 hover:underline"
      >
        View contract on Etherscan <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
