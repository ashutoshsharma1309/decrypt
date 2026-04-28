import { connectorsForWallets, getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  injectedWallet,
  coinbaseWallet,
  braveWallet,
  rainbowWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { sepolia } from "wagmi/chains";
import { createConfig, http } from "wagmi";

const projectId = (import.meta.env.VITE_WC_PROJECT_ID || "").trim();
const alchemyKey = (import.meta.env.VITE_ALCHEMY_KEY || "").trim();

const transport = http(
  alchemyKey
    ? `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`
    : "https://rpc.sepolia.org"
);

const hasRealProjectId = projectId.length >= 16 && projectId !== "fallback_project_id";

// With a real WalletConnect projectId we use the full default config (adds WC + many wallets).
// Without one we still register MetaMask, injected, Coinbase, Brave, and Rainbow with RainbowKit
// so the "Connect a Wallet" modal shows real options instead of being empty.
function buildConfig() {
  if (hasRealProjectId) {
    return getDefaultConfig({
      appName: "DECRYPTO · Sealed-Bid Auctions",
      projectId,
      chains: [sepolia],
      transports: { [sepolia.id]: transport },
      ssr: false,
    });
  }

  const connectors = connectorsForWallets(
    [
      {
        groupName: "Popular",
        wallets: [metaMaskWallet, injectedWallet, coinbaseWallet, braveWallet, rainbowWallet],
      },
    ],
    {
      appName: "DECRYPTO · Sealed-Bid Auctions",
      // RainbowKit requires a non-empty string here; only used by WalletConnect-based wallets,
      // none of which are in our list above, so this value is never sent anywhere.
      projectId: "decrypto-no-wc",
    }
  );

  return createConfig({
    chains: [sepolia],
    connectors,
    transports: { [sepolia.id]: transport },
    ssr: false,
  });
}

export const wagmiConfig = buildConfig();
