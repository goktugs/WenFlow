import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

type AuthPageShellProps = {
  title: string;
  description: string;
  alternateLabel: string;
  alternateHref: string;
  alternateText: string;
  children: React.ReactNode;
};

export function AuthPageShell({
  title,
  description,
  alternateLabel,
  alternateHref,
  alternateText,
  children
}: AuthPageShellProps) {
  return (
    <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-border/80 bg-[rgba(255,255,255,0.03)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-sm">
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
          WenFlow
        </p>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">
          Collaborative notes, kept simple.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          This step focuses only on authentication: creating an account,
          signing in, and keeping protected routes behind a valid session.
        </p>
        <div className="mt-10 grid gap-3 text-sm text-muted-foreground">
          <div className="rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
            Single-user workspace isolation comes next.
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/40 px-4 py-3">
            The UI is intentionally restrained and dark, in a Notion-like direction.
          </div>
        </div>
      </section>

      <Card className="border-border/80 bg-[rgba(23,23,23,0.88)] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {children}
          <p className="text-sm text-muted-foreground">
            {alternateText}{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              to={alternateHref}
            >
              {alternateLabel}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
