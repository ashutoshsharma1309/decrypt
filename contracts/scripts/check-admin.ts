import { ethers } from "hardhat";

async function main() {
  const auctionAddr = "0xb8af3A303a5FbDFeeee34FA4103DB27Ad072F1B1";
  const deployerAddr = "0xf78C0EB690518fD1A3711b30939db1C9bBC040C1";
  const a = await ethers.getContractAt("SealedBidAuction", auctionAddr);
  console.log("contract:        ", auctionAddr);
  console.log("checking address:", deployerAddr);
  console.log("isAdmin:         ", await a.isAdmin(deployerAddr));
  console.log("adminCount:      ", (await a.adminCount()).toString());
  console.log("nextAuctionId:   ", (await a.nextAuctionId()).toString());
}
main().catch((e) => { console.error(e); process.exit(1); });
