import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { OrganizerTab } from '@/components/OrganizerTab';

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  if (!['super_admin', 'organizer', 'teacher'].includes(user.role)) redirect('/dashboard');
  const items = [
    { href: '/organizer', label: 'Overview' },
    { href: '/organizer/questions', label: 'Questions' },
    { href: '/organizer/workshops', label: 'Workshops & attendance' },
  ];
  return (
    <div className="container-page py-8">
      <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50/60 px-5 py-3 text-sm text-brand-900">
        <b>Organizer / Teacher console</b> — you manage assigned courses, workshops, attendance, questions and announcements. <span className="tamil">வணக்கம், {user.name.split(' ')[0]}! 🙏</span>
      </div>
      <nav className="mb-6 flex flex-wrap gap-1.5" aria-label="Organizer">
        {items.map((it) => (
          <OrganizerTab key={it.href} href={it.href} label={it.label} />
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
