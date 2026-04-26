import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white px-6">
      {/* Header */}
      <header className="flex items-center justify-between pt-10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center">
            <span className="text-white font-black text-lg">S</span>
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-900 tracking-widest leading-none">SWARM</p>
            <p className="text-xs font-bold text-zinc-900 tracking-widest leading-none">GALLERY</p>
          </div>
        </div>
        <span className="text-xs border border-zinc-200 rounded-full px-3 py-1 text-zinc-500">offline ready</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center gap-10">
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl font-black text-zinc-900 leading-tight">
            Your event.<br />
            <span className="bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
              Everyone&apos;s
            </span>
            <br />gallery.
          </h1>
          <p className="text-base text-zinc-500 leading-relaxed max-w-xs">
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
                <span className="text-sm font-semibold text-zinc-700">{label}</span>
              </div>
              {i < 2 && <div className="w-8 h-0.5 bg-violet-200 mb-6 mx-1" />}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <Link
            href="/event/demo"
            className="w-full bg-zinc-900 text-white font-bold text-base py-4 rounded-2xl text-center hover:bg-zinc-700 transition-colors"
          >
            Get Started
          </Link>
          <p className="text-xs text-zinc-400 text-center">No account needed · Work without Wi-Fi</p>
        </div>
      </main>
    </div>
  );
}
