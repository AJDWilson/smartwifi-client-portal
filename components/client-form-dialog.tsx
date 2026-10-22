"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  emptyClientInput,
  toClientInput,
  type ClientInput,
  type ClientRecord,
  type FieldErrors,
} from "@/lib/clients";

type ClientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ClientRecord | null;
  onSaved: (client: ClientRecord) => void;
};

export function ClientFormDialog({ open, onOpenChange, initial, onSaved }: ClientFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <ClientForm
          key={initial?.id ?? "new"}
          initial={initial}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </DialogContent>
    </Dialog>
  );
}

function ClientForm({
  initial,
  onOpenChange,
  onSaved,
}: {
  initial: ClientRecord | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (client: ClientRecord) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ClientInput>(() =>
    initial ? toClientInput(initial) : emptyClientInput(),
  );
  const [fields, setFields] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFields({});
    try {
      const response = await fetch(initial ? `/api/clients/${initial.id}` : "/api/clients", {
        method: initial ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        fields?: FieldErrors;
        client?: ClientRecord;
      } | null;
      if (response.status === 401) {
        router.push("/");
        router.refresh();
        return;
      }
      if (!response.ok || !payload?.client) {
        setFields(payload?.fields ?? {});
        setError(payload?.error || "That client could not be saved.");
        setSaving(false);
        return;
      }
      onSaved(payload.client);
      onOpenChange(false);
    } catch {
      setError("Could not reach the portal. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader className="pr-8">
            <DialogTitle>{initial ? "Edit client" : "Add client"}</DialogTitle>
            <DialogDescription>
              {initial
                ? "Update the contact, the event dates and what the job needs."
                : "Add the contact, the event dates and what the crew needs to take."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" htmlFor="client-name" required error={fields.name}>
              <Input
                id="client-name"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                className="h-11"
                placeholder="Alex Morgan"
                aria-invalid={Boolean(fields.name)}
                required
              />
            </Field>
            <Field label="Company" htmlFor="client-company" error={fields.company}>
              <Input
                id="client-company"
                value={values.company}
                onChange={(event) => update("company", event.target.value)}
                className="h-11"
                placeholder="Production company or venue"
                autoComplete="organization"
              />
            </Field>
            <Field label="Email" htmlFor="client-email" error={fields.email}>
              <Input
                id="client-email"
                type="email"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                className="h-11"
                placeholder="alex@company.com"
                autoComplete="email"
                aria-invalid={Boolean(fields.email)}
              />
            </Field>
            <Field label="Phone" htmlFor="client-phone" error={fields.phone}>
              <Input
                id="client-phone"
                type="tel"
                inputMode="tel"
                value={values.phone}
                onChange={(event) => update("phone", event.target.value)}
                className="h-11"
                placeholder="Best number to reach them"
                autoComplete="tel"
              />
            </Field>
            <Field
              label="Event name"
              htmlFor="client-event"
              error={fields.eventName}
              className="sm:col-span-2"
            >
              <Input
                id="client-event"
                value={values.eventName}
                onChange={(event) => update("eventName", event.target.value)}
                className="h-11"
                placeholder="BBC outside broadcast, Glasgow"
              />
            </Field>
            <Field label="Event start" htmlFor="client-start" error={fields.eventStart}>
              <Input
                id="client-start"
                type="date"
                value={values.eventStart}
                onChange={(event) => update("eventStart", event.target.value)}
                className="h-11"
                aria-invalid={Boolean(fields.eventStart)}
              />
            </Field>
            <Field label="Event end" htmlFor="client-end" error={fields.eventEnd}>
              <Input
                id="client-end"
                type="date"
                value={values.eventEnd}
                onChange={(event) => update("eventEnd", event.target.value)}
                className="h-11"
                aria-invalid={Boolean(fields.eventEnd)}
              />
            </Field>
            <Field
              label="What's needed for the job"
              htmlFor="client-requirements"
              error={fields.requirements}
              hint="Access points, bonded SIMs, Starlink, recording, laptops, signage."
              className="sm:col-span-2"
            >
              <Textarea
                id="client-requirements"
                value={values.requirements}
                onChange={(event) => update("requirements", event.target.value)}
                className="min-h-28"
                placeholder="What should go on the kit list?"
              />
            </Field>
            <Field
              label="Other notes"
              htmlFor="client-notes"
              error={fields.notes}
              hint="Access times, venue contacts, parking, anything the crew should know."
              className="sm:col-span-2"
            >
              <Textarea
                id="client-notes"
                value={values.notes}
                onChange={(event) => update("notes", event.target.value)}
                className="min-h-24"
                placeholder="Notes for the team"
              />
            </Field>
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="h-10 px-4" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
