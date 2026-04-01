import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";

export function AuthenticatedShell() {
  const { logout, user } = useAuth();

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div>
            <p className="text-sm text-muted-foreground">Authenticated shell</p>
            <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
          </div>
          <Button variant="outline" onClick={logout}>
            Sign out
          </Button>
        </header>

        <section className="rounded-2xl border border-dashed border-border bg-card p-10 text-sm text-muted-foreground shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          Step 4 stops here on purpose. The authenticated shell is ready, and
          document features will be added in the next steps.
        </section>
      </div>
    </main>
  );
}
