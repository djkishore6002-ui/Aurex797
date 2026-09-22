import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { totalXp, computeStreak, vocabLearnedCount } from '@/lib/gamify';
import { PageHead, StatCard, Badge } from '@/components/ui';
import { ProfileClient } from './profile-client';

export const metadata: Metadata = { title: 'My profile' };

export default function ProfilePage() {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  const db = getDb();

  const full = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as unknown as {
    name: string;
    email: string;
    native_language: string | null;
    tamil_level: string | null;
    learning_goal: string | null;
    bio: string | null;
    privacy_public: number;
    role: string;
  };

  const xp = totalXp(db, user.id);
  const streak = computeStreak(db, user.id);
  const vocab = vocabLearnedCount(db, user.id);

  const enrollments = db
    .prepare('SELECT c.title, c.slug FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ? AND e.status = ?')
    .all(user.id, 'active') as unknown as { title: string; slug: string }[];
  const regs = db
    .prepare('SELECT w.title, w.slug FROM workshop_registrations r JOIN workshops w ON w.id = r.workshop_id WHERE r.user_id = ? AND r.status IN (\'CONFIRMED\',\'PAID\',\'PENDING\')')
    .all(user.id) as unknown as { title: string; slug: string }[];
  const certs = db
    .prepare('SELECT certificate_id, title_text, revoked_at FROM certificates WHERE user_id = ? ORDER BY issued_at DESC')
    .all(user.id) as unknown as { certificate_id: string; title_text: string; revoked_at: string | null }[];
  const byoai = (() => {
    const row = db.prepare('SELECT key_hint FROM user_ai_keys WHERE user_id = ?').get(user.id) as unknown as { key_hint: string } | null;
    const settings = db.prepare('SELECT byoai_enabled FROM ai_provider_settings WHERE id = 1').get() as unknown as { byoai_enabled: number } | null;
    return { hint: row?.key_hint ?? null, enabled: settings?.byoai_enabled === 1 };
  })();

  return (
    <div className="container-page py-10">
      <PageHead title={`My profile`} subtitle={`${full.email} · ${full.role.replace('_', ' ')} account`} />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfileClient
            user={{
              name: full.name,
              native_language: full.native_language ?? 'en',
              tamil_level: full.tamil_level ?? 'beginner',
              learning_goal: full.learning_goal ?? '',
              bio: full.bio ?? '',
              privacy_public: full.privacy_public === 1,
            }}
            byoai={byoai}
          />

          <section className="card p-6" aria-label="Learning">
            <h2 className="font-bold text-ink-950">Learning</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">Enrolled courses</h3>
                {enrollments.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-500">Not enrolled yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {enrollments.map((e) => (
                      <li key={e.slug}>
                        <a href={`/learn/${e.slug}`} className="text-sm font-semibold text-brand-700 hover:underline">
                          {e.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-ink-400">Workshop registrations</h3>
                {regs.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-500">None yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {regs.map((r) => (
                      <li key={r.slug}>
                        <a href={`/workshops/${r.slug}`} className="text-sm font-semibold text-brand-700 hover:underline">
                          {r.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="XP" value={xp} icon="⚡" />
            <StatCard label="Streak" value={`${streak}🔥`} icon="📅" />
            <StatCard label="Words" value={vocab} icon="📝" />
          </div>
          <section className="card p-6" aria-label="Certificates">
            <h2 className="font-bold text-ink-950">Certificates</h2>
            {certs.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">None yet — reach 90% to earn one.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {certs.map((c) => (
                  <li key={c.certificate_id} className="flex items-center justify-between gap-2 rounded-xl border border-ink-100 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{c.title_text}</p>
                      <p className="text-[11px] text-ink-400">{c.certificate_id}</p>
                    </div>
                    {c.revoked_at ? <Badge tone="danger">Revoked</Badge> : <a href={`/verify/${c.certificate_id}`} className="text-xs font-semibold text-brand-700 hover:underline">Verify</a>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
