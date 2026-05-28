import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen px-6" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="flex items-center justify-between pt-10 pb-4">
        <div className="flex items-center gap-3">
          <img src="/logo-512.png" alt="Swarm Gallery" className="w-12 h-12 rounded-2xl object-cover shrink-0" />
          <div>
            <p className="text-xs font-bold tracking-widest leading-none" style={{ color: 'var(--ink)' }}>SWARM</p>
            <p className="text-xs font-bold tracking-widest leading-none" style={{ color: 'var(--ink)' }}>GALLERY</p>
          </div>
        </div>
        <span
          className="text-xs rounded-full px-3 py-1"
          style={{ border: '1px solid var(--line)', color: 'var(--muted)' }}
        >
          offline ready
        </span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center gap-10">
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-black leading-tight" style={{ color: 'var(--ink)' }}>
            Your event.<br />
            <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
              Everyone&apos;s
            </span>
            <br />gallery.
          </h1>
          <p className="text-base leading-relaxed max-w-xs" style={{ color: 'var(--ink-soft)' }}>
            Share photos instantly at any event — no internet needed. Just scan a QR code and join the swarm.
          </p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-0">
          {['Scan', 'Join', 'Share'].map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full border-2 border-violet-400 flex items-center justify-center">
                  <span className="text-violet-600 font-bold text-lg">{i + 1}</span>
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--ink-soft)' }}>{label}</span>
              </div>
              {i < 2 && <div className="w-8 h-0.5 mb-6 mx-1" style={{ background: 'var(--violet-tint)' }} />}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Link
            href="/event/demo"
            className="w-full text-white font-bold text-base py-4 rounded-2xl text-center transition-opacity active:opacity-80"
            style={{ background: 'var(--ink)' }}
          >
            Get Started
          </Link>
          <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>No account needed · Work without Wi-Fi</p>
        </div>
      </main>
    </div>
  );
}
