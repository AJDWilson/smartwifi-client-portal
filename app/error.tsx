"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-background px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-secondary">Something went wrong</h1>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        The portal could not load this page. Try again, and refresh the browser if it keeps happening.
      </p>
      <Button type="button" className="h-10 px-4" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
