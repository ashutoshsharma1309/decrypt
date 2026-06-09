import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Lock, Menu, X, LayoutDashboard, Plus, Image as ImageIcon, Users, Gavel, History } from "lucide-react";
import { useState } from "react";
import { useUserRole } from "../hooks/useUserRole";
import { NetworkChip } from "./NetworkChip";
import { ChainGuard } from "./ChainGuard";

type NavItem = { to: string; label: string; icon: React.ReactNode };

const ADMIN_LINKS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { to: "/admin/auctions/new", label: "New Auction", icon: <Plus className="w-3.5 h-3.5" /> },
  { to: "/admin/nfts", label: "NFTs", icon: <ImageIcon className="w-3.5 h-3.5" /> },
  { to: "/admin/admins", label: "Admins", icon: <Users className="w-3.5 h-3.5" /> },
];

const BIDDER_LINKS: NavItem[] = [
  { to: "/auctions", label: "Auctions", icon: <Gavel className="w-3.5 h-3.5" /> },
  { to: "/me/bids", label: "My Bids", icon: <History className="w-3.5 h-3.5" /> },
];

export function AppLayout() {
  const { isConnected, isAdmin } = useUserRole();
  const [open, setOpen] = useState(false);
  const links = !isConnected ? [] : isAdmin ? ADMIN_LINKS : BIDDER_LINKS;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-bg border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center gap-3 px-4 sm:px-6 py-3">
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-cyan-500 flex items-center justify-center shadow-lg shadow-accent/30 group-hover:shadow-accent/60 transition-shadow">
              <Lock className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block">
              <div className="text-base font-bold tracking-tight neon-text leading-none">DECRYPTO</div>
              <div className="text-[9px] text-muted leading-none mt-0.5 tracking-widest uppercase">
                {isAdmin ? "Admin Console" : "Bidder Portal"}
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-6 mr-auto pl-6 border-l border-border">
            {links.map((l) => (
              <NavTab key={l.to} {...l} />
            ))}
          </nav>
          <div className="flex-1 md:hidden" />

          <div className="hidden sm:flex"><NetworkChip /></div>
          <div className="hidden sm:flex"><ConnectButton chainStatus="none" accountStatus="address" showBalance={false} /></div>
          <div className="sm:hidden"><ConnectButton chainStatus="none" accountStatus="avatar" showBalance={false} /></div>

          {links.length > 0 && (
            <button
              className="md:hidden btn-ghost p-1.5"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>

        {open && links.length > 0 && (
          <div className="md:hidden border-t border-border bg-bg/95 px-3 py-2 space-y-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/admin"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive ? "bg-accent/15 text-accent-glow" : "text-muted hover:text-white hover:bg-card"
                  }`
                }
              >
                {l.icon}
                {l.label}
              </NavLink>
            ))}
            <div className="pt-2 px-3"><NetworkChip /></div>
          </div>
        )}
      </header>

      <ChainGuard />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function NavTab({ to, label, icon }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === "/admin"}
      className={({ isActive }) =>
        `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          isActive ? "text-white bg-card" : "text-muted hover:text-white"
        }`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

function Footer() {
  const auctionAddr = import.meta.env.VITE_CONTRACT_ADDRESS as string;
  const nftAddr = import.meta.env.VITE_NFT_ADDRESS as string;
  const showLinks = auctionAddr && auctionAddr !== "0x0000000000000000000000000000000000000000";
  return (
    <footer className="border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted">
        <div>DECRYPTO · Vickrey sealed-bid auctions on Ethereum Sepolia.</div>
        {showLinks && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono">
            <a className="hover:text-accent" target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/address/${auctionAddr}`}>
              Auction: {auctionAddr.slice(0, 8)}…
            </a>
            <a className="hover:text-accent" target="_blank" rel="noreferrer" href={`https://sepolia.etherscan.io/address/${nftAddr}`}>
              NFT: {nftAddr.slice(0, 8)}…
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
