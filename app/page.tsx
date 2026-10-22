import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { SmartWifiLogo, WifiMark } from "@/components/smartwifi-logo";
import { brand } from "@/lib/brand";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="h-1 bg-brand" />
      <div className="grid flex-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <section className="flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
          <a href={brand.site} className="w-fit">
            <SmartWifiLogo />
          </a>
          <div className="mt-10 max-w-xl lg:my-auto">
            <p className="text-sm font-semibold tracking-[0.16em] text-brand uppercase">
              Event WiFi hire
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-secondary sm:text-5xl">
              Client portal
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              Keep every client, company, event date and kit requirement in one place. Sign in from
              the office or on site and the same list is there.
            </p>
            <ul className="mt-8 grid gap-3 text-sm text-foreground sm:grid-cols-2">
              <li className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-foreground/10">
                Contacts, companies and phone numbers
              </li>
              <li className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-foreground/10">
                Event names and the dates they run
              </li>
              <li className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-foreground/10 sm:col-span-2">
                What the job needs, plus notes for the crew
              </li>
            </ul>
          </div>
          <ContactLine className="mt-10 hidden lg:block" />
        </section>

        <section className="relative flex items-center overflow-hidden bg-secondary px-6 py-12 sm:px-10 lg:px-12">
          <WifiMark className="pointer-events-none absolute -right-10 -bottom-8 h-72 w-72 text-brand/35" />
          <div className="pointer-events-none absolute -top-16 left-8 h-48 w-48 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative w-full max-w-md">
            <Suspense fallback={<div className="h-96 rounded-2xl bg-white shadow-2xl" />}>
              <LoginForm />
            </Suspense>
          </div>
        </section>
      </div>
      <ContactLine className="border-t border-border px-6 py-5 lg:hidden" />
    </div>
  );
}

function ContactLine({ className }: { className?: string }) {
  return (
    <p className={`text-sm leading-6 text-muted-foreground ${className ?? ""}`}>
      <span className="font-medium text-foreground">{brand.phoneDisplay}</span>
      <span> · 24hr · </span>
      <a className="font-medium text-primary hover:underline" href={brand.emailHref}>
        {brand.email}
      </a>
      <span className="mt-1 block">{brand.addressInline}</span>
    </p>
  );
}
