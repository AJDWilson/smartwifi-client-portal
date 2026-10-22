"use client";

import { Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  eventPhase,
  formatEventDates,
  phaseLabel,
  type ClientGroup,
  type ClientRecord,
} from "@/lib/clients";
import { cn } from "cn";

export function ClientList({
  groups,
  today,
  onEdit,
  onDelete,
}: {
  groups: ClientGroup[];
  today: string;
  onEdit: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-foreground/10">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h2 className="border-b border-border bg-muted px-4 py-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:px-5">
            {group.label}
          </h2>
          <ul>
            {group.clients.map((client) => {
              const phase = eventPhase(client, today);
              return (
                <li key={client.id} className="border-b border-border last:border-b-0">
                  <article className="px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                      <div className="sm:w-44 sm:shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatEventDates(client.eventStart, client.eventEnd)}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "mt-2",
                            phase === "onsite" && "border-transparent bg-brand text-white",
                            phase === "tbc" && "border-amber-300 bg-amber-50 text-amber-950",
                            phase === "complete" && "text-muted-foreground",
                          )}
                        >
                          {phaseLabel(phase)}
                        </Badge>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold tracking-tight">
                              {client.eventName || "Untitled event"}
                            </h3>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {client.name}
                              {client.company ? ` · ${client.company}` : ""}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(client)}>
                              <Pencil />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => onDelete(client)}
                            >
                              <Trash2 />
                              Delete
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5">
                          {client.phone ? (
                            <a
                              href={`tel:${client.phone.replace(/\s/g, "")}`}
                              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                            >
                              <Phone className="size-3.5" />
                              {client.phone}
                            </a>
                          ) : null}
                          {client.email ? (
                            <a
                              href={`mailto:${client.email}`}
                              className="inline-flex min-w-0 items-center gap-1.5 font-medium break-all text-primary hover:underline"
                            >
                              <Mail className="size-3.5 shrink-0" />
                              {client.email}
                            </a>
                          ) : null}
                        </div>
                        {client.requirements ? (
                          <p className="mt-3 text-sm leading-6 whitespace-pre-wrap text-foreground">
                            <span className="font-semibold">Needed: </span>
                            {client.requirements}
                          </p>
                        ) : null}
                        {client.notes ? (
                          <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                            {client.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
