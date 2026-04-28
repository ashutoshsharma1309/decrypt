import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Wifi, WifiOff } from "lucide-react";

export function NetworkChip() {
  const { chain, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  if (!isConnected) return null;
  const ok = chain?.id === sepolia.id;

  if (ok) {
    return (
      <span className="chip border-success/40 bg-success/10 text-success">
        <Wifi className="w-3 h-3" />
        Sepolia
      </span>
    );
  }
  return (
    <button
      onClick={() => switchChain({ chainId: sepolia.id })}
      className="chip border-danger/50 bg-danger/10 text-danger hover:bg-danger/20"
      title="Click to switch to Sepolia"
    >
      <WifiOff className="w-3 h-3" />
      Wrong network
    </button>
  );
}
