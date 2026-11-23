import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy" };
export default function PrivacyPage() {
  return (
    <article className="panel prose-panel stack">
      <h1>Privacy</h1>
      <p>
        The dashboard reads public showcase data from Enka.Network using the UID
        you enter. It has no sign-in, user database, or analytics.
      </p>
      <h2>Showcase lookups</h2>
      <p>
        The server temporarily caches public showcase responses for the duration
        Enka specifies. The lookup service also keeps short-lived, hashed
        IP-based counters to limit requests.
      </p>
      <h2>Your browser data</h2>
      <p>
        Saved teams, themes, manual builds, and imported GOOD inventory stay in
        browser storage. Damage calculations run in your browser. You can
        download your data as JSON or clear this site’s storage to remove local
        copies.
      </p>
      <h2>External data and images</h2>
      <p>
        Enka.Network serves game images. GitHub hosts the public catalog and
        descriptions the browser loads. Loading those resources makes a request
        to their hosts.
      </p>
    </article>
  );
}
