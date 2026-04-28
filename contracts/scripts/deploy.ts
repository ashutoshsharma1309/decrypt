import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Demo NFT metadata. Replace tokenURIs with real IPFS metadata if you want polished imagery.
const DEMO_TOKEN_URIS = [
  "ipfs://bafkreih7uvqg6m6r5kpvzlz5xjkk7ngjxpyx7tnk6ki5h73a6oqnrqdgfm/1.json",
  "ipfs://bafkreih7uvqg6m6r5kpvzlz5xjkk7ngjxpyx7tnk6ki5h73a6oqnrqdgfm/2.json",
  "ipfs://bafkreih7uvqg6m6r5kpvzlz5xjkk7ngjxpyx7tnk6ki5h73a6oqnrqdgfm/3.json",
  "ipfs://bafkreih7uvqg6m6r5kpvzlz5xjkk7ngjxpyx7tnk6ki5h73a6oqnrqdgfm/4.json",
  "ipfs://bafkreih7uvqg6m6r5kpvzlz5xjkk7ngjxpyx7tnk6ki5h73a6oqnrqdgfm/5.json",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("===============================================");
  console.log("Deploying DECRYPTO contracts");
  console.log("Network: ", network.name, "(chainId:", network.chainId.toString(), ")");
  console.log("Deployer:", deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log("Balance: ", ethers.formatEther(bal), "ETH");
  console.log("===============================================\n");

  if (network.chainId !== 11155111n && network.chainId !== 31337n) {
    throw new Error(`Refusing to deploy: only Sepolia (11155111) or Hardhat (31337) allowed. Got: ${network.chainId}`);
  }

  // 1) AuctionNFT
  console.log("[1/3] Deploying AuctionNFT...");
  const NFT = await ethers.getContractFactory("AuctionNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("       AuctionNFT:        ", nftAddr);

  // 2) SealedBidAuction
  console.log("[2/3] Deploying SealedBidAuction...");
  const Auction = await ethers.getContractFactory("SealedBidAuction");
  const auction = await Auction.deploy();
  await auction.waitForDeployment();
  const auctionAddr = await auction.getAddress();
  console.log("       SealedBidAuction:  ", auctionAddr);

  // 3) Mint 5 demo NFTs to deployer
  console.log("[3/3] Minting 5 demo NFTs to deployer...");
  for (let i = 0; i < DEMO_TOKEN_URIS.length; i++) {
    const tx = await nft.mint(deployer.address, DEMO_TOKEN_URIS[i]);
    const r = await tx.wait();
    console.log(`       minted tokenId=${i}  tx=${r?.hash}`);
  }

  // 4) Persist deployed addresses to client/.env.local
  const repoRoot = path.resolve(__dirname, "..", "..");
  const envPath = path.join(repoRoot, "client", ".env.local");

  let env = "";
  if (fs.existsSync(envPath)) env = fs.readFileSync(envPath, "utf8");

  function upsert(key: string, value: string) {
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(env)) env = env.replace(re, `${key}=${value}`);
    else env += (env && !env.endsWith("\n") ? "\n" : "") + `${key}=${value}\n`;
  }

  upsert("VITE_CONTRACT_ADDRESS", auctionAddr);
  upsert("VITE_NFT_ADDRESS", nftAddr);
  upsert("VITE_CHAIN_ID", network.chainId.toString());

  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, env);
  console.log(`\nWrote contract addresses to: ${envPath}`);

  console.log("\n===============================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("===============================================");
  console.log("AuctionNFT:        ", nftAddr);
  console.log("SealedBidAuction:  ", auctionAddr);
  console.log("\nVerify on Etherscan:");
  console.log(`  npx hardhat verify --network sepolia ${nftAddr}`);
  console.log(`  npx hardhat verify --network sepolia ${auctionAddr}`);
  console.log("\nNext: cd ../client && pnpm dev");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
