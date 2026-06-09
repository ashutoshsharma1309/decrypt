import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Lock, Eye, Gavel, Sparkles, Wrench, Coins, ArrowRight, ShieldCheck } from "lucide-react";
import { useUserRole } from "../hooks/useUserRole";
import { FullScreenLoader } from "../components/FullScreenLoader";

export function Landing() {
  const nav = useNavigate();
  const { isConnected, isAdmin, isCheckingRole, contractDeployed } = useUserRole();

  useEffect(() => {
    if (!isConnected) return;
    if (contractDeployed && isCheckingRole) return;
    nav(isAdmin ? "/admin" : "/auctions", { replace: true });
  }, [isConnected, isAdmin, isCheckingRole, contractDeployed, nav]);

  if (isConnected && contractDeployed && isCheckingRole) {
    return <FullScreenLoader />;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Lightweight static glows — pure radial-gradient, no `filter: blur()`. */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse 800px 500px at 50% 0%, rgba(168,85,247,0.18), transparent 60%), radial-gradient(ellipse 700px 500px at 100% 100%, rgba(34,211,238,0.10), transparent 60%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 chip border-accent/40 bg-accent/10 text-accent-glow mb-5">
            <Sparkles className="w-3 h-3" /> Live on Sepolia · Vickrey mechanism
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Sealed bids.
            <br />
            <span className="neon-text">Second-price wins.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-muted leading-relaxed">
            DECRYPTO is a Vickrey sealed-bid auction protocol for NFTs on Ethereum Sepolia.
            Bid your <em>true</em> value — the highest bidder wins, but only pays what the second-highest bid was.
          </p>
        </div>

        {/* Phase explainer */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
          <PhaseCard icon={<Lock className="w-4 h-4" />} step="1" title="Commit" desc="Submit hashed bid + ETH deposit" tint="accent" />
          <PhaseCard icon={<Eye className="w-4 h-4" />} step="2" title="Reveal" desc="Disclose amount + secret on-chain" tint="cyan" />
          <PhaseCard icon={<Gavel className="w-4 h-4" />} step="3" title="Finalize" desc="Highest bidder pays second-highest" tint="green" />
        </div>

        {/* Role selection */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto">
          <RoleCard
            tint="purple"
            tag="Operators"
            title="Admin Portal"
            icon={<Wrench className="w-6 h-6" />}
            desc="Manage auctions, mint NFTs, oversee admins, and watch the platform health."
            bullets={[
              "Create new sealed-bid auctions",
              "Mint NFTs into the marketplace",
              "Add/remove other admins on-chain",
              "View platform-wide stats",
            ]}
          />
          <RoleCard
            tint="cyan"
            tag="Public"
            title="Bidder Marketplace"
            icon={<Coins className="w-6 h-6" />}
            desc="Browse auctions, place sealed bids, reveal them, and win NFTs."
            bullets={[
              "Browse all live auctions",
              "Commit a hidden bid + deposit",
              "Reveal during the reveal window",
              "Claim refunds + the NFT if you win",
            ]}
          />
        </div>

        {/* Single connect — wallet IS the login. Role is inferred on-chain. */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="w-3.5 h-3.5" />
            One wallet. We read your role from the smart contract — no passwords, ever.
          </div>
          <ConnectButton chainStatus="icon" accountStatus="full" showBalance={false} label="Connect to enter" />
          <div className="text-[11px] text-muted">
            Already have an admin wallet? Connect it — you'll auto-route to the admin console.
          </div>
        </div>

        {!contractDeployed && (
          <div className="mt-10 max-w-3xl mx-auto rounded-xl border border-warning/40 bg-warning/10 p-4 text-warning text-sm">
            <strong>Preview mode</strong> — smart contracts are not deployed yet. UI is fully wired but reads/writes will fail. Deploy to Sepolia to activate.
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseCard({ icon, step, title, desc, tint }: { icon: React.ReactNode; step: string; title: string; desc: string; tint: "accent" | "cyan" | "green" }) {
  const tints = {
    accent: "border-accent/30 bg-accent/5 text-accent-glow",
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-300",
    green: "border-success/30 bg-success/5 text-success",
  };
  return (
    <div className={`rounded-xl border p-4 ${tints[tint]}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-70">Step {step}</div>
      <div className="flex items-center gap-2 font-bold text-base mt-1">
        {icon}
        {title}
      </div>
      <div className="text-xs text-muted mt-1.5">{desc}</div>
    </div>
  );
}

function RoleCard({
  tint, tag, title, icon, desc, bullets,
}: {
  tint: "purple" | "cyan";
  tag: string;
  title: string;
  icon: React.ReactNode;
  desc: string;
  bullets: string[];
}) {
  const styles = tint === "purple"
    ? { border: "border-accent/30", glow: "from-accent/40 to-accent/0", chip: "bg-accent/15 text-accent-glow", icon: "bg-accent/20 text-accent-glow" }
    : { border: "border-cyan-500/30", glow: "from-cyan-500/30 to-cyan-500/0", chip: "bg-cyan-500/15 text-cyan-300", icon: "bg-cyan-500/20 text-cyan-300" };

  return (
    <div className={`relative glass rounded-2xl p-6 sm:p-7 ${styles.border} group transition-all hover:-translate-y-1`}>
      <div className={`absolute -top-px left-12 right-12 h-px bg-gradient-to-r ${styles.glow}`} />
      <div className="flex items-center justify-between mb-4">
        <span className={`chip ${styles.chip} border-transparent`}>{tag}</span>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon}`}>
          {icon}
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-1.5">{title}</h2>
      <p className="text-sm text-muted leading-relaxed mb-4">{desc}</p>
      <ul className="space-y-1.5 text-sm mb-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-muted">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-accent shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
