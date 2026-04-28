import { AlertTriangle } from "lucide-react";

export function ContractMissingBanner() {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 mb-6 flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
      <div className="text-sm">
        <div className="font-bold text-warning mb-0.5">Contracts not deployed yet</div>
        <div className="text-warning/80 leading-relaxed">
          Deploy <code className="font-mono text-xs">SealedBidAuction</code> + <code className="font-mono text-xs">AuctionNFT</code> to Sepolia, then fill <code className="font-mono text-xs">VITE_CONTRACT_ADDRESS</code> and <code className="font-mono text-xs">VITE_NFT_ADDRESS</code> in <code className="font-mono text-xs">client/.env.local</code>. Restart the dev server to apply.
        </div>
      </div>
    </div>
  );
}
