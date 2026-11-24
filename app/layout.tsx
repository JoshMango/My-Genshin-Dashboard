import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DashboardProvider } from "@/components/dashboard-state";
import { CharacterDrawerProvider } from "@/components/character-drawer";
import { MainNav } from "@/components/main-nav";
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
      <head>
        <link
          rel="preload"
          href="/fonts/source-sans-3-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <ThemeController />
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="shell header-content">
            <Link className="brand" href="/">
              <span className="brand-mark" aria-hidden="true">
                ✦
              </span>
              <span>My Genshin Dashboard</span>
            </Link>
            <MainNav />
          </div>
        </header>
        <main className="shell" id="main" tabIndex={-1}>
          <DashboardProvider>
            <CharacterDrawerProvider>{children}</CharacterDrawerProvider>
          </DashboardProvider>
        </main>
        <footer className="shell site-footer">
          <p>
            Fan project. Genshin Impact assets belong to HoYoverse. This project
            is unaffiliated with and unendorsed by HoYoverse.
          </p>
          <nav aria-label="Project information" className="main-nav">
            <Link href="/privacy">Privacy</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
