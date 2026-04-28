import { useAccount, useReadContract } from "wagmi";
import { auctionContract, AUCTION_ADDRESS } from "../lib/contracts";
import { isZeroAddr } from "../lib/format";

export type Role = "guest" | "admin" | "bidder";

export type UserRoleState = {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isCheckingRole: boolean;
  isAdmin: boolean;
  isBidder: boolean;
  role: Role;
  contractDeployed: boolean;
};

/**
 * Wallet === identity. Reads `isAdmin(address)` from the auction contract.
 * - Guest: not connected.
 * - Admin: connected AND on-chain isAdmin() returns true.
 * - Bidder: connected, not admin.
 *
 * If the contract address is the zero address (not yet deployed), we still return
 * the connection state but flag `contractDeployed=false` so UIs can show a banner.
 */
export function useUserRole(): UserRoleState {
  const { address, isConnected, isConnecting } = useAccount();
  const contractDeployed = !isZeroAddr(AUCTION_ADDRESS);

  const { data: isAdminData, isLoading: isCheckingRole } = useReadContract({
    ...auctionContract,
    functionName: "isAdmin",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && contractDeployed,
      refetchInterval: 15_000,
    },
  });

  const isAdmin = !!isAdminData;

  return {
    address,
    isConnected,
    isConnecting,
    isCheckingRole: !!address && contractDeployed && isCheckingRole,
    isAdmin,
    isBidder: isConnected && !isAdmin,
    role: !isConnected ? "guest" : isAdmin ? "admin" : "bidder",
    contractDeployed,
  };
}
