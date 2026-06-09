import { ethers } from "hardhat";

async function main() {
  const NFT = "0x7b88d3C8566c7aE8A22C13923b1dcF1c330F107A";
  const AUCTION = "0xb8af3A303a5FbDFeeee34FA4103DB27Ad072F1B1";
  const nft = await ethers.getContractAt("AuctionNFT", NFT);
  const total = Number(await nft.totalMinted());
  console.log("\nNFT contract:", NFT);
  console.log("Auction contract:", AUCTION);
  console.log(`Total tokens minted: ${total}\n`);
  console.log("tokenId  owner                                       location");
  console.log("-------  ------------------------------------------  ------------------");
  for (let i = 0; i < total; i++) {
    try {
      const o = await nft.ownerOf(i);
      let label = "(other wallet)";
      if (o.toLowerCase() === AUCTION.toLowerCase()) label = "🔒 IN ACTIVE AUCTION (held by contract)";
      console.log(`#${i.toString().padEnd(6)}  ${o}  ${label}`);
    } catch (e: any) {
      console.log(`#${i.toString().padEnd(6)}  err: ${e.message}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
