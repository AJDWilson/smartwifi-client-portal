import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Client portal | SmartWifi",
    template: "%s | SmartWifi",
  },
  description:
    "SmartWifi client portal for event contacts, dates and what each job needs.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <Toaster position="top-center" theme="light" />
      </body>
    </html>
  );
}
