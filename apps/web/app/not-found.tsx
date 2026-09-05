import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main className="state-page">
      <div>
        <p className="eyebrow">404</p>
        <h1>Хуудас олдсонгүй</h1>
        <p>Page not found.</p>
        <div className="actions">
          <Link className="btn" href="/mn">UB CIRCUS</Link>
        </div>
      </div>
    </main>
  );
}
