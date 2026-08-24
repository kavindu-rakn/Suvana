"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle className="text-accent" size={28} />
      <h2 className="text-lg font-medium">Something went wrong</h2>
      <p className="max-w-sm text-sm text-foreground-muted">
        This usually means the app couldn&apos;t reach MongoDB. Double check{" "}
        <code className="text-accent">MONGODB_URI</code> in your <code>.env.local</code>.
      </p>
      <Button onClick={reset} variant="outline" size="md" className="mt-2">
        Try again
      </Button>
    </Card>
  );
}
