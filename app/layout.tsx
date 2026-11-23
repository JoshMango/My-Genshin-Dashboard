import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardProvider } from "@/components/dashboard-state";
import { ThemeController } from "@/components/theme-controller";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "My Genshin Dashboard",
    template: "%s · My Genshin Dashboard",
  },
  description:
    "Explore your Genshin Impact showcase, plan teams, and compare builds.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeController />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="shell header-content">
            <Link className="brand" href="/">
              <span aria-hidden="true">◆</span> My Genshin Dashboard
            </Link>
            <nav aria-label="Main navigation" className="main-nav">
              <Link href="/">Profile</Link>
              <Link href="/teams">Team builder</Link>
              <Link href="/compare">Compare</Link>
              <Link href="/settings">Settings</Link>
            </nav>
          </div>
        </header>
        <main className="shell" id="main" tabIndex={-1}>
          <DashboardProvider>{children}</DashboardProvider>
        </main>
        <footer className="shell site-footer">
          Fan project. Genshin Impact assets belong to HoYoverse. This project
          is unaffiliated with and unendorsed by HoYoverse.
        </footer>
      </body>
    </html>
  );
}
