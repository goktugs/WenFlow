import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "./auth-context";

export function RequireAuth() {
  const location = useLocation();
  const { isLoading, user } = useAuth();
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    if (user) {
      hasShownToastRef.current = false;
    }
  }, [user]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Checking your session...</p>
      </main>
    );
  }

  if (!user) {
    if (!hasShownToastRef.current) {
      hasShownToastRef.current = true;
      toast.info("Please sign in to continue");
    }

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
