import Image from "next/image";
import { cn } from "cn";

export function SmartWifiLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/smartwifi-logo.png"
      alt="SmartWifi"
      width={510}
      height={160}
      priority
      className={cn("h-10 w-auto", className)}
      style={{ width: "auto" }}
    />
  );
}

export function WifiMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <path d="M60 98a7 7 0 1 1 .01 0" fill="currentColor" />
      <path
        d="M36 78a34 34 0 0 1 48 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M20 60a56 56 0 0 1 80 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M4 42a78 78 0 0 1 112 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
    </svg>
  );
}
