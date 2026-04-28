# DECRYPTO · Sealed-Bid Vickrey Auctions

Production-quality dApp implementing **Vickrey (sealed-bid second-price) auctions** for ERC-721 NFTs on Ethereum Sepolia.

> Highest bidder wins, **pays only what the second-highest bid was** — making truthful bidding the dominant strategy.

## How it works

1. **Commit phase** — Bidders submit `keccak256(amount, secret, bidder)` + an ETH deposit. Bid stays hidden.
2. **Reveal phase** — Bidders disclose `(amount, secret)`. Contract verifies the hash and ranks revealed bids.
3. **Finalize** — Anyone can call. Winner gets the NFT. Seller receives the **second-highest** revealed bid (or `minBid` if only one revealer). Non-revealers' deposits forfeit to seller.
4. **Refunds** — Winner gets `deposit - secondBid`. Other revealers get full deposit back.

## Tech stack

**Smart contracts** — Solidity 0.8.24 (Cancun), Hardhat 2.22, OpenZeppelin 5, ethers v6, TypeScript.
**Frontend** — React 18 + Vite + TypeScript, wagmi v2, viem v2, RainbowKit v2, Tailwind v3, Zustand, sonner toasts, canvas-confetti.

## Project layout

```
sealed-bid-auction/
├── contracts/      # Hardhat workspace — Solidity, tests, deploy scripts
└── client/         # React + Vite frontend
```

## Deployed addresses

| Contract | Sepolia address |
|---|---|
| `AuctionNFT` | _filled in after deploy_ |
| `SealedBidAuction` | _filled in after deploy_ |

**Etherscan:** [AuctionNFT](https://sepolia.etherscan.io/) · [SealedBidAuction](https://sepolia.etherscan.io/)
**Live demo:** _filled in after Vercel deploy_

## Run locally

### Prereqs
- Node.js 20+ and pnpm
- A Sepolia-funded private key, an Alchemy/Infura Sepolia RPC URL, an Etherscan API key, and a WalletConnect project id.

### 1. Install
```bash
cd contracts && pnpm install
cd ../client   && pnpm install
```

### 2. Configure & test contracts
```bash
cd contracts
cp .env.example .env
# fill SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
pnpm compile
pnpm test          # 8 tests should pass
```

### 3. Deploy + verify
```bash
pnpm deploy:sepolia
# the script writes addresses into client/.env.local automatically.

npx hardhat verify --network sepolia <NFT_ADDRESS>
npx hardhat verify --network sepolia <AUCTION_ADDRESS>
```

### 4. Run the frontend
```bash
cd ../client
cp .env.example .env.local
# fill VITE_WC_PROJECT_ID and VITE_ALCHEMY_KEY (addresses already populated by deploy)
pnpm dev
# open http://localhost:5173
```

## Demo script (5 minute hackathon flow)

1. Wallet **A**: visit `/mint` → mint an NFT to A's address (or use one of the 5 demo NFTs deployed).
2. Wallet **A**: visit `/create` → approve NFT → create auction with **5 min commit / 5 min reveal**, min bid `0.001 ETH`, min deposit `0.001 ETH`.
3. Wallet **A** (different browser/profile): commit a bid of `0.005 ETH` with deposit `0.01 ETH`. JSON secret auto-downloads.
4. Wallet **B**: commit a bid of `0.01 ETH` with deposit `0.02 ETH`.
5. Wait for the commit countdown to elapse.
6. Both wallets click **Reveal** — secret auto-loads from local storage.
7. After reveal countdown elapses, anyone clicks **Finalize**.
8. Wallet **B** receives the NFT (visible in MetaMask NFT tab) and pays only `0.005 ETH` (second-highest).
9. Both wallets click **Claim Refund**:
   - Wallet **B** (winner): refund = `deposit - 0.005`.
   - Wallet **A**: full deposit back.

## Critical hash format

The bid hash is **sacred** — Solidity and frontend must produce the **identical** value:

```solidity
keccak256(abi.encodePacked(uint256 amount, bytes32 secret, address bidder))
```

```typescript
keccak256(encodePacked(['uint256', 'bytes32', 'address'], [amount, secret, bidder]))
```

A reference vector is logged on first import in `client/src/lib/crypto.ts`, and asserted in
`contracts/test/SealedBidAuction.test.ts` ("hash consistency").

## Architecture notes

- `commitBid` requires `msg.value >= minDeposit`, single-commit-per-bidder, no zero-hash.
- `revealBid` auto-advances Commit → Reveal at the boundary if no one has called yet.
- `finalizeAuction` forfeits non-revealer deposits to the seller in the same tx that pays out (loop is bounded by # of bidders).
- All ETH sends use `call{value:...}("")` and `nonReentrant` + checks-effects-interactions.
- `getCurrentPhase` view computes the live phase from `block.timestamp` so the UI doesn't depend on someone calling a state-mutating function first.

## License

MIT
