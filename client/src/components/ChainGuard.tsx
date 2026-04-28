import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { AlertTriangle } from "lucide-react";

export function ChainGuard() {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  if (!isConnected || !chain) return null;
  if (chain.id === sepolia.id) return null;
  return (
    <div className="bg-warning/10 border-b border-warning/30 text-warning">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Wrong network: <span className="font-semibold">{chain.name}</span>. DECRYPTO runs on Sepolia.
        </div>
        <button
          className="btn-secondary border-warning/40 text-warning hover:text-white hover:bg-warning/20"
          onClick={() => switchChain({ chainId: sepolia.id })}
          disabled={isPending}
        >
          {isPending ? "Switching…" : "Switch to Sepolia"}
        </button>
      </div>
    </div>
  );
}
