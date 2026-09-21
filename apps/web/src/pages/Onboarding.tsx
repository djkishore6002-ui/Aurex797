import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
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
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

const steps = ['goal', 'level', 'language', 'done'] as const;
const LEVELS = [
  { k: 'absolute_beginner', label: 'Absolute Beginner', desc: 'I know zero Tamil.' },
  { k: 'beginner', label: 'Beginner', desc: 'I know a few words.' },
  { k: 'intermediate', label: 'Intermediate', desc: 'I can hold simple conversations.' },
  { k: 'advanced', label: 'Advanced', desc: 'I want to polish my fluency.' },
];

export default function Onboarding() {
  const { refresh, profile } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<number>(() => (profile?.native_language && profile?.learning_goal ? 3 : 0));
  const [goal, setGoal] = useState<string>('');
  const [level, setLevel] = useState<string>('absolute_beginner');
  const [lang, setLang] = useState<string>('en');
  const [saving, setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    try {
      await api('/auth/me', { method: 'PATCH', json: { learning_goal: goal, level, native_language: lang } });
      await refresh();
      nav('/');
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen hero-grad flex items-center justify-center p-4">
      <div className="card p-8 w-full max-w-xl shadow-xl animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-white font-tamil font-bold text-xl">த</div>
          <div className="font-extrabold text-xl">Personalize your Tamil journey</div>
        </div>
        <div className="progress-track mb-6"><div className="progress-fill" style={{ width: `${((step+1)/steps.length)*100}%` }}></div></div>

        {step === 0 && (
          <div>
            <h2 className="text-xl font-bold">Why are you learning Tamil?</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {LEARNING_GOALS.map(g => (
                <button key={g.key} onClick={() => setGoal(g.key)} className={`card p-4 text-left hover:border-brand-400 transition ${goal===g.key?'border-brand-500 bg-brand-50 dark:bg-brand-500/10':''}`}>
                  <div className="font-semibold">{g.label}</div>
                  <div className="font-tamil text-sm text-brand-700 mt-1">{g.label_ta}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold">What's your current level?</h2>
            <div className="mt-4 space-y-2">
              {LEVELS.map(l => (
                <button key={l.k} onClick={() => setLevel(l.k)} className={`w-full card p-4 text-left hover:border-brand-400 transition ${level===l.k?'border-brand-500 bg-brand-50 dark:bg-brand-500/10':''}`}>
                  <div className="font-semibold">{l.label}</div>
                  <div className="text-sm text-stone-500">{l.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold">What language should we explain in?</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {NATIVE_LANGUAGES.filter(n => n.code !== 'ta').map(l => (
                <button key={l.code} onClick={() => setLang(l.code)} className={`card p-4 text-left hover:border-brand-400 transition ${lang===l.code?'border-brand-500 bg-brand-50 dark:bg-brand-500/10':''}`}>
                  <div className="font-semibold">{l.native}</div>
                  <div className="text-sm text-stone-500">{l.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-8">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-extrabold mt-4">You're ready!</h2>
            <p className="text-stone-500 mt-2">We'll start you on "Tamil from Zero" and personalize recommendations.</p>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <button className="btn-ghost" disabled={step===0} onClick={() => setStep(s => Math.max(0, s-1))}>Back</button>
          {step < steps.length - 1
            ? <button className="btn-primary" disabled={(step===0 && !goal)} onClick={() => setStep(s => s+1)}>Continue →</button>
            : <button className="btn-primary" disabled={saving} onClick={finish}>{saving ? 'Saving…' : 'Start learning →'}</button>}
        </div>
      </div>
    </div>
  );
}
