import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useEffect } from "react";
import { toast } from "sonner";
import { auctionContract, nftContract } from "../lib/contracts";
import { erc721Abi, type Hex } from "viem";

function useTxToast(label: string, hash: `0x${string}` | undefined, isPending: boolean) {
  const wait = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!hash) return;
    const id = toast.loading(`${label} pending…`, { id: hash });
    return () => {
      toast.dismiss(id);
    };
  }, [hash, label]);

  useEffect(() => {
    if (!hash) return;
    if (wait.isSuccess) toast.success(`${label} confirmed`, { id: hash });
    if (wait.isError) toast.error(`${label} failed`, { id: hash });
  }, [wait.isSuccess, wait.isError, hash, label]);

  return { ...wait, isPending: isPending || (!!hash && wait.isLoading) };
}

export function useCommitBid() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Commit", hash, isPending);
  const commit = (id: bigint, sealedHash: Hex, deposit: bigint) =>
    writeContractAsync({
      ...auctionContract,
      functionName: "commitBid",
      args: [id, sealedHash],
      value: deposit,
    });
  return { commit, hash, ...status };
}

export function useRevealBid() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Reveal", hash, isPending);
  const reveal = (id: bigint, amount: bigint, secret: Hex) =>
    writeContractAsync({
      ...auctionContract,
      functionName: "revealBid",
      args: [id, amount, secret],
    });
  return { reveal, hash, ...status };
}

export function useFinalize() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Finalize", hash, isPending);
  const finalize = (id: bigint) =>
    writeContractAsync({
      ...auctionContract,
      functionName: "finalizeAuction",
      args: [id],
    });
  return { finalize, hash, ...status };
}

export function useClaimRefund() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Refund", hash, isPending);
  const claim = (id: bigint) =>
    writeContractAsync({
      ...auctionContract,
      functionName: "claimRefund",
      args: [id],
    });
  return { claim, hash, ...status };
}

export function useApproveNft() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Approve NFT", hash, isPending);
  const approve = (nft: Hex, to: Hex, tokenId: bigint) =>
    writeContractAsync({
      address: nft,
      abi: erc721Abi,
      functionName: "approve",
      args: [to, tokenId],
    });
  return { approve, hash, ...status };
}

export function useCreateAuction() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Create auction", hash, isPending);
  const create = (
    nft: Hex,
    tokenId: bigint,
    commitDuration: bigint,
    revealDuration: bigint,
    minBid: bigint,
    minDeposit: bigint
  ) =>
    writeContractAsync({
      ...auctionContract,
      functionName: "createAuction",
      args: [nft, tokenId, commitDuration, revealDuration, minBid, minDeposit],
    });
  return { create, hash, ...status };
}

export function useMintNft() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Mint NFT", hash, isPending);
  const mint = (to: Hex, tokenURI: string) =>
    writeContractAsync({
      ...nftContract,
      functionName: "mint",
      args: [to, tokenURI],
    });
  return { mint, hash, ...status };
}
