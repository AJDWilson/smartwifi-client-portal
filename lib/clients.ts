export type ClientInput = {
  name: string;
  email: string;
  phone: string;
  company: string;
  eventName: string;
  requirements: string;
  notes: string;
  eventStart: string;
  eventEnd: string;
};

export type ClientRecord = ClientInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type FieldErrors = Partial<Record<keyof ClientInput, string>>;

export type ClientFilter = "upcoming" | "all" | "past";

export type EventPhase = "tbc" | "upcoming" | "onsite" | "complete";

export type ClientGroup = {
  key: string;
  label: string;
  clients: ClientRecord[];
};

const LIMITS: Record<keyof ClientInput, number> = {
  name: 120,
  email: 200,
  phone: 40,
  company: 160,
  eventName: 160,
  requirements: 4000,
  notes: 4000,
  eventStart: 10,
  eventEnd: 10,
};

const RECORD_FIELDS = [
  "id",
  "name",
  "email",
  "phone",
  "company",
  "eventName",
  "requirements",
  "notes",
  "eventStart",
  "eventEnd",
  "createdAt",
  "updatedAt",
] as const;

export function emptyClientInput(): ClientInput {
  return {
    name: "",
    email: "",
    phone: "",
    company: "",
    eventName: "",
    requirements: "",
    notes: "",
    eventStart: "",
    eventEnd: "",
  };
}

export function toClientInput(client: ClientRecord): ClientInput {
  return {
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    eventName: client.eventName,
    requirements: client.requirements,
    notes: client.notes,
    eventStart: client.eventStart,
    eventEnd: client.eventEnd,
  };
}

export function isClientRecord(value: unknown): value is ClientRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return RECORD_FIELDS.every(
    (field) => typeof record[field] === "string" && (field !== "id" || record.id !== ""),
  );
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, max);
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1990 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseClientInput(
  raw: unknown,
): { ok: true; value: ClientInput } | { ok: false; error: string; fields: FieldErrors } {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const value: ClientInput = {
    name: cleanText(source.name, LIMITS.name),
    email: cleanText(source.email, LIMITS.email),
    phone: cleanText(source.phone, LIMITS.phone),
    company: cleanText(source.company, LIMITS.company),
    eventName: cleanText(source.eventName, LIMITS.eventName),
    requirements: cleanText(source.requirements, LIMITS.requirements),
    notes: cleanText(source.notes, LIMITS.notes),
    eventStart: cleanText(source.eventStart, LIMITS.eventStart),
    eventEnd: cleanText(source.eventEnd, LIMITS.eventEnd),
  };

  const fields: FieldErrors = {};
  if (!value.name) fields.name = "Enter the client name.";
  if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    fields.email = "Enter a valid email address.";
  }
  if (value.eventStart && !isRealDate(value.eventStart)) {
    fields.eventStart = "Use a real start date.";
  }
  if (value.eventEnd && !isRealDate(value.eventEnd)) {
    fields.eventEnd = "Use a real end date.";
  }
  if (value.eventEnd && !value.eventStart && !fields.eventEnd) {
    fields.eventStart = "Add a start date, or clear the end date.";
  }
  if (
    value.eventStart &&
    value.eventEnd &&
    !fields.eventStart &&
    !fields.eventEnd &&
    value.eventEnd < value.eventStart
  ) {
    fields.eventEnd = "The end date cannot be before the start date.";
  }

  if (Object.keys(fields).length > 0) {
    return { ok: false, error: "Check the highlighted fields.", fields };
  }
  return { ok: true, value };
}

export function londonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function eventPhase(client: ClientRecord, today: string): EventPhase {
  if (!client.eventStart) return "tbc";
  const end = client.eventEnd || client.eventStart;
  if (end < today) return "complete";
  if (client.eventStart <= today && today <= end) return "onsite";
  return "upcoming";
}

export function phaseLabel(phase: EventPhase): string {
  switch (phase) {
    case "tbc":
      return "Date to confirm";
    case "upcoming":
      return "Upcoming";
    case "onsite":
      return "On site";
    case "complete":
      return "Complete";
  }
}

function dateParts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    year,
    month,
    day,
    monthLabel: new Intl.DateTimeFormat("en-GB", {
      month: "short",
      timeZone: "UTC",
    }).format(date),
  };
}

export function formatEventDates(start: string, end: string): string {
  if (!start) return "Date to be confirmed";
  const from = dateParts(start);
  if (!end || end === start) return `${from.day} ${from.monthLabel} ${from.year}`;
  const to = dateParts(end);
  if (from.year === to.year && from.month === to.month) {
    return `${from.day}–${to.day} ${from.monthLabel} ${from.year}`;
  }
  if (from.year === to.year) {
    return `${from.day} ${from.monthLabel} – ${to.day} ${to.monthLabel} ${from.year}`;
  }
  return `${from.day} ${from.monthLabel} ${from.year} – ${to.day} ${to.monthLabel} ${to.year}`;
}

export function monthLabel(key: string): string {
  if (key === "tbc") return "Date to be confirmed";
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function matchesQuery(client: ClientRecord, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    client.name,
    client.email,
    client.phone,
    client.company,
    client.eventName,
    client.requirements,
    client.notes,
  ]
    .join("\n")
    .toLowerCase();
  if (haystack.includes(needle)) return true;
  const digits = needle.replace(/\D/g, "");
  return digits.length >= 4 && client.phone.replace(/\D/g, "").includes(digits);
}

function inFilter(client: ClientRecord, filter: ClientFilter, today: string): boolean {
  const phase = eventPhase(client, today);
  if (filter === "all") return true;
  if (filter === "past") return phase === "complete";
  return phase !== "complete";
}

function compareClients(a: ClientRecord, b: ClientRecord): number {
  const byDate = (a.eventStart || "9999-99-99").localeCompare(b.eventStart || "9999-99-99");
  if (byDate !== 0) return byDate;
  return a.name.localeCompare(b.name, "en-GB");
}

export function organiseClients(
  clients: ClientRecord[],
  filter: ClientFilter,
  today: string,
  query: string,
): ClientGroup[] {
  const matching = clients.filter(
    (client) => inFilter(client, filter, today) && matchesQuery(client, query),
  );
  const buckets = new Map<string, ClientRecord[]>();
  for (const client of matching) {
    const key = client.eventStart ? client.eventStart.slice(0, 7) : "tbc";
    const bucket = buckets.get(key);
    if (bucket) bucket.push(client);
    else buckets.set(key, [client]);
  }

  const keys = [...buckets.keys()].sort((a, b) => {
    if (a === "tbc") return -1;
    if (b === "tbc") return 1;
    if (filter === "past") return b.localeCompare(a);
    return a.localeCompare(b);
  });

  return keys.map((key) => ({
    key,
    label: monthLabel(key),
    clients: (buckets.get(key) ?? []).slice().sort(compareClients),
  }));
}

export function summarise(clients: ClientRecord[], today: string) {
  const counts = { total: clients.length, upcoming: 0, onSite: 0, undated: 0, past: 0 };
  for (const client of clients) {
    const phase = eventPhase(client, today);
    if (phase === "tbc") counts.undated += 1;
    else if (phase === "complete") counts.past += 1;
    else if (phase === "onsite") counts.onSite += 1;
    else counts.upcoming += 1;
  }
  return counts;
}
