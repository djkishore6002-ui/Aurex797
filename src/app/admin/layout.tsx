import { redirect } from 'next/navigation';
import { getCurrentUser, isAdmin } from '@/lib/auth';
import { AdminShell } from '@/components/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  if (!isAdmin(user)) redirect('/dashboard');
  return (
    <AdminShell user={{ name: user.name }}>
      {children}
    </AdminShell>
  );
}
