# Deploying DECRYPTO frontend to Vercel

## Prerequisites
- A free Vercel account: https://vercel.com/signup (sign in with GitHub for easiest flow)
- Your Sepolia contracts already deployed (we did this — see addresses below)

## One-time deploy (5 minutes)

```bash
cd client
vercel login          # opens browser → authorize
vercel                # answers below
```

When `vercel` prompts you:

| Prompt | Answer |
|---|---|
| Set up and deploy? | **Y** |
| Which scope? | (your personal account) |
| Link to existing project? | **N** |
| Project name? | `decrypto` (or anything) |
| In which directory is your code located? | `./` (just press Enter) |
| Want to override settings? | **N** (Vite is auto-detected) |

It builds and deploys to a preview URL like `https://decrypto-xxxx.vercel.app`. **Important:** the env vars aren't set yet, so the page won't talk to Sepolia. Set them now (one-time):

## Set environment variables in Vercel

In your terminal:

```bash
vercel env add VITE_CONTRACT_ADDRESS production
# paste:  0xb8af3A303a5FbDFeeee34FA4103DB27Ad072F1B1

vercel env add VITE_NFT_ADDRESS production
# paste:  0x7b88d3C8566c7aE8A22C13923b1dcF1c330F107A

vercel env add VITE_CHAIN_ID production
# paste:  11155111

vercel env add VITE_ALCHEMY_KEY production
# paste:  4DBsFIGPAwA6U-Df2-sQo

vercel env add VITE_WC_PROJECT_ID production
# paste:  fallback_project_id
```

Or via the dashboard: https://vercel.com/dashboard → your project → Settings → Environment Variables.

## Promote to production

```bash
vercel --prod
```

Now the live URL works fully — connect MetaMask, browse auctions, bid, the whole thing.

## After-deploy checks

1. Open the URL in an incognito window.
2. Click "Connect to enter".
3. Connect MetaMask, switch to Sepolia.
4. You should land on either `/admin` (if you're admin) or `/auctions` (bidder).
5. Live stats banner shows on-chain numbers.
6. Hard-refresh on `/auctions/0` should load the auction (not 404 — that's why we ship `vercel.json` rewrites).

## Updating later

Any subsequent `vercel --prod` from `client/` redeploys.

## If you'd rather use the dashboard (no CLI)

1. Push the project to GitHub (`git init && git add . && git commit && gh repo create` or any path).
2. https://vercel.com/new → Import the repo.
3. **Root Directory: `client`** (this is critical — the project has both `client/` and `contracts/`).
4. Add the 5 env vars under Settings → Environment Variables (same list as above).
5. Click Deploy.

## Common gotchas

- **404 on hard-refresh of subroutes** → the `vercel.json` ships SPA rewrites; if a deploy missed it, redeploy.
- **MetaMask popup never opens on the deployed site** → some content blockers break injected wallets on https. Try Brave's MetaMask extension, or disable shields.
- **"Network mismatch"** → make sure MetaMask is on Sepolia, not Mainnet. The chip in the header turns red and offers a switch button.
- **`getBlockNumber` 429s** → Alchemy rate limited. The free tier allows 100 RPS — fine for hackathon judges. If you'd rather be safe, create a second Alchemy app for the production deploy and use that key.
