import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { parseEther, formatEther, type Hex } from "viem";
import { toast } from "sonner";
import { Eye, Upload, KeyRound } from "lucide-react";
import { useRevealBid } from "../hooks/useAuctionActions";
import { useSecretsStore } from "../stores/secretsStore";

export function BidRevealForm({ auctionId, onSuccess }: { auctionId: bigint; onSuccess?: () => void }) {
  const { address } = useAccount();
  const { reveal, isPending, isLoading } = useRevealBid();
  const getSecret = useSecretsStore((s) => s.getSecret);

  const saved = address ? getSecret(Number(auctionId), address) : undefined;
  const [amountStr, setAmountStr] = useState("");
  const [secret, setSecret] = useState("");

  useEffect(() => {
    if (saved) {
      setAmountStr(formatEther(BigInt(saved.amount)));
      setSecret(saved.secret);
    }
  }, [saved?.txHash]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.amount) setAmountStr(formatEther(BigInt(data.amount)));
      if (data.secret) setSecret(data.secret);
      toast.success("Secret loaded from file");
    } catch {
      toast.error("Invalid secret file");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) {
      toast.error("Connect wallet first");
      return;
    }
    let amount: bigint;
    try {
      amount = parseEther(amountStr);
    } catch {
      toast.error("Invalid amount");
      return;
    }
    const secretHex = (secret.startsWith("0x") ? secret : `0x${secret}`) as Hex;
    if (!/^0x[0-9a-fA-F]{64}$/.test(secretHex)) {
      toast.error("Secret must be 32-byte hex (0x + 64 chars)");
      return;
    }

    try {
      await reveal(auctionId, amount, secretHex);
      toast.success("Bid revealed!");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.shortMessage || err?.message || "Reveal failed");
    }
  }

  const busy = isPending || isLoading;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {saved ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Auto-loaded saved secret for this auction. Click reveal to confirm.
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card/50 p-3 text-xs text-muted">
          No saved secret found in this browser. Paste your secret + amount, or upload your JSON backup.
        </div>
      )}

      <div>
        <label className="label">Bid amount (ETH)</label>
        <input
          className="input font-mono"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="0.0"
          required
        />
      </div>

      <div>
        <label className="label">Secret (0x + 64 hex chars)</label>
        <input
          className="input font-mono text-xs"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="0x..."
          required
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary flex-1 py-3">
          {busy ? (
            <>
              <KeyRound className="w-4 h-4 animate-pulse" /> Revealing…
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" /> Reveal Bid
            </>
          )}
        </button>
        <label className="btn-secondary cursor-pointer">
          <Upload className="w-4 h-4" />
          <span>Upload</span>
          <input type="file" accept="application/json" className="hidden" onChange={onFile} />
        </label>
      </div>
    </form>
  );
}
