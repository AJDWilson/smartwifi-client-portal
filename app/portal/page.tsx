import type { Metadata } from "next";
import { PortalApp } from "@/components/portal-app";

export const metadata: Metadata = {
  title: "Clients",
};

export default function PortalPage() {
  return <PortalApp />;
}
