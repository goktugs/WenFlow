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
    <div className="flex w-full max-w-md justify-center">
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
