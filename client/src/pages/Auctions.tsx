import { useMemo, useState } from "react";
import { Sparkles, Lock, Eye, CheckCircle2, Layers, ArrowUpDown, Gavel } from "lucide-react";
import { Link } from "react-router-dom";
import { AuctionCard } from "../components/AuctionCard";
import { useAuctionsList } from "../hooks/useAuctionsList";
import { Phase } from "../lib/contracts";
import { useUserRole } from "../hooks/useUserRole";
import { ContractMissingBanner } from "../components/ContractMissingBanner";
import { LiveStatsBanner } from "../components/LiveStatsBanner";
import { FeaturedAuction } from "../components/FeaturedAuction";

type Filter = "all" | "commit" | "reveal" | "finalized";
type Sort = "newest" | "ending" | "bidders";

export function Auctions() {
  const { rows, loading } = useAuctionsList();
  const { contractDeployed } = useUserRole();

  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const filtered = useMemo(() => {
    let list = [...rows];
    if (filter === "commit") list = list.filter((r) => r.livePhase === Phase.Commit);
    if (filter === "reveal") list = list.filter((r) => r.livePhase === Phase.Reveal);
    if (filter === "finalized") list = list.filter((r) => r.finalized);

    if (sort === "newest") list.sort((a, b) => Number(b.id - a.id));
    if (sort === "bidders") list.sort((a, b) => b.bidderCount - a.bidderCount);
    if (sort === "ending") {
      list.sort((a, b) => {
        const aFin = a.finalized;
        const bFin = b.finalized;
        if (aFin && !bFin) return 1;
        if (!aFin && bFin) return -1;
        const aDeadline = Number(a.livePhase === Phase.Commit ? a.commitDeadline : a.revealDeadline);
        const bDeadline = Number(b.livePhase === Phase.Commit ? b.commitDeadline : b.revealDeadline);
        return aDeadline - bDeadline;
      });
    }

    return list;
  }, [rows, filter, sort]);

  return (
    <div>
      <Hero />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 pt-6" id="auctions">
        {!contractDeployed && <ContractMissingBanner />}

        <LiveStatsBanner />
        <FeaturedAuction />

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-6 mt-2">
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} icon={<Layers className="w-3 h-3" />} label="All" />
            <FilterChip active={filter === "commit"} onClick={() => setFilter("commit")} icon={<Lock className="w-3 h-3" />} label="Commit" />
            <FilterChip active={filter === "reveal"} onClick={() => setFilter("reveal")} icon={<Eye className="w-3 h-3" />} label="Reveal" />
            <FilterChip active={filter === "finalized"} onClick={() => setFilter("finalized")} icon={<CheckCircle2 className="w-3 h-3" />} label="Finalized" />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <ArrowUpDown className="w-3 h-3 text-muted" />
            <select
              className="input py-1.5 text-xs w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="newest">Newest first</option>
              <option value="ending">Ending soon</option>
              <option value="bidders">Most bidders</option>
            </select>
          </label>
        </div>

        {loading && rows.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl h-[420px] animate-pulse-slow" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Empty filter={filter} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((r) => (
              <AuctionCard key={r.id.toString()} id={r.id} row={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`chip transition-colors ${
        active ? "border-accent bg-accent/15 text-accent-glow" : "border-border bg-card/40 text-muted hover:text-white"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden border-b border-border">
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse 700px 360px at 50% -10%, rgba(168,85,247,0.18), transparent 60%)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-10">
        <div className="inline-flex items-center gap-2 chip border-accent/40 bg-accent/10 text-accent-glow mb-4">
          <Sparkles className="w-3 h-3" /> Live marketplace
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight max-w-3xl leading-[1.05]">
          Sealed-bid <span className="neon-text">marketplace</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-muted max-w-2xl">
          Browse live auctions. Commit a hidden bid, reveal it later, win the NFT — and pay only the second-highest price.
        </p>
      </div>
    </div>
  );
}

function Empty({ filter }: { filter: Filter }) {
  const map = {
    all: { title: "No auctions yet", body: "Auctions will appear here once an admin lists one." },
    commit: { title: "No auctions in commit phase", body: "Try a different filter." },
    reveal: { title: "No auctions in reveal phase", body: "Bidders aren't disclosing right now — check back." },
    finalized: { title: "No finalized auctions", body: "Once auctions wrap up they'll show here." },
  } as const;
  return (
    <div className="glass rounded-2xl p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-accent/15 flex items-center justify-center mb-4">
        <Gavel className="w-6 h-6 text-accent-glow" />
      </div>
      <h3 className="text-xl font-bold mb-1">{map[filter].title}</h3>
      <p className="text-muted text-sm">{map[filter].body}</p>
    </div>
  );
}
