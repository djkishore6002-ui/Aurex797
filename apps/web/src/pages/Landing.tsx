import { Link } from 'react-router-dom';

const LEARNING_GOALS = [
  { key: 'travel', label: 'Travel', label_ta: 'பயணம்' },
  { key: 'work', label: 'Work', label_ta: 'வேலை' },
  { key: 'education', label: 'Education', label_ta: 'கல்வி' },
  { key: 'family', label: 'Family', label_ta: 'குடும்பம்' },
  { key: 'conversation', label: 'Conversation', label_ta: 'உரையாடல்' },
  { key: 'reading', label: 'Reading', label_ta: 'வாசிப்பு' },
  { key: 'writing', label: 'Writing', label_ta: 'எழுத்து' },
  { key: 'personal', label: 'Personal interest', label_ta: 'தனிப்பட்ட விருப்பம்' },
];
const NATIVE_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
];

export default function Landing() {
  return (
    <div className="hero-grad min-h-screen">
      <nav className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-white font-tamil font-bold text-xl shadow-glow">த</div>
          <div className="font-extrabold text-xl">Aurex</div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost">Log in</Link>
          <Link to="/register" className="btn-primary">Get started free</Link>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-5 pt-8 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-in">
          <span className="badge bg-white border border-stone-200 text-stone-700 shadow-sm">🎓 AUREX'26 Track 01</span>
          <h1 className="mt-5 text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Learn <span className="font-tamil bg-gradient-to-r from-brand-600 to-tamil-600 bg-clip-text text-transparent">தமிழ்</span><br/>
            like you'd live it.
          </h1>
          <p className="mt-5 text-lg text-stone-600 dark:text-stone-300 max-w-xl">
            Video lessons, an AI Tamil tutor, live workshops, speaking practice, and verifiable certificates — built for beginners, travelers, diaspora, and pros.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary text-base px-6 py-3">Start learning free →</Link>
            <Link to="/login" className="btn-secondary text-base px-6 py-3">I have an account</Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">✓ 100% free workshops</div>
            <div className="flex items-center gap-2">✓ Offline learning</div>
            <div className="flex items-center gap-2">✓ AI + human teachers</div>
          </div>
        </div>

        <div className="relative">
          <div className="card p-6 shadow-xl rotate-1 animate-fade-in">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-brand-100 via-orange-50 to-tamil-100 relative overflow-hidden flex items-center justify-center">
              <button className="w-20 h-20 rounded-full bg-white/90 shadow-xl flex items-center justify-center text-2xl pulse-ring">▶</button>
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3">
                <div className="text-xs font-tamil font-bold text-white bg-black/40 px-2 py-1 rounded backdrop-blur">வணக்கம்!</div>
                <div className="flex-1 progress-track bg-white/30"><div className="progress-fill w-1/3"></div></div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">Greetings & Politeness</div>
                <div className="text-sm text-stone-500">Tamil from Zero · Lesson 3</div>
              </div>
              <div className="badge bg-brand-50 text-brand-700">+20 XP</div>
            </div>
          </div>
          <div className="card p-4 shadow-lg absolute -bottom-6 -left-6 w-60 -rotate-3 hidden sm:block">
            <div className="flex items-center gap-2 text-sm font-semibold">🤖 AI Tutor</div>
            <div className="mt-2 text-sm text-stone-600 dark:text-stone-300">
              <span className="font-tamil text-brand-600">நன்றி</span> = Thank you. Reply: அதற்கொன்றுமில்லை (You're welcome).
            </div>
          </div>
          <div className="card p-4 shadow-lg absolute -top-4 -right-2 w-56 rotate-3 hidden sm:block">
            <div className="text-xs text-stone-500">Streak</div>
            <div className="text-2xl font-extrabold">12 🔥</div>
            <div className="text-xs text-stone-500 mt-1">486 words · 73 lessons</div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 py-14 grid md:grid-cols-4 gap-4">
        {[
          { icon: '🎥', title: 'Video lessons', desc: 'YouTube-style player with captions, transcripts, chapter marks, and resume.' },
          { icon: '🤖', title: 'AI Tamil tutor', desc: 'Ask anything. Platform AI or bring your own OpenRouter key.' },
          { icon: '🎓', title: 'Live workshops', desc: 'Join live sessions, get attendance, earn verifiable certificates.' },
          { icon: '📴', title: 'Offline-first', desc: 'Download lessons, sync progress when you reconnect.' },
        ].map(f => (
          <div key={f.title} className="card p-5 hover:shadow-md transition">
            <div className="text-3xl">{f.icon}</div>
            <div className="mt-3 font-bold">{f.title}</div>
            <div className="text-sm text-stone-500 dark:text-stone-400 mt-1">{f.desc}</div>
          </div>
        ))}
      </section>

      <section className="max-w-7xl mx-auto px-5 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold">Why are you learning Tamil?</h2>
          <p className="text-stone-500 mt-2">We'll personalize your journey.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {LEARNING_GOALS.map(g => (
            <div key={g.key} className="card p-5 text-center hover:border-brand-400 hover:shadow-md transition cursor-pointer">
              <div className="text-sm text-stone-500">{g.label}</div>
              <div className="font-tamil text-xl mt-1 text-brand-700">{g.label_ta}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-5 py-14">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold">Learn in your language</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {NATIVE_LANGUAGES.map(l => (
            <div key={l.code} className="card px-5 py-3 flex items-center gap-3">
              <span className="text-xl">{l.native}</span>
              <span className="text-sm text-stone-500">{l.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 py-14 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold">Ready to speak your first தமிழ்?</h2>
        <Link to="/register" className="btn-primary mt-6 text-lg px-8 py-3.5">Create free account →</Link>
      </section>

      <footer className="border-t border-stone-200 dark:border-slate-800 py-8 text-center text-sm text-stone-500">
        © 2026 Aurex — Built for AUREX'26 Track 01 · <Link to="/verify/demo" className="underline">Verify a certificate</Link>
      </footer>
    </div>
  );
}
