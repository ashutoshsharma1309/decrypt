import { useState } from "react";
import { parseEther, formatEther, type Hex } from "viem";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Lock, Download, KeyRound, AlertTriangle, Zap } from "lucide-react";
import { computeBidHash, generateSecret } from "../lib/crypto";
import { useCommitBid } from "../hooks/useAuctionActions";
import { useSecretsStore } from "../stores/secretsStore";

export function BidCommitForm({
  auctionId,
  minBid,
  minDeposit,
  onSuccess,
}: {
  auctionId: bigint;
  minBid: bigint;
  minDeposit: bigint;
  onSuccess?: () => void;
}) {
  const { address } = useAccount();
  const { commit, isPending, isLoading, isSuccess } = useCommitBid();
  const saveSecret = useSecretsStore((s) => s.saveSecret);

  const [amountStr, setAmountStr] = useState("");
  const [depositStr, setDepositStr] = useState("");
  const [bumped, setBumped] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) {
      toast.error("Connect a wallet first");
      return;
    }

    let amount: bigint;
    let deposit: bigint;
    try {
      amount = parseEther(amountStr);
      deposit = parseEther(depositStr);
    } catch {
      toast.error("Invalid number");
      return;
    }

    if (amount < minBid) {
      toast.error(`Bid must be ≥ ${(Number(minBid) / 1e18).toString()} ETH (min bid)`);
      return;
    }
    if (deposit < minDeposit) {
      toast.error("Deposit too low");
      return;
    }
    if (deposit < amount) {
      toast.error("Deposit must be ≥ bid amount");
      return;
    }

    const secret = generateSecret();
    const sealedHash: Hex = computeBidHash(amount, secret, address as Hex);

    try {
      const txHash = await commit(auctionId, sealedHash, deposit);
      saveSecret({
        auctionId: Number(auctionId),
        bidder: address.toLowerCase(),
        amount: amount.toString(),
        secret,
        deposit: deposit.toString(),
        txHash,
        createdAt: Date.now(),
      });
      // Auto-download a JSON backup of the secret.
      downloadSecretBackup({ auctionId: Number(auctionId), bidder: address, amount: amount.toString(), secret, deposit: deposit.toString(), txHash });
      setBumped(true);
      toast.success("Bid committed! Secret saved locally.");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.shortMessage || err?.message || "Commit failed");
    }
  }

  const busy = isPending || isLoading;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <div className="text-xs text-warning/90 leading-relaxed">
          Your secret is auto-saved in this browser AND downloaded as a JSON file.
          You'll need it to reveal during the next phase.
          <strong className="block mt-1 text-warning">Do not lose it — your deposit forfeits if you can't reveal.</strong>
        </div>
      </div>

      {/* Quick-bid presets */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5 flex items-center gap-1.5">
          <Zap className="w-3 h-3" /> Quick-bid (auto-fills bid + deposit)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: `min · ${formatEther(minBid)} ETH`, mult: 1n },
            { label: `2× min`, mult: 2n },
            { label: `5× min`, mult: 5n },
            { label: `10× min`, mult: 10n },
          ].map((p) => {
            const amount = minBid * p.mult;
            const deposit = amount + amount / 5n; // 1.2× as a 20% buffer
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setAmountStr(formatEther(amount));
                  setDepositStr(formatEther(deposit));
                }}
                className="chip border-border bg-card/40 text-muted hover:text-white hover:border-accent/40 transition-colors"
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Bid amount (ETH)</label>
          <input
            className="input font-mono"
            placeholder="0.0"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Deposit (ETH) ≥ bid</label>
          <input
            className="input font-mono"
            placeholder="0.0"
            inputMode="decimal"
            value={depositStr}
            onChange={(e) => setDepositStr(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="text-[11px] text-muted leading-relaxed">
        Why a deposit? Your bid is hashed and hidden until reveal. The deposit caps your bid (you can't reveal more than you deposited)
        and forfeits to the seller if you don't reveal in time. Excess returns to you on claim.
      </div>

      <button type="submit" disabled={busy} className="btn-primary w-full text-base py-3">
        {busy ? (
          <>
            <KeyRound className="w-4 h-4 animate-pulse" />
            Sealing bid…
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Commit Sealed Bid
          </>
        )}
      </button>

      {isSuccess && bumped && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success flex items-center gap-2">
          <Download className="w-4 h-4" />
          Secret saved locally + downloaded. Come back during the reveal phase.
        </div>
      )}
    </form>
  );
}

function downloadSecretBackup(d: { auctionId: number; bidder: string; amount: string; secret: string; deposit: string; txHash: string }) {
  const content = JSON.stringify({ ...d, network: "sepolia", note: "DECRYPTO bid secret — needed during reveal phase. Keep private." }, null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `decrypto-secret-auction-${d.auctionId}-${d.bidder.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
