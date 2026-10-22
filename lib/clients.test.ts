import assert from "node:assert/strict";
import test from "node:test";
import {
  eventPhase,
  formatEventDates,
  organiseClients,
  parseClientInput,
  summarise,
  type ClientRecord,
} from "./clients";

function record(overrides: Partial<ClientRecord>): ClientRecord {
  return {
    id: overrides.id ?? "11111111-1111-4111-8111-111111111111",
    name: "Alex Morgan",
    email: "alex@example.com",
    phone: "07973 330183",
    company: "Northbank Live",
    eventName: "Outside broadcast",
    requirements: "Bonded 5G and two access points",
    notes: "Load-in from 6am",
    eventStart: "2026-10-22",
    eventEnd: "2026-10-23",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

test("client details are trimmed and checked", () => {
  const parsed = parseClientInput({
    name: "  Alex Morgan  ",
    email: "alex@example.com",
    phone: " 07900 000000 ",
    eventName: " Awards ",
    eventStart: "2026-11-02",
    eventEnd: "2026-11-02",
    requirements: "Starlink Mini\r\nLaptop hire",
    notes: "",
    company: "",
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.name, "Alex Morgan");
  assert.equal(parsed.value.requirements, "Starlink Mini\nLaptop hire");
});

test("missing name, bad email and reversed dates are rejected", () => {
  const parsed = parseClientInput({
    name: " ",
    email: "not-an-email",
    eventStart: "2026-12-02",
    eventEnd: "2026-12-01",
  });
  assert.equal(parsed.ok, false);
  if (parsed.ok) return;
  assert.equal(parsed.fields.name, "Enter the client name.");
  assert.equal(parsed.fields.email, "Enter a valid email address.");
  assert.equal(parsed.fields.eventEnd, "The end date cannot be before the start date.");
});

test("event dates are formatted for the UK", () => {
  assert.equal(formatEventDates("", ""), "Date to be confirmed");
  assert.equal(formatEventDates("2026-10-22", ""), "22 Oct 2026");
  assert.equal(formatEventDates("2026-10-22", "2026-10-24"), "22–24 Oct 2026");
  assert.equal(formatEventDates("2026-10-30", "2026-11-02"), "30 Oct – 2 Nov 2026");
});

test("jobs are grouped into open, on site and past", () => {
  const today = "2026-10-22";
  const clients = [
    record({ id: "1", eventStart: "2026-10-22", eventEnd: "2026-10-23", eventName: "Live now" }),
    record({ id: "2", eventStart: "2026-11-04", eventEnd: "", eventName: "Next month", name: "Sam" }),
    record({ id: "3", eventStart: "", eventEnd: "", eventName: "Enquiry", name: "Jo" }),
    record({ id: "4", eventStart: "2026-09-01", eventEnd: "2026-09-02", eventName: "Done", name: "Pat" }),
  ];

  assert.equal(eventPhase(clients[0], today), "onsite");
  assert.equal(eventPhase(clients[1], today), "upcoming");
  assert.equal(eventPhase(clients[2], today), "tbc");
  assert.equal(eventPhase(clients[3], today), "complete");

  const upcoming = organiseClients(clients, "upcoming", today, "");
  assert.deepEqual(
    upcoming.map((group) => group.label),
    ["Date to be confirmed", "October 2026", "November 2026"],
  );
  assert.equal(upcoming[0].clients[0].eventName, "Enquiry");

  const past = organiseClients(clients, "past", today, "pat");
  assert.equal(past.length, 1);
  assert.equal(past[0].clients[0].eventName, "Done");

  assert.deepEqual(summarise(clients, today), {
    total: 4,
    upcoming: 1,
    onSite: 1,
    undated: 1,
    past: 1,
  });
});
