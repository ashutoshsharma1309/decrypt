import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { isAddress, type Hex } from "viem";
import { ArrowLeft, ShieldPlus, Trash2, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAdminCount, useAdminList, useAddAdmin, useRemoveAdmin } from "../../hooks/useAdmin";
import { ContractMissingBanner } from "../../components/ContractMissingBanner";
import { useUserRole } from "../../hooks/useUserRole";
import { shortAddr } from "../../lib/format";

export function AdminManager() {
  const { address } = useAccount();
  const { contractDeployed } = useUserRole();
  const { admins, loading } = useAdminList();
  const { data: adminCount } = useAdminCount();
  const { add, isPending: adding, isLoading: addWaiting } = useAddAdmin();
  const { remove, isPending: removing, isLoading: rmWaiting } = useRemoveAdmin();

  const [newAddr, setNewAddr] = useState("");

  async function onAdd() {
    if (!isAddress(newAddr)) {
      toast.error("Invalid Ethereum address");
      return;
    }
    try {
      await add(newAddr as Hex);
      toast.success("Admin added");
      setNewAddr("");
    } catch (e: any) {
      toast.error(e?.shortMessage || "Add failed");
    }
  }

  async function onRemove(addr: Hex) {
    if (addr.toLowerCase() === address?.toLowerCase()) {
      toast.error("Cannot remove yourself");
      return;
    }
    try {
      await remove(addr);
      toast.success("Admin removed");
    } catch (e: any) {
      toast.error(e?.shortMessage || "Remove failed");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/admin" className="text-muted hover:text-white text-sm flex items-center gap-2 mb-4">
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>
      <h1 className="text-3xl font-bold mb-1">Manage Admins</h1>
      <p className="text-muted mb-6">
        Admin role is enforced on-chain. {adminCount !== undefined && <span className="text-white">Total: {Number(adminCount)}</span>}
      </p>

      {!contractDeployed && <ContractMissingBanner />}

      <div className="glass rounded-2xl p-5 mb-6">
        <h2 className="font-bold flex items-center gap-2 mb-3">
          <ShieldPlus className="w-4 h-4 text-accent" /> Add admin
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="input font-mono text-xs flex-1"
            value={newAddr}
            onChange={(e) => setNewAddr(e.target.value)}
            placeholder="0x... new admin address"
          />
          <button onClick={onAdd} disabled={!isAddress(newAddr) || adding || addWaiting} className="btn-primary">
            {adding || addWaiting ? "Adding…" : "Add"}
          </button>
        </div>
        <div className="text-[11px] text-muted mt-2">
          New admin will be able to create auctions, mint NFTs, and add/remove other admins.
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" /> Current admins
          </h2>
          {loading && <span className="text-xs text-muted">Loading…</span>}
        </div>
        {admins.length === 0 && !loading ? (
          <div className="p-10 text-center text-muted text-sm">No admins indexed yet.</div>
        ) : (
          <ul>
            {admins.map((a) => {
              const isMe = a.toLowerCase() === address?.toLowerCase();
              return (
                <li key={a} className="px-5 py-3 border-b border-border/60 last:border-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/40 to-cyan-500/40 flex items-center justify-center font-bold">
                      {a.slice(2, 4).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm truncate">{shortAddr(a)}</span>
                        {isMe && <span className="chip border-accent/40 bg-accent/15 text-accent-glow text-[10px]">You</span>}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(a);
                            toast.success("Address copied");
                          }}
                          className="hover:text-white inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> copy
                        </button>
                        <a
                          href={`https://sepolia.etherscan.io/address/${a}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-white inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> etherscan
                        </a>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(a)}
                    disabled={isMe || removing || rmWaiting}
                    className={`btn-ghost text-xs px-2 py-1 hover:text-danger ${isMe ? "opacity-30" : ""}`}
                    title={isMe ? "Cannot remove yourself" : "Remove admin"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
