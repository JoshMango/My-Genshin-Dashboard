import Link from "next/link";

export default function NotFound() {
  return (
    <section className="panel stack">
      <h1>Page unavailable</h1>
      <p>Check the address or return to your roster.</p>
      <p>
        <Link href="/">Return to Profile</Link>
      </p>
    </section>
  );
}
