// Mints a batch of NFTs with image-less metadata so the React generator
// renders unique procedural art per tokenId. Each NFT gets a name + rarity
// drawn from a deterministic pool — keeps the metadata distinct without
// embedding an image (which would lock the look on-chain).

import { ethers } from "hardhat";

const NAMES = [
  "Vault Keeper", "Cipher Hound", "Sealed Sovereign", "Glitch Oracle",
  "Decrypted Saint", "Reveal Phantom", "Wei Whisperer", "Mempool Marauder",
  "Nonce Nomad", "Block Baron", "Gas Goblin", "Hash Hermit",
  "Bytecode Bandit", "Slot Sage", "Calldata Crusader", "Storage Sphinx",
  "Reentrancy Rogue", "Salted Specter", "Commit Commander", "Vickrey Vagabond",
];

const RARITIES = [
  { tier: "Common",     weight: 50 },
  { tier: "Uncommon",   weight: 25 },
  { tier: "Rare",       weight: 15 },
  { tier: "Epic",       weight: 7 },
  { tier: "Legendary",  weight: 3 },
];

function pickRarity(seed: number): string {
  const total = RARITIES.reduce((a, r) => a + r.weight, 0);
  let n = (seed * 2654435761) % total;
  if (n < 0) n += total;
  for (const r of RARITIES) {
    if (n < r.weight) return r.tier;
    n -= r.weight;
  }
  return "Common";
}

function buildMetadata(tokenId: number): string {
  const name = NAMES[tokenId % NAMES.length];
  const rarity = pickRarity(tokenId);
  const json = {
    name: `${name} #${tokenId}`,
    description: `A unique DECRYPTO Champion forged through sealed-bid combat. Tier: ${rarity}.`,
    attributes: [
      { trait_type: "Tier", value: rarity },
      { trait_type: "TokenId", value: tokenId },
      { trait_type: "Generation", value: "Genesis" },
    ],
  };
  // Image intentionally omitted so the dApp's procedural mascot generator
  // renders deterministic art per tokenId.
  return "data:application/json;base64," + Buffer.from(JSON.stringify(json)).toString("base64");
}

async function main() {
  const NFT_ADDR = process.env.NFT_ADDRESS || "0x7b88d3C8566c7aE8A22C13923b1dcF1c330F107A";
  const COUNT = Number(process.env.COUNT || "15");

  const [signer] = await ethers.getSigners();
  const nft = await ethers.getContractAt("AuctionNFT", NFT_ADDR, signer);

  const startId = Number(await nft.totalMinted());
  const balance = await ethers.provider.getBalance(signer.address);
  console.log(`\nDeployer:      ${signer.address}`);
  console.log(`Balance:       ${ethers.formatEther(balance)} ETH`);
  console.log(`NFT contract:  ${NFT_ADDR}`);
  console.log(`Already minted: ${startId}`);
  console.log(`Minting:       ${COUNT} new tokens (#${startId} → #${startId + COUNT - 1})\n`);

  for (let i = 0; i < COUNT; i++) {
    const id = startId + i;
    const uri = buildMetadata(id);
    const tx = await nft.mint(signer.address, uri);
    const r = await tx.wait();
    console.log(`  ✓ #${id}  ${NAMES[id % NAMES.length]}  (${pickRarity(id)})  tx: ${r?.hash.slice(0, 10)}…`);
  }

  const finalCount = Number(await nft.totalMinted());
  console.log(`\nDone. Total minted: ${finalCount}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
