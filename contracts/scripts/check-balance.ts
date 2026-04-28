import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(signer.address);
  console.log("Address:", signer.address);
  console.log("Balance:", ethers.formatEther(bal), "ETH");
  console.log("Need ~0.01 ETH to mint the remaining 4 rich NFTs.");
}
main().catch(console.error);
