import { ethers } from "hardhat";

async function main() {
  const NFT_ADDR = process.env.NFT_ADDRESS;
  const TO = process.env.TO;
  const URI = process.env.TOKEN_URI || "ipfs://demo/x.json";
  if (!NFT_ADDR || !TO) {
    throw new Error("Set NFT_ADDRESS and TO env vars");
  }
  const nft = await ethers.getContractAt("AuctionNFT", NFT_ADDR);
  const tx = await nft.mint(TO, URI);
  const r = await tx.wait();
  console.log("minted, tx:", r?.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
