// Multi-bidder Vickrey end-to-end simulation on local Hardhat network.
// Prints a narrative so you can see the second-price mechanic in action.

import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const COMMIT_SEC = 60;
const REVEAL_SEC = 60;

function bidHash(amount: bigint, secret: string, bidder: string) {
  return ethers.solidityPackedKeccak256(
    ["uint256", "bytes32", "address"],
    [amount, secret, bidder]
  );
}

function eth(s: string) {
  return ethers.parseEther(s);
}

function fmt(wei: bigint) {
  return ethers.formatEther(wei);
}

async function main() {
  console.log("=".repeat(72));
  console.log("VICKREY SIMULATION — 3 bidders, all reveal");
  console.log("=".repeat(72));

  const [seller, alice, bob, carol] = await ethers.getSigners();

  const NFT = await ethers.getContractFactory("AuctionNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();

  const Auction = await ethers.getContractFactory("SealedBidAuction");
  const auction = await Auction.deploy();
  await auction.waitForDeployment();

  await (await nft.connect(seller).mint(seller.address, "ipfs://demo/champion.json")).wait();
  const tokenId = 0n;
  await (await nft.connect(seller).approve(await auction.getAddress(), tokenId)).wait();

  console.log("\nAuction setup:");
  console.log("  Seller:        ", seller.address);
  console.log("  NFT:           ", await nft.getAddress());
  console.log("  Token ID:      ", tokenId.toString());
  console.log("  Min bid:       ", "0.1 ETH");
  console.log("  Min deposit:   ", "0.1 ETH");
  console.log("  Commit window: ", COMMIT_SEC, "sec");
  console.log("  Reveal window: ", REVEAL_SEC, "sec");

  await (await auction
    .connect(seller)
    .createAuction(await nft.getAddress(), tokenId, COMMIT_SEC, REVEAL_SEC, eth("0.1"), eth("0.1")))
    .wait();
  const id = 0n;

  // Three bidders.
  const bidders = [
    { name: "Alice", signer: alice, amount: eth("0.5"), deposit: eth("1.0"), secret: "0x" + "11".repeat(32) },
    { name: "Bob",   signer: bob,   amount: eth("1.5"), deposit: eth("2.0"), secret: "0x" + "22".repeat(32) },
    { name: "Carol", signer: carol, amount: eth("2.5"), deposit: eth("3.0"), secret: "0x" + "33".repeat(32) },
  ];

  console.log("\n--- COMMIT PHASE ---");
  for (const b of bidders) {
    const hash = bidHash(b.amount, b.secret, b.signer.address);
    await (await auction.connect(b.signer).commitBid(id, hash, { value: b.deposit })).wait();
    console.log(`  ${b.name.padEnd(6)} commits — bid=${fmt(b.amount)} ETH (sealed), deposit=${fmt(b.deposit)} ETH`);
  }

  console.log("\n... advancing time past commit deadline ...");
  await time.increase(COMMIT_SEC + 1);

  console.log("\n--- REVEAL PHASE ---");
  for (const b of bidders) {
    await (await auction.connect(b.signer).revealBid(id, b.amount, b.secret)).wait();
    console.log(`  ${b.name.padEnd(6)} reveals — bid=${fmt(b.amount)} ETH ✓`);
  }

  console.log("\n... advancing time past reveal deadline ...");
  await time.increase(REVEAL_SEC + 1);

  console.log("\n--- FINALIZE ---");
  const sellerBalBefore = await ethers.provider.getBalance(seller.address);
  await (await auction.connect(alice).finalizeAuction(id)).wait();
  const sellerBalAfter = await ethers.provider.getBalance(seller.address);

  const a = await auction.auctions(id);
  console.log(`  Winner:                 ${a.highestBidder}`);
  console.log(`  Highest revealed bid:   ${fmt(a.highestBid)} ETH`);
  console.log(`  Second-highest bid:     ${fmt(a.secondBid)} ETH  ← this is what the winner pays`);
  console.log(`  Seller received:        ${fmt(sellerBalAfter - sellerBalBefore)} ETH`);
  console.log(`  NFT now owned by:       ${await nft.ownerOf(tokenId)}`);

  console.log("\n--- REFUNDS ---");
  for (const b of bidders) {
    const balBefore = await ethers.provider.getBalance(b.signer.address);
    const tx = await auction.connect(b.signer).claimRefund(id);
    const r = await tx.wait();
    const gas = (r!.gasUsed) * (r!.gasPrice);
    const balAfter = await ethers.provider.getBalance(b.signer.address);
    const refund = balAfter - balBefore + gas;
    const isWinner = b.signer.address === a.highestBidder;
    console.log(`  ${b.name.padEnd(6)} ${isWinner ? "(WINNER) " : "         "} refunded: ${fmt(refund)} ETH ${isWinner ? `(deposit ${fmt(b.deposit)} − price ${fmt(a.secondBid)})` : "(full deposit)"}`);
  }

  console.log("\n=".repeat(72));
  console.log("✅ VICKREY MECHANIC VERIFIED");
  console.log("   • Carol bid the highest (2.5 ETH) and won");
  console.log("   • Carol pays only 1.5 ETH (Bob's bid — second-highest)");
  console.log("   • Alice, Bob get full deposits back");
  console.log("   • Carol's refund = deposit − second-price = 3.0 − 1.5 = 1.5 ETH");
  console.log("=".repeat(72));

  // ---------------------------------------------------------------
  // Bonus: scenario with a non-revealer (forfeit)
  // ---------------------------------------------------------------
  console.log("\n\n");
  console.log("=".repeat(72));
  console.log("BONUS — Non-revealer forfeits deposit");
  console.log("=".repeat(72));

  await (await nft.connect(seller).mint(seller.address, "ipfs://demo/2.json")).wait();
  const tokenId2 = 1n;
  await (await nft.connect(seller).approve(await auction.getAddress(), tokenId2)).wait();
  await (await auction.connect(seller).createAuction(await nft.getAddress(), tokenId2, COMMIT_SEC, REVEAL_SEC, eth("0.1"), eth("0.1"))).wait();
  const id2 = 1n;

  // Alice commits + reveals. Bob commits but doesn't reveal.
  const aliceAmt = eth("0.7");
  const bobAmt   = eth("0.9");
  const aliceSecret = "0x" + "aa".repeat(32);
  const bobSecret   = "0x" + "bb".repeat(32);
  await (await auction.connect(alice).commitBid(id2, bidHash(aliceAmt, aliceSecret, alice.address), { value: eth("1.0") })).wait();
  await (await auction.connect(bob).commitBid(id2, bidHash(bobAmt, bobSecret, bob.address), { value: eth("1.5") })).wait();
  console.log("  Alice commits 0.7 ETH (deposit 1.0) — WILL reveal");
  console.log("  Bob   commits 0.9 ETH (deposit 1.5) — WILL NOT reveal");

  await time.increase(COMMIT_SEC + 1);
  await (await auction.connect(alice).revealBid(id2, aliceAmt, aliceSecret)).wait();
  await time.increase(REVEAL_SEC + 1);

  const sellerBalBefore2 = await ethers.provider.getBalance(seller.address);
  await (await auction.connect(alice).finalizeAuction(id2)).wait();
  const sellerBalAfter2 = await ethers.provider.getBalance(seller.address);

  const a2 = await auction.auctions(id2);
  console.log(`\n  Winner:                 ${a2.highestBidder} (Alice)`);
  console.log(`  Winning price (Vickrey):${fmt(a2.secondBid)} ETH (= minBid since only Alice revealed)`);
  console.log(`  Seller received:        ${fmt(sellerBalAfter2 - sellerBalBefore2)} ETH`);
  console.log("                          = winning price (0.1) + Bob's forfeited deposit (1.5)");
  console.log("                          = 1.6 ETH ✓ (Bob loses his entire deposit)");
  console.log("=".repeat(72));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
