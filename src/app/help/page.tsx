import type { Metadata } from 'next';
import { CmsPage } from '@/components/CmsPage';

export const metadata: Metadata = { title: 'Help & Learning Tips' };

export default function Page() {
  return <CmsPage slug="help" fallbackTitle="Help & Learning Tips" />;
}
