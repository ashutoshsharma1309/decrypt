import { ethers } from "hardhat";

// Creates a short-duration demo auction so you can run a full commit/reveal/finalize
// in a few minutes during a hackathon demo. Reads addresses from env.
//
// Required env:
//   AUCTION_ADDRESS, NFT_ADDRESS, TOKEN_ID
// Optional env:
//   COMMIT_MIN (default 5), REVEAL_MIN (default 5), MIN_BID_ETH (default 0.001), MIN_DEPOSIT_ETH (default 0.001)

async function main() {
  const AUCTION = process.env.AUCTION_ADDRESS;
  const NFT = process.env.NFT_ADDRESS;
  const TOKEN_ID = process.env.TOKEN_ID;
  if (!AUCTION || !NFT || TOKEN_ID === undefined) {
    throw new Error("Set AUCTION_ADDRESS, NFT_ADDRESS, TOKEN_ID env vars");
  }

  const commitMin = Number(process.env.COMMIT_MIN ?? "5");
  const revealMin = Number(process.env.REVEAL_MIN ?? "5");
  const minBid = ethers.parseEther(process.env.MIN_BID_ETH ?? "0.001");
  const minDeposit = ethers.parseEther(process.env.MIN_DEPOSIT_ETH ?? "0.001");

  const nft = await ethers.getContractAt("AuctionNFT", NFT);
  const auction = await ethers.getContractAt("SealedBidAuction", AUCTION);

  console.log(`Approving NFT ${TOKEN_ID} to auction ${AUCTION}...`);
  await (await nft.approve(AUCTION, TOKEN_ID)).wait();

  console.log("Creating demo auction...");
  const tx = await auction.createAuction(NFT, TOKEN_ID, commitMin * 60, revealMin * 60, minBid, minDeposit);
  const r = await tx.wait();
  console.log("createAuction tx:", r?.hash);

  const id = (await auction.nextAuctionId()) - 1n;
  console.log("Demo auction id:", id.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
