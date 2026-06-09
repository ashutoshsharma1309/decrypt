#!/usr/bin/env bash
set -e

# DECRYPTO — one-shot Vercel deploy script.
# Run from anywhere. It handles login → link → env vars → production deploy.

REPO_ROOT="/Users/sangeetasinha/Desktop/decrypto"
CLIENT_DIR="$REPO_ROOT/client"

# Pre-filled values from your already-deployed Sepolia contracts.
VITE_CONTRACT_ADDRESS="0xb8af3A303a5FbDFeeee34FA4103DB27Ad072F1B1"
VITE_NFT_ADDRESS="0x7b88d3C8566c7aE8A22C13923b1dcF1c330F107A"
VITE_CHAIN_ID="11155111"
VITE_ALCHEMY_KEY="4DBsFIGPAwA6U-Df2-sQo"
VITE_WC_PROJECT_ID="fallback_project_id"

export PATH="/Users/sangeetasinha/.npm-global/bin:$PATH"

step() { printf "\n\033[1;35m▶ %s\033[0m\n" "$1"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$1"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$1"; }

cd "$CLIENT_DIR"

step "1/5 — Checking Vercel login"
if ! vercel whoami >/dev/null 2>&1; then
  warn "Not logged in. Opening browser for auth…"
  vercel login
fi
WHO=$(vercel whoami 2>/dev/null || echo "unknown")
ok "Logged in as: $WHO"

step "2/5 — Linking project (creates 'decrypto' if first time)"
# --yes auto-confirms all prompts, --project sets the name. Idempotent.
vercel link --yes --project decrypto || true
ok "Project linked"

step "3/5 — Setting environment variables (production)"
set_env() {
  local KEY="$1"; local VAL="$2"
  # Remove if exists, then add. `vercel env rm` is idempotent enough.
  vercel env rm "$KEY" production --yes >/dev/null 2>&1 || true
  printf "%s" "$VAL" | vercel env add "$KEY" production >/dev/null
  ok "  $KEY"
}
set_env VITE_CONTRACT_ADDRESS "$VITE_CONTRACT_ADDRESS"
set_env VITE_NFT_ADDRESS      "$VITE_NFT_ADDRESS"
set_env VITE_CHAIN_ID         "$VITE_CHAIN_ID"
set_env VITE_ALCHEMY_KEY      "$VITE_ALCHEMY_KEY"
set_env VITE_WC_PROJECT_ID    "$VITE_WC_PROJECT_ID"

step "4/5 — Building locally to verify no errors"
pnpm install --silent
pnpm build >/dev/null
ok "Build succeeded"

step "5/5 — Deploying to production"
URL=$(vercel --prod --yes 2>&1 | tee /dev/stderr | grep -Eo 'https://[^ ]*\.vercel\.app' | tail -1)

printf "\n\033[1;32m================================================================\033[0m\n"
printf "\033[1;32m🚀 DEPLOYMENT COMPLETE\033[0m\n"
printf "\033[1;32m================================================================\033[0m\n"
echo
echo "  Live URL:  $URL"
echo "  Auction:   https://sepolia.etherscan.io/address/$VITE_CONTRACT_ADDRESS"
echo "  NFT:       https://sepolia.etherscan.io/address/$VITE_NFT_ADDRESS"
echo
echo "Open the live URL in an incognito window, connect MetaMask, switch to Sepolia, test."
