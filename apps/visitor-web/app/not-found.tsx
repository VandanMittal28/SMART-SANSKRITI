import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="not-found container">
      <p className="eyebrow">Page not found</p>
      <h1>This page isn&apos;t part of the guide</h1>
      <p className="muted">The link may be mistyped, or the page may have moved.</p>
      <div className="not-found__actions">
        <Link href="/home" className="btn btn--primary">
          Go to home
        </Link>
        <Link href="/monuments" className="btn btn--secondary">
          Browse monuments
        </Link>
      </div>
    </main>
  );
}
