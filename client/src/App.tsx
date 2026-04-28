import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AdminRoute, ConnectedRoute } from "./components/RouteGuards";

import { Landing } from "./pages/Landing";
import { Auctions } from "./pages/Auctions";
import { AuctionDetail } from "./pages/AuctionDetail";
import { MyBids } from "./pages/MyBids";
import { NotFound } from "./pages/NotFound";

import { Dashboard } from "./pages/admin/Dashboard";
import { CreateAuction } from "./pages/admin/CreateAuction";
import { NftManager } from "./pages/admin/NftManager";
import { AdminManager } from "./pages/admin/AdminManager";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/auctions" element={<Auctions />} />
        <Route path="/auctions/:id" element={<AuctionDetail />} />

        {/* Connected-only */}
        <Route element={<ConnectedRoute />}>
          <Route path="/me/bids" element={<MyBids />} />
        </Route>

        {/* Admin-only */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/auctions/new" element={<CreateAuction />} />
          <Route path="/admin/nfts" element={<NftManager />} />
          <Route path="/admin/admins" element={<AdminManager />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
