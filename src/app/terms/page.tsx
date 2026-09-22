import type { Metadata } from 'next';
import { CmsPage } from '@/components/CmsPage';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function Page() {
  return <CmsPage slug="terms" fallbackTitle="Terms of Service" />;
}
