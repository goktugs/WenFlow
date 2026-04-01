import { AppRouter } from "./app-router";
import { AuthProvider } from "./features/auth/auth-context";
import { Toaster } from "@/components/ui/sonner";

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster richColors position="top-right" theme="dark" />
    </AuthProvider>
  );
}
