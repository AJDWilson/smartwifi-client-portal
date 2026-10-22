"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Search } from "lucide-react";
import { ClientFormDialog } from "@/components/client-form-dialog";
import { ClientList } from "@/components/client-list";
import { SmartWifiLogo } from "@/components/smartwifi-logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { brand } from "@/lib/brand";
import {
  londonToday,
  organiseClients,
  summarise,
  type ClientFilter,
  type ClientRecord,
} from "@/lib/clients";
import { STORAGE_SETUP_MESSAGE, type StorageMode } from "@/lib/messages";
import { toast } from "sonner";

const filters: { id: ClientFilter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All" },
  { id: "past", label: "Past" },
];

type ClientPayload = {
  clients?: ClientRecord[];
  storage?: StorageMode;
  error?: string;
};

async function fetchClients(signal: AbortSignal): Promise<
  | { kind: "ok"; clients: ClientRecord[]; storage: StorageMode }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string }
> {
  const response = await fetch("/api/clients", { signal, cache: "no-store" });
  if (response.status === 401) return { kind: "unauthorized" };
  const payload = (await response.json().catch(() => null)) as ClientPayload | null;
  if (!response.ok || !payload?.clients || !payload.storage) {
    return { kind: "error", message: payload?.error || "The client list could not be loaded." };
  }
  return { kind: "ok", clients: payload.clients, storage: payload.storage };
}

export function PortalApp() {
  const [clients, setClients] = useState<ClientRecord[] | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [storage, setStorage] = useState<StorageMode>("file");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClientRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const controller = new AbortController();
    fetchClients(controller.signal)
      .then((result) => {
        if (result.kind === "unauthorized") {
          router.push("/");
          router.refresh();
          return;
        }
        setToday(londonToday());
        if (result.kind === "error") {
          setLoadError(result.message);
          setClients([]);
          return;
        }
        setLoadError(null);
        setClients(result.clients);
        setStorage(result.storage);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setToday(londonToday());
        setLoadError("Could not reach the portal. Check your connection and try again.");
        setClients([]);
      });
    return () => controller.abort();
  }, [reloadKey, router]);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
    router.push("/");
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  }

  function openEdit(client: ClientRecord) {
    setEditing(client);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  }

  function onSaved(client: ClientRecord) {
    setClients((current) => {
      const list = current ?? [];
      const exists = list.some((item) => item.id === client.id);
      if (!exists) return [client, ...list];
      return list.map((item) => (item.id === client.id ? client : item));
    });
    toast.success(editing ? "Client updated" : "Client added");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${pendingDelete.id}`, { method: "DELETE" });
      if (response.status === 401) {
        router.push("/");
        router.refresh();
        return;
      }
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        toast.error(payload?.error || "That client could not be removed.");
        setDeleting(false);
        return;
      }
      setClients((current) => (current ?? []).filter((client) => client.id !== pendingDelete.id));
      toast.success("Client removed");
      setPendingDelete(null);
    } catch {
      toast.error("Could not reach the portal. Check your connection and try again.");
    } finally {
      setDeleting(false);
    }
  }

  const ready = clients !== null && today !== null;
  const stats = useMemo(
    () => (clients && today ? summarise(clients, today) : null),
    [clients, today],
  );
  const groups = useMemo(
    () => (clients && today ? organiseClients(clients, filter, today, query) : []),
    [clients, filter, today, query],
  );
  const visibleCount = groups.reduce((total, group) => total + group.clients.length, 0);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="h-1 bg-brand" />
      <header className="sticky top-0 z-20 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <SmartWifiLogo className="h-9" />
          <span className="hidden h-6 w-px bg-border sm:block" />
          <p className="hidden text-sm font-medium text-muted-foreground sm:block">Client portal</p>
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" className="h-10 px-3" onClick={openCreate} disabled={!ready}>
              <Plus />
              <span className="hidden min-[420px]:inline">Add client</span>
              <span className="min-[420px]:hidden">Add</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              onClick={() => void signOut()}
              disabled={signingOut}
              aria-label="Sign out"
            >
              <LogOut />
              <span className="hidden sm:inline">{signingOut ? "Signing out…" : "Sign out"}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-secondary">Clients</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Contacts, event dates and what each job needs, in one list for the whole team.
          </p>
        </div>

        {storage === "unconfigured" ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Records will not be kept on this deployment yet.</p>
            <p className="mt-1 leading-6">{STORAGE_SETUP_MESSAGE}</p>
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p>{loadError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 bg-white"
              onClick={() => {
                setLoadError(null);
                setClients(null);
                setReloadKey((value) => value + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Job summary">
          <Stat label="All jobs" value={stats ? stats.total : "–"} />
          <Stat label="Upcoming" value={stats ? stats.upcoming : "–"} />
          <Stat label="On site today" value={stats ? stats.onSite : "–"} highlight={Boolean(stats && stats.onSite > 0)} />
          <Stat label="Dates to confirm" value={stats ? stats.undated : "–"} />
        </section>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, company, event or phone"
              aria-label="Search clients"
              className="h-11 pl-9"
            />
          </div>
          <div className="flex rounded-lg bg-muted p-1" role="group" aria-label="Filter by date">
            {filters.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={filter === item.id ? "default" : "ghost"}
                className="h-9 flex-1 px-3 lg:flex-none"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {ready
            ? `${visibleCount} ${visibleCount === 1 ? "job" : "jobs"}${query.trim() ? " match this search" : ""}`
            : "Loading clients…"}
        </p>

        {!ready ? (
          <div className="grid gap-3" aria-hidden="true">
            <div className="h-28 animate-pulse rounded-xl bg-white ring-1 ring-foreground/10" />
            <div className="h-28 animate-pulse rounded-xl bg-white ring-1 ring-foreground/10" />
          </div>
        ) : visibleCount === 0 ? (
          <EmptyState
            hasClients={(clients?.length ?? 0) > 0}
            filter={filter}
            onCreate={openCreate}
            onShowAll={() => {
              setFilter("all");
              setQuery("");
            }}
          />
        ) : (
          <ClientList groups={groups} today={today ?? ""} onEdit={openEdit} onDelete={setPendingDelete} />
        )}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {brand.name} · {brand.addressInline}
          </p>
          <p className="flex flex-wrap gap-x-3">
            <a className="font-medium text-primary hover:underline" href={brand.phoneHref}>
              {brand.phoneDisplay}
            </a>
            <a className="font-medium text-primary hover:underline" href={brand.emailHref}>
              {brand.email}
            </a>
            <a className="font-medium text-primary hover:underline" href={brand.site}>
              {brand.siteLabel}
            </a>
          </p>
        </div>
      </footer>

      <ClientFormDialog
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={onSaved}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this client?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `This deletes ${pendingDelete.name}${pendingDelete.eventName ? ` — ${pendingDelete.eventName}` : ""} for everyone signed in to the portal.`
                : "This deletes the record for everyone signed in to the portal."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep client</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Removing…" : "Remove client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <Card size="sm" className={highlight ? "ring-2 ring-brand/50" : undefined}>
      <CardHeader>
        <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      </CardHeader>
    </Card>
  );
}

function EmptyState({
  hasClients,
  filter,
  onCreate,
  onShowAll,
}: {
  hasClients: boolean;
  filter: ClientFilter;
  onCreate: () => void;
  onShowAll: () => void;
}) {
  const title = hasClients
    ? filter === "past"
      ? "No past jobs match"
      : "Nothing coming up"
    : "No clients yet";
  const body = hasClients
    ? "Try another search, or look through the full list."
    : "Add the first client and the job will be here for anyone who signs in.";

  return (
    <div className="rounded-xl bg-card px-6 py-12 text-center shadow-sm ring-1 ring-foreground/10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{body}</p>
      <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {hasClients ? (
          <Button type="button" variant="outline" onClick={onShowAll}>
            Show all jobs
          </Button>
        ) : (
          <Button type="button" className="h-10 px-4" onClick={onCreate}>
            <Plus />
            Add client
          </Button>
        )}
      </div>
    </div>
  );
}
