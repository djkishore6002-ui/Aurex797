import type { Metadata } from 'next';
import { CmsPage } from '@/components/CmsPage';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function Page() {
  return <CmsPage slug="privacy" fallbackTitle="Privacy Policy" />;
}
