import { useEffect, useState } from "react";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { auctionContract } from "../lib/contracts";
import { useEffect as useTxEffect } from "react";
import { toast } from "sonner";
import { useWaitForTransactionReceipt } from "wagmi";
import type { Hex } from "viem";

export function useAdminCount() {
  return useReadContract({
    ...auctionContract,
    functionName: "adminCount",
    query: { refetchInterval: 30_000, staleTime: 20_000 },
  });
}

export function useIsAdmin(address?: Hex) {
  return useReadContract({
    ...auctionContract,
    functionName: "isAdmin",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 30_000, staleTime: 20_000 },
  });
}

/** Scan AdminAdded events; current admin set = those that pass an isAdmin(addr) check. */
export function useAdminList() {
  const client = usePublicClient();
  const [list, setList] = useState<Hex[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!client) return;
    setLoading(true);
    async function load() {
      try {
        const logs = await client!.getContractEvents({
          ...auctionContract,
          eventName: "AdminAdded",
          fromBlock: "earliest",
          toBlock: "latest",
        });
        if (cancelled) return;
        const seen = new Set<string>();
        const candidates: Hex[] = [];
        for (const l of logs) {
          const a = (l.args as any).admin as Hex | undefined;
          if (!a || seen.has(a.toLowerCase())) continue;
          seen.add(a.toLowerCase());
          candidates.push(a);
        }
        // Verify current state.
        const live: Hex[] = [];
        for (const a of candidates) {
          try {
            const ok = await client!.readContract({
              ...auctionContract,
              functionName: "isAdmin",
              args: [a],
            });
            if (ok) live.push(a);
          } catch {
            /* ignore */
          }
        }
        if (!cancelled) setList(live);
      } catch {
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [client]);

  return { admins: list, loading };
}

function useTxToast(label: string, hash: Hex | undefined, isPending: boolean) {
  const wait = useWaitForTransactionReceipt({ hash });
  useTxEffect(() => {
    if (!hash) return;
    const id = toast.loading(`${label} pending…`, { id: hash });
    return () => {
      toast.dismiss(id);
    };
  }, [hash, label]);
  useTxEffect(() => {
    if (!hash) return;
    if (wait.isSuccess) toast.success(`${label} confirmed`, { id: hash });
    if (wait.isError) toast.error(`${label} failed`, { id: hash });
  }, [wait.isSuccess, wait.isError, hash, label]);
  return { ...wait, isPending: isPending || (!!hash && wait.isLoading) };
}

export function useAddAdmin() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Add admin", hash, isPending);
  const add = (a: Hex) =>
    writeContractAsync({
      ...auctionContract,
      functionName: "addAdmin",
      args: [a],
    });
  return { add, hash, ...status };
}

export function useRemoveAdmin() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Remove admin", hash, isPending);
  const remove = (a: Hex) =>
    writeContractAsync({
      ...auctionContract,
      functionName: "removeAdmin",
      args: [a],
    });
  return { remove, hash, ...status };
}

export function useTransferAdmin() {
  const { writeContractAsync, data: hash, isPending } = useWriteContract();
  const status = useTxToast("Transfer admin", hash, isPending);
  const transfer = (a: Hex) =>
    writeContractAsync({
      ...auctionContract,
      functionName: "transferAdmin",
      args: [a],
    });
  return { transfer, hash, ...status };
}
