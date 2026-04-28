import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUserRole } from "../hooks/useUserRole";
import { FullScreenLoader } from "./FullScreenLoader";

export function AdminRoute() {
  const { isConnected, isAdmin, isCheckingRole, contractDeployed, address } = useUserRole();
  const toastedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !contractDeployed) return;
    if (isCheckingRole) return;
    if (!isAdmin && address && toastedRef.current !== address) {
      toast.error("Admin access required");
      toastedRef.current = address;
    }
  }, [isConnected, isAdmin, isCheckingRole, contractDeployed, address]);

  if (!isConnected) return <Navigate to="/" replace />;
  if (!contractDeployed) return <Outlet />; // let admin pages render their own banner
  if (isCheckingRole) return <FullScreenLoader />;
  if (!isAdmin) return <Navigate to="/auctions" replace />;
  return <Outlet />;
}

export function ConnectedRoute() {
  const { isConnected, isConnecting } = useUserRole();
  if (isConnecting) return <FullScreenLoader />;
  if (!isConnected) return <Navigate to="/" replace />;
  return <Outlet />;
}
