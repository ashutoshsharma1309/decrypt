// Mints 5 NFTs with rich on-chain SVG artwork.
// Each tokenURI is a data: URI containing JSON metadata, whose image field is
// itself a data: URI containing inline SVG. No IPFS, no dead links.

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

type Design = {
  name: string;
  description: string;
  rarity: string;
  bg: { c1: string; c2: string; c3: string };
  accent: string;
  glyph: "lock" | "diamond" | "shield" | "cipher" | "champion";
};

const DESIGNS: Design[] = [
  {
    name: "Nebula Lock",
    description: "A cosmic vault drifting through interstellar dust. The first sealed-bid champion.",
    rarity: "Legendary",
    bg: { c1: "#a855f7", c2: "#22d3ee", c3: "#0a0a0a" },
    accent: "#fafafa",
    glyph: "lock",
  },
  {
    name: "Crimson Vault",
    description: "Forged in scarlet code. Holders are said to bid with conviction.",
    rarity: "Rare",
    bg: { c1: "#ef4444", c2: "#f97316", c3: "#0a0a0a" },
    accent: "#fafafa",
    glyph: "diamond",
  },
  {
    name: "Emerald Cipher",
    description: "An encrypted relic. Reveal it during the second moon to claim its power.",
    rarity: "Epic",
    bg: { c1: "#22c55e", c2: "#eab308", c3: "#0a0a0a" },
    accent: "#0a0a0a",
    glyph: "cipher",
  },
  {
    name: "Phantom Sigil",
    description: "A spectral mark. Said to appear only when the highest bidder loses by one wei.",
    rarity: "Mythic",
    bg: { c1: "#e5e7eb", c2: "#a855f7", c3: "#0a0a0a" },
    accent: "#0a0a0a",
    glyph: "shield",
  },
  {
    name: "Holographic Champion",
    description: "Shimmers between bands of hidden light. The crown jewel of the marketplace.",
    rarity: "Mythic",
    bg: { c1: "#22d3ee", c2: "#a855f7", c3: "#ec4899" },
    accent: "#fafafa",
    glyph: "champion",
  },
];

function glyphPath(g: Design["glyph"]) {
  switch (g) {
    case "lock":
      return `<g><rect x="380" y="430" width="264" height="220" rx="28" fill="rgba(255,255,255,0.95)"/><path d="M438 430 v-90 a74 74 0 0 1 148 0 v90" stroke="rgba(255,255,255,0.95)" stroke-width="32" fill="none" stroke-linecap="round"/><circle cx="512" cy="540" r="22" fill="#0a0a0a"/></g>`;
    case "diamond":
      return `<g><path d="M512 320 L660 480 L512 700 L364 480 Z" fill="rgba(255,255,255,0.92)"/><path d="M512 320 L660 480 L512 480 Z" fill="rgba(255,255,255,0.6)"/><path d="M512 320 L364 480 L512 480 Z" fill="rgba(255,255,255,0.78)"/></g>`;
    case "shield":
      return `<g><path d="M512 320 L660 380 V520 Q660 640 512 700 Q364 640 364 520 V380 Z" fill="rgba(255,255,255,0.92)"/><path d="M460 480 l40 50 l84 -110" stroke="#0a0a0a" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    case "cipher":
      return `<g font-family="JetBrains Mono, monospace" font-weight="800" fill="rgba(255,255,255,0.95)" text-anchor="middle"><text x="512" y="490" font-size="160">{ }</text><text x="512" y="610" font-size="46" letter-spacing="14">SEALED</text></g>`;
    case "champion":
      return `<g><path d="M380 380 h264 l-32 200 q-100 60 -200 0 Z" fill="rgba(255,255,255,0.95)"/><rect x="476" y="610" width="72" height="60" fill="rgba(255,255,255,0.95)"/><rect x="412" y="660" width="200" height="32" rx="8" fill="rgba(255,255,255,0.95)"/><circle cx="380" cy="430" r="44" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="22"/><circle cx="644" cy="430" r="44" fill="none" stroke="rgba(255,255,255,0.95)" stroke-width="22"/></g>`;
  }
}

function makeSvg(d: Design, tokenId: number) {
  const id = `g${tokenId}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="${id}-bg" cx="30%" cy="20%" r="100%">
      <stop offset="0%" stop-color="${d.bg.c1}" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="${d.bg.c2}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${d.bg.c3}"/>
    </radialGradient>
    <linearGradient id="${id}-shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="rgba(255,255,255,0.3)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <pattern id="${id}-grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1024" height="1024" fill="url(#${id}-bg)"/>
  <rect width="1024" height="1024" fill="url(#${id}-grid)"/>
  <rect width="1024" height="1024" fill="url(#${id}-shine)" opacity="0.5"/>
  <circle cx="820" cy="200" r="180" fill="${d.bg.c1}" opacity="0.2"/>
  <circle cx="200" cy="850" r="220" fill="${d.bg.c2}" opacity="0.18"/>
  ${glyphPath(d.glyph)}
  <g font-family="Inter, system-ui, sans-serif" fill="${d.accent}">
    <text x="64" y="100" font-size="22" letter-spacing="6" font-weight="600" opacity="0.85">DECRYPTO</text>
    <text x="64" y="138" font-size="14" letter-spacing="4" opacity="0.6">VICKREY · SEALED-BID</text>
    <text x="960" y="100" text-anchor="end" font-size="22" font-weight="700" opacity="0.95">#${tokenId}</text>
    <text x="960" y="138" text-anchor="end" font-size="14" letter-spacing="3" opacity="0.6">${d.rarity.toUpperCase()}</text>
    <text x="64" y="940" font-size="56" font-weight="800">${d.name}</text>
    <text x="64" y="980" font-size="18" opacity="0.7">Sealed bids. Second-price wins.</text>
  </g>
</svg>`;
}

function makeMetadata(d: Design, tokenId: number) {
  const svg = makeSvg(d, tokenId);
  const imageDataUri = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
  const json = {
    name: `DECRYPTO · ${d.name} #${tokenId}`,
    description: d.description,
    image: imageDataUri,
    attributes: [
      { trait_type: "Rarity", value: d.rarity },
      { trait_type: "Glyph", value: d.glyph },
      { trait_type: "Series", value: "Genesis" },
    ],
  };
  return "data:application/json;base64," + Buffer.from(JSON.stringify(json)).toString("base64");
}

async function main() {
  const NFT_ADDR = process.env.NFT_ADDRESS || readNftFromClientEnv();
  if (!NFT_ADDR) throw new Error("NFT_ADDRESS not provided");

  const [signer] = await ethers.getSigners();
  const nft = await ethers.getContractAt("AuctionNFT", NFT_ADDR);

  const owner = await nft.owner();
  console.log("NFT contract owner:", owner);
  console.log("This signer:       ", signer.address);
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    throw new Error(`Refusing to mint: this signer is not the NFT contract owner`);
  }

  const startTokenId = Number(await nft.totalMinted());
  console.log(`Existing minted: ${startTokenId}`);
  console.log(`Will mint ${DESIGNS.length} new tokens (ids ${startTokenId}..${startTokenId + DESIGNS.length - 1})`);

  for (let i = 0; i < DESIGNS.length; i++) {
    const tokenId = startTokenId + i;
    const uri = makeMetadata(DESIGNS[i], tokenId);
    console.log(`\n[${i + 1}/${DESIGNS.length}] Minting "${DESIGNS[i].name}" (#${tokenId}) — ${uri.length} bytes`);
    const tx = await nft.mint(signer.address, uri);
    const r = await tx.wait();
    console.log(`   tx: ${r?.hash}`);
  }

  console.log("\n✅ Done. Refresh the NFT manager page to see them.");
}

function readNftFromClientEnv(): string | undefined {
  try {
    const p = path.resolve(__dirname, "..", "..", "client", ".env.local");
    const txt = fs.readFileSync(p, "utf8");
    const m = txt.match(/^VITE_NFT_ADDRESS=(0x[a-fA-F0-9]{40})/m);
    return m?.[1];
  } catch {
    return undefined;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
