import { ethers } from "hardhat";

async function main() {
  const NFT = "0x7b88d3C8566c7aE8A22C13923b1dcF1c330F107A";
  const owner = "0xf78C0EB690518fD1A3711b30939db1C9bBC040C1";
  const nft = await ethers.getContractAt("AuctionNFT", NFT);
  const total = await nft.totalMinted();
  console.log("totalMinted:", total.toString());
  for (let i = 0; i < Number(total); i++) {
    try {
      const o = await nft.ownerOf(i);
      const bal = await nft.balanceOf(owner);
      console.log(`tokenId=${i}  owner=${o}  ${o.toLowerCase() === owner.toLowerCase() ? "(deployer)" : ""}`);
    } catch (e: any) {
      console.log(`tokenId=${i}  err: ${e.message}`);
    }
  }
  console.log("balance of deployer:", (await nft.balanceOf(owner)).toString());
}
main().catch((e) => { console.error(e); process.exit(1); });
