import { encodePacked, keccak256, type Hex } from "viem";

/** Cryptographically random 32-byte secret as 0x-prefixed hex (bytes32). */
export function generateSecret(): Hex {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return ("0x" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")) as Hex;
}

/**
 * MUST mirror Solidity:
 *   keccak256(abi.encodePacked(uint256 amount, bytes32 secret, address bidder))
 *
 * Verified against Hardhat reference hash for amount=1.5e18, secret=0xab*32, bidder=0x70997970...:
 *   0x81e77b40557cde6347df3dc7dbbe3b2aa684112c1495b91513ad7c042a87c048
 */
export function computeBidHash(amount: bigint, secret: Hex, bidder: Hex): Hex {
  return keccak256(encodePacked(["uint256", "bytes32", "address"], [amount, secret, bidder]));
}

// Dev-time self-check: log on first import so we can eyeball the hash matches.
if (import.meta.env.DEV) {
  try {
    const refSecret = ("0x" + "ab".repeat(32)) as Hex;
    const refBidder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Hex;
    const refAmount = 1500000000000000000n; // 1.5 ETH
    // eslint-disable-next-line no-console
    console.log("[crypto] reference hash:", computeBidHash(refAmount, refSecret, refBidder));
  } catch {
    /* ignore */
  }
}
