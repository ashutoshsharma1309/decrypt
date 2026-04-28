import { Link } from "react-router-dom";
import { Gavel, Users, Coins, Activity, Plus, ImagePlus, ShieldPlus, ArrowRight, Sparkles } from "lucide-react";
import { useAuctionsList } from "../../hooks/useAuctionsList";
import { useAdminCount } from "../../hooks/useAdmin";
import { StatCard } from "../../components/StatCard";
import { PhaseBadge } from "../../components/PhaseBadge";
import { Countdown } from "../../components/Countdown";
import { fmtEth, shortAddr } from "../../lib/format";
import { Phase } from "../../lib/contracts";
import { useUserRole } from "../../hooks/useUserRole";
import { useFinalize } from "../../hooks/useAuctionActions";
import { toast } from "sonner";
import { useCountdown } from "../../hooks/useCountdown";
import { ContractMissingBanner } from "../../components/ContractMissingBanner";

export function Dashboard() {
  const { contractDeployed } = useUserRole();
  const { rows, loading, refetch } = useAuctionsList();
  const { data: adminCount } = useAdminCount();

  const total = rows.length;
  const active = rows.filter((r) => r.livePhase !== Phase.Finalized).length;
  const volume = rows.filter((r) => r.finalized && r.highestBidder !== "0x0000000000000000000000000000000000000000").reduce((acc, r) => acc + r.secondBid, 0n);
  const recent = [...rows].sort((a, b) => Number(b.id - a.id)).slice(0, 10);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 chip border-accent/40 bg-accent/10 text-accent-glow mb-3">
            <Sparkles className="w-3 h-3" /> Admin Console
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Platform overview</h1>
          <p className="text-muted text-sm mt-1">Manage auctions, NFTs, and admins.</p>
        </div>
      </div>

      {!contractDeployed && <ContractMissingBanner />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total auctions" value={loading ? "—" : total} icon={<Gavel className="w-4 h-4" />} tint="accent" />
        <StatCard label="Active" value={loading ? "—" : active} icon={<Activity className="w-4 h-4" />} tint="cyan" hint="commit + reveal" />
        <StatCard label="Volume (ETH)" value={loading ? "—" : fmtEth(volume, 3)} icon={<Coins className="w-4 h-4" />} tint="green" hint="finalized only" />
        <StatCard label="Admins" value={adminCount !== undefined ? Number(adminCount) : "—"} icon={<Users className="w-4 h-4" />} tint="amber" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <QuickAction to="/admin/auctions/new" title="Create New Auction" desc="List an NFT for sealed-bid auction" icon={<Plus className="w-5 h-5" />} tint="accent" />
        <QuickAction to="/admin/nfts" title="Mint NFT" desc="Add inventory to the marketplace" icon={<ImagePlus className="w-5 h-5" />} tint="cyan" />
        <QuickAction to="/admin/admins" title="Manage Admins" desc="Add or revoke privileged wallets" icon={<ShieldPlus className="w-5 h-5" />} tint="green" />
      </div>

      {/* Recent table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-bold">Recent auctions</h2>
          <button onClick={refetch} className="text-xs text-muted hover:text-white">Refresh</button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted">Loading…</div>
        ) : recent.length === 0 ? (
          <EmptyAuctions />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-muted bg-card/40 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">ID</th>
                  <th className="text-left px-4 py-2.5 font-medium">NFT</th>
                  <th className="text-left px-4 py-2.5 font-medium">Phase</th>
                  <th className="text-right px-4 py-2.5 font-medium">Bidders</th>
                  <th className="text-right px-4 py-2.5 font-medium">Time left</th>
                  <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <Row key={r.id.toString()} row={r} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ row }: { row: ReturnType<typeof useAuctionsList>["rows"][number] }) {
  const { finalize, isPending, isLoading } = useFinalize();
  const deadline = row.livePhase === Phase.Commit ? row.commitDeadline : row.livePhase === Phase.Reveal ? row.revealDeadline : undefined;
  const remaining = useCountdown(deadline);
  const canFinalize = !row.finalized && remaining === 0 && row.livePhase !== Phase.Commit;

  return (
    <tr className="border-b border-border/60 hover:bg-card/40 transition-colors">
      <td className="px-4 py-3 font-mono">#{row.id.toString()}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/40 to-cyan-500/40" />
          <div>
            <div className="text-sm">Token #{row.tokenId.toString()}</div>
            <div className="text-[11px] text-muted font-mono">{shortAddr(row.nft)}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3"><PhaseBadge phase={row.livePhase} size="sm" /></td>
      <td className="px-4 py-3 text-right font-mono">{row.bidderCount}</td>
      <td className="px-4 py-3 text-right">
        {deadline ? <Countdown deadline={deadline} size="sm" /> : <span className="text-muted">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <Link to={`/auctions/${row.id.toString()}`} className="btn-ghost text-xs px-2 py-1">View</Link>
          {canFinalize && (
            <button
              className="btn-secondary text-xs px-2 py-1"
              disabled={isPending || isLoading}
              onClick={async () => {
                try {
                  await finalize(row.id);
                } catch (e: any) {
                  toast.error(e?.shortMessage || "Finalize failed");
                }
              }}
            >
              Finalize
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function QuickAction({ to, title, desc, icon, tint }: { to: string; title: string; desc: string; icon: React.ReactNode; tint: "accent" | "cyan" | "green" }) {
  const tints = {
    accent: "border-accent/30 hover:border-accent/60 hover:shadow-accent/30 [&_.qa-icon]:bg-accent/15 [&_.qa-icon]:text-accent-glow",
    cyan: "border-cyan-500/30 hover:border-cyan-500/60 hover:shadow-cyan-500/30 [&_.qa-icon]:bg-cyan-500/15 [&_.qa-icon]:text-cyan-300",
    green: "border-success/30 hover:border-success/60 hover:shadow-success/30 [&_.qa-icon]:bg-success/15 [&_.qa-icon]:text-success",
  } as const;
  return (
    <Link to={to} className={`glass glass-hover rounded-2xl p-5 flex items-center gap-4 group ${tints[tint]}`}>
      <div className="qa-icon w-12 h-12 rounded-xl flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="font-bold">{title}</div>
        <div className="text-xs text-muted">{desc}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent transition-colors" />
    </Link>
  );
}

function EmptyAuctions() {
  return (
    <div className="p-12 text-center">
      <Gavel className="w-10 h-10 mx-auto text-muted opacity-50 mb-3" />
      <div className="font-bold">No auctions yet</div>
      <p className="text-muted text-sm mt-1 mb-4">Create your first auction to populate the marketplace.</p>
      <Link to="/admin/auctions/new" className="btn-primary inline-flex">
        <Plus className="w-4 h-4" />
        Create Auction
      </Link>
    </div>
  );
}
