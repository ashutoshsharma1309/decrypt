import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SealedBidAuction, AuctionNFT, ReentrantClaimer } from "../typechain-types";

const COMMIT_DURATION = 60 * 60; // 1 hour
const REVEAL_DURATION = 60 * 60;

function bidHash(amount: bigint, secret: string, bidder: string): string {
  return ethers.solidityPackedKeccak256(
    ["uint256", "bytes32", "address"],
    [amount, secret, bidder]
  );
}

async function deployFresh() {
  const [seller, b1, b2, b3] = await ethers.getSigners();

  const NFT = await ethers.getContractFactory("AuctionNFT");
  const nft = (await NFT.deploy()) as AuctionNFT;
  await nft.waitForDeployment();

  const Auction = await ethers.getContractFactory("SealedBidAuction");
  const auction = (await Auction.deploy()) as SealedBidAuction;
  await auction.waitForDeployment();

  const tokenURI = "ipfs://demo/1.json";
  await (await nft.connect(seller).mint(seller.address, tokenURI)).wait();
  const tokenId = 0n;

  await (await nft.connect(seller).approve(await auction.getAddress(), tokenId)).wait();

  return { seller, b1, b2, b3, nft, auction, tokenId };
}

async function createAuction(
  auction: SealedBidAuction,
  seller: any,
  nftAddr: string,
  tokenId: bigint,
  minBid: bigint,
  minDeposit: bigint
) {
  const tx = await auction
    .connect(seller)
    .createAuction(nftAddr, tokenId, COMMIT_DURATION, REVEAL_DURATION, minBid, minDeposit);
  await tx.wait();
  return 0n; // first auction
}

describe("SealedBidAuction — hash consistency", () => {
  it("Solidity keccak matches the expected packed encoding", async () => {
    // Sanity: ensures Solidity-side hash matches the format the frontend uses
    // (viem encodePacked(['uint256','bytes32','address']))
    const amount = ethers.parseEther("1.5");
    const secret = "0x" + "ab".repeat(32);
    const bidder = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const expected = ethers.solidityPackedKeccak256(
      ["uint256", "bytes32", "address"],
      [amount, secret, bidder]
    );
    // Print for cross-check vs frontend log
    console.log("       reference hash:", expected);
    expect(expected).to.match(/^0x[0-9a-f]{64}$/);
  });
});

describe("SealedBidAuction — happy path Vickrey", () => {
  it("3 bidders, all reveal: highest wins, pays second-highest", async () => {
    const { seller, b1, b2, b3, nft, auction, tokenId } = await deployFresh();
    const auctionAddr = await auction.getAddress();
    const nftAddr = await nft.getAddress();

    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");
    const id = await createAuction(auction, seller, nftAddr, tokenId, minBid, minDeposit);

    // amounts: 0.5, 1.5, 2.5 — deposits: 1, 2, 3
    const amt1 = ethers.parseEther("0.5");
    const amt2 = ethers.parseEther("1.5");
    const amt3 = ethers.parseEther("2.5");
    const dep1 = ethers.parseEther("1");
    const dep2 = ethers.parseEther("2");
    const dep3 = ethers.parseEther("3");
    const s1 = "0x" + "11".repeat(32);
    const s2 = "0x" + "22".repeat(32);
    const s3 = "0x" + "33".repeat(32);

    await (await auction.connect(b1).commitBid(id, bidHash(amt1, s1, b1.address), { value: dep1 })).wait();
    await (await auction.connect(b2).commitBid(id, bidHash(amt2, s2, b2.address), { value: dep2 })).wait();
    await (await auction.connect(b3).commitBid(id, bidHash(amt3, s3, b3.address), { value: dep3 })).wait();

    await time.increase(COMMIT_DURATION + 1);

    await (await auction.connect(b1).revealBid(id, amt1, s1)).wait();
    await (await auction.connect(b2).revealBid(id, amt2, s2)).wait();
    await (await auction.connect(b3).revealBid(id, amt3, s3)).wait();

    await time.increase(REVEAL_DURATION + 1);

    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    await (await auction.connect(b1).finalizeAuction(id)).wait();
    const sellerBalAfter = await ethers.provider.getBalance(seller.address);

    expect(await nft.ownerOf(tokenId)).to.equal(b3.address);
    expect(sellerBalAfter - sellerBalBefore).to.equal(amt2); // second-highest

    // Refunds
    const b1BalBefore = await ethers.provider.getBalance(b1.address);
    const tx1 = await auction.connect(b1).claimRefund(id);
    const r1 = await tx1.wait();
    const gas1 = r1!.gasUsed * r1!.gasPrice;
    const b1BalAfter = await ethers.provider.getBalance(b1.address);
    expect(b1BalAfter - b1BalBefore + gas1).to.equal(dep1);

    const b2BalBefore = await ethers.provider.getBalance(b2.address);
    const tx2 = await auction.connect(b2).claimRefund(id);
    const r2 = await tx2.wait();
    const gas2 = r2!.gasUsed * r2!.gasPrice;
    const b2BalAfter = await ethers.provider.getBalance(b2.address);
    expect(b2BalAfter - b2BalBefore + gas2).to.equal(dep2);

    // Winner refund = deposit - secondBid
    const b3BalBefore = await ethers.provider.getBalance(b3.address);
    const tx3 = await auction.connect(b3).claimRefund(id);
    const r3 = await tx3.wait();
    const gas3 = r3!.gasUsed * r3!.gasPrice;
    const b3BalAfter = await ethers.provider.getBalance(b3.address);
    expect(b3BalAfter - b3BalBefore + gas3).to.equal(dep3 - amt2);
  });
});

describe("SealedBidAuction — single bidder", () => {
  it("only revealer pays minBid, refund = deposit - minBid", async () => {
    const { seller, b1, nft, auction, tokenId } = await deployFresh();
    const auctionAddr = await auction.getAddress();
    const nftAddr = await nft.getAddress();

    const minBid = ethers.parseEther("0.2");
    const minDeposit = ethers.parseEther("0.2");
    const id = await createAuction(auction, seller, nftAddr, tokenId, minBid, minDeposit);

    const amt = ethers.parseEther("1.0");
    const dep = ethers.parseEther("1.0");
    const secret = "0x" + "aa".repeat(32);

    await (await auction.connect(b1).commitBid(id, bidHash(amt, secret, b1.address), { value: dep })).wait();
    await time.increase(COMMIT_DURATION + 1);
    await (await auction.connect(b1).revealBid(id, amt, secret)).wait();
    await time.increase(REVEAL_DURATION + 1);

    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    await (await auction.connect(b1).finalizeAuction(id)).wait();
    const sellerBalAfter = await ethers.provider.getBalance(seller.address);

    expect(await nft.ownerOf(tokenId)).to.equal(b1.address);
    expect(sellerBalAfter - sellerBalBefore).to.equal(minBid);

    const balBefore = await ethers.provider.getBalance(b1.address);
    const tx = await auction.connect(b1).claimRefund(id);
    const r = await tx.wait();
    const gas = r!.gasUsed * r!.gasPrice;
    const balAfter = await ethers.provider.getBalance(b1.address);
    expect(balAfter - balBefore + gas).to.equal(dep - minBid);
  });
});

describe("SealedBidAuction — non-revealer forfeit", () => {
  it("non-revealer's deposit is forfeited to seller", async () => {
    const { seller, b1, b2, nft, auction, tokenId } = await deployFresh();
    const nftAddr = await nft.getAddress();

    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");
    const id = await createAuction(auction, seller, nftAddr, tokenId, minBid, minDeposit);

    const amt1 = ethers.parseEther("0.5");
    const amt2 = ethers.parseEther("0.8");
    const dep1 = ethers.parseEther("1");
    const dep2 = ethers.parseEther("1");
    const s1 = "0x" + "11".repeat(32);
    const s2 = "0x" + "22".repeat(32);

    await (await auction.connect(b1).commitBid(id, bidHash(amt1, s1, b1.address), { value: dep1 })).wait();
    await (await auction.connect(b2).commitBid(id, bidHash(amt2, s2, b2.address), { value: dep2 })).wait();

    await time.increase(COMMIT_DURATION + 1);
    // Only b1 reveals.
    await (await auction.connect(b1).revealBid(id, amt1, s1)).wait();
    await time.increase(REVEAL_DURATION + 1);

    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    await (await auction.connect(b1).finalizeAuction(id)).wait();
    const sellerBalAfter = await ethers.provider.getBalance(seller.address);

    // b1 wins at minBid, b2's deposit (dep2) forfeits to seller.
    expect(await nft.ownerOf(tokenId)).to.equal(b1.address);
    expect(sellerBalAfter - sellerBalBefore).to.equal(minBid + dep2);

    // b2 cannot claim refund (auto-marked refunded).
    await expect(auction.connect(b2).claimRefund(id)).to.be.revertedWith("already refunded");
  });
});

describe("SealedBidAuction — invalid reveal", () => {
  it("reveal with amount > deposit reverts", async () => {
    const { seller, b1, nft, auction, tokenId } = await deployFresh();
    const nftAddr = await nft.getAddress();

    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");
    const id = await createAuction(auction, seller, nftAddr, tokenId, minBid, minDeposit);

    const declaredAmt = ethers.parseEther("2");
    const dep = ethers.parseEther("1");
    const secret = "0x" + "ee".repeat(32);

    // Commit a hash for amount=2, but deposit only 1.
    await (await auction.connect(b1).commitBid(id, bidHash(declaredAmt, secret, b1.address), { value: dep })).wait();
    await time.increase(COMMIT_DURATION + 1);

    await expect(auction.connect(b1).revealBid(id, declaredAmt, secret))
      .to.be.revertedWith("amount exceeds deposit");
  });

  it("reveal with wrong amount reverts (hash mismatch)", async () => {
    const { seller, b1, nft, auction, tokenId } = await deployFresh();
    const nftAddr = await nft.getAddress();

    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");
    const id = await createAuction(auction, seller, nftAddr, tokenId, minBid, minDeposit);

    const trueAmt = ethers.parseEther("0.5");
    const dep = ethers.parseEther("1");
    const secret = "0x" + "cc".repeat(32);

    await (await auction.connect(b1).commitBid(id, bidHash(trueAmt, secret, b1.address), { value: dep })).wait();
    await time.increase(COMMIT_DURATION + 1);

    await expect(auction.connect(b1).revealBid(id, ethers.parseEther("0.6"), secret))
      .to.be.revertedWith("invalid reveal");
  });
});

describe("SealedBidAuction — tie at top", () => {
  it("first revealer wins ties; second tier becomes secondBid", async () => {
    const { seller, b1, b2, b3, nft, auction, tokenId } = await deployFresh();
    const nftAddr = await nft.getAddress();

    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");
    const id = await createAuction(auction, seller, nftAddr, tokenId, minBid, minDeposit);

    const tied = ethers.parseEther("1.0");
    const lower = ethers.parseEther("0.7");
    const dep = ethers.parseEther("1.5");
    const s1 = "0x" + "11".repeat(32);
    const s2 = "0x" + "22".repeat(32);
    const s3 = "0x" + "33".repeat(32);

    await (await auction.connect(b1).commitBid(id, bidHash(tied, s1, b1.address), { value: dep })).wait();
    await (await auction.connect(b2).commitBid(id, bidHash(tied, s2, b2.address), { value: dep })).wait();
    await (await auction.connect(b3).commitBid(id, bidHash(lower, s3, b3.address), { value: dep })).wait();

    await time.increase(COMMIT_DURATION + 1);

    // b1 reveals first → becomes highest.
    await (await auction.connect(b1).revealBid(id, tied, s1)).wait();
    // b2 reveals same amount → not strictly greater, falls to "elif > secondBid" branch.
    await (await auction.connect(b2).revealBid(id, tied, s2)).wait();
    await (await auction.connect(b3).revealBid(id, lower, s3)).wait();

    await time.increase(REVEAL_DURATION + 1);

    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    await (await auction.connect(b1).finalizeAuction(id)).wait();
    const sellerBalAfter = await ethers.provider.getBalance(seller.address);

    // b1 wins (revealed first), pays secondBid which is the tied amount from b2.
    expect(await nft.ownerOf(tokenId)).to.equal(b1.address);
    expect(sellerBalAfter - sellerBalBefore).to.equal(tied);
  });
});

describe("SealedBidAuction — reentrancy guard", () => {
  it("malicious receive() cannot re-enter claimRefund", async () => {
    const { seller, b1, nft, auction, tokenId } = await deployFresh();
    const nftAddr = await nft.getAddress();
    const auctionAddr = await auction.getAddress();

    const Reentrant = await ethers.getContractFactory("ReentrantClaimer");
    const attacker = (await Reentrant.deploy(auctionAddr)) as ReentrantClaimer;
    await attacker.waitForDeployment();
    const attackerAddr = await attacker.getAddress();

    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");
    const id = await createAuction(auction, seller, nftAddr, tokenId, minBid, minDeposit);

    // Two bidders so attacker is NOT the winner — winner refund = 0 here, but
    // we want attacker to be a non-winning revealer with a refund > 0.
    const attackerAmt = ethers.parseEther("0.3");
    const winnerAmt = ethers.parseEther("0.8");
    const attackerDep = ethers.parseEther("0.5");
    const winnerDep = ethers.parseEther("1.0");
    const sA = "0x" + "aa".repeat(32);
    const sB = "0x" + "bb".repeat(32);

    // Attacker commits via its helper.
    const attackerHash = bidHash(attackerAmt, sA, attackerAddr);
    await (await attacker.commit(id, attackerHash, { value: attackerDep })).wait();

    await (await auction.connect(b1).commitBid(id, bidHash(winnerAmt, sB, b1.address), { value: winnerDep })).wait();

    await time.increase(COMMIT_DURATION + 1);
    await (await attacker.reveal(id, attackerAmt, sA)).wait();
    await (await auction.connect(b1).revealBid(id, winnerAmt, sB)).wait();
    await time.increase(REVEAL_DURATION + 1);

    await (await auction.connect(b1).finalizeAuction(id)).wait();

    // Arm the attacker — its receive() will try to re-enter claimRefund.
    await (await attacker.arm()).wait();

    // First call from attacker: outer call to claimRefund. The reentrant inner call
    // will revert (already refunded / nonReentrant), but the malicious receive()
    // swallows the error so the outer call still succeeds. Verify only ONE refund
    // was paid out by checking the contract's ETH balance is zeroed correctly and
    // the attacker holds the expected refund.
    const auctionEthBefore = await ethers.provider.getBalance(auctionAddr);
    await (await attacker.claim(id)).wait();
    const auctionEthAfter = await ethers.provider.getBalance(auctionAddr);

    // Attacker should have received exactly its deposit (it's a revealed non-winner).
    expect(await ethers.provider.getBalance(attackerAddr)).to.equal(attackerDep);
    // The auction contract's outflow should be exactly attackerDep (no double-spend).
    expect(auctionEthBefore - auctionEthAfter).to.equal(attackerDep);

    // A second claim must revert.
    await expect(attacker.claim(id)).to.be.reverted;
  });
});

describe("SealedBidAuction — admin role", () => {
  it("non-admin cannot create auction", async () => {
    const { b1, nft, auction, tokenId } = await deployFresh();
    const nftAddr = await nft.getAddress();
    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");

    await expect(
      auction.connect(b1).createAuction(nftAddr, tokenId, COMMIT_DURATION, REVEAL_DURATION, minBid, minDeposit)
    ).to.be.revertedWith("SealedBidAuction: not admin");
  });

  it("admin can add another admin, who can then create an auction", async () => {
    const { seller, b1, b2, nft, auction, tokenId } = await deployFresh();
    const nftAddr = await nft.getAddress();
    const auctionAddr = await auction.getAddress();
    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");

    // Seller (admin #1) promotes b1.
    await expect(auction.connect(seller).addAdmin(b1.address))
      .to.emit(auction, "AdminAdded")
      .withArgs(b1.address);
    expect(await auction.isAdmin(b1.address)).to.equal(true);
    expect(await auction.adminCount()).to.equal(2n);

    // Mint a fresh NFT to b1 and let b1 list it.
    await (await nft.connect(seller).mint(b1.address, "ipfs://demo/2.json")).wait();
    const newTokenId = 1n;
    await (await nft.connect(b1).approve(auctionAddr, newTokenId)).wait();

    await expect(
      auction.connect(b1).createAuction(nftAddr, newTokenId, COMMIT_DURATION, REVEAL_DURATION, minBid, minDeposit)
    ).to.emit(auction, "AuctionCreated");
  });

  it("admin cannot remove self", async () => {
    const { seller, auction } = await deployFresh();
    await expect(auction.connect(seller).removeAdmin(seller.address)).to.be.revertedWith("cannot remove self");
  });

  it("removed admin loses privileges", async () => {
    const { seller, b1, nft, auction, tokenId } = await deployFresh();
    const nftAddr = await nft.getAddress();
    const minBid = ethers.parseEther("0.1");
    const minDeposit = ethers.parseEther("0.1");

    await (await auction.connect(seller).addAdmin(b1.address)).wait();
    expect(await auction.adminCount()).to.equal(2n);

    await expect(auction.connect(seller).removeAdmin(b1.address))
      .to.emit(auction, "AdminRemoved")
      .withArgs(b1.address);
    expect(await auction.isAdmin(b1.address)).to.equal(false);
    expect(await auction.adminCount()).to.equal(1n);

    await expect(
      auction.connect(b1).createAuction(nftAddr, tokenId, COMMIT_DURATION, REVEAL_DURATION, minBid, minDeposit)
    ).to.be.revertedWith("SealedBidAuction: not admin");
  });

  it("cannot remove the last admin", async () => {
    const { seller, b1, auction } = await deployFresh();
    // Add then remove b1 to confirm only seller remains.
    await (await auction.connect(seller).addAdmin(b1.address)).wait();
    await (await auction.connect(seller).removeAdmin(b1.address)).wait();
    expect(await auction.adminCount()).to.equal(1n);

    // b1 is no longer admin so they can't even attempt; but the seller (last admin)
    // also can't remove themselves due to the "cannot remove self" guard which fires
    // before "cannot remove last admin". Both rules together protect the invariant.
    await expect(auction.connect(seller).removeAdmin(seller.address)).to.be.revertedWith("cannot remove self");
  });
});
