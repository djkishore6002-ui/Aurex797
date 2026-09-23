import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getSettings } from '@/lib/cms';
import { CmsPage } from '@/components/CmsPage';
import { ContactForm } from './contact-form';

export const metadata: Metadata = { title: 'Contact' };

export default function Page() {
  const db = getDb();
  const settings = getSettings(db);
  return (
    <div>
      <CmsPage slug="contact" fallbackTitle="Contact" />
      <div className="container-page max-w-3xl pb-12">
        <ContactForm email={settings.contact_email} />
      </div>
    </div>
  );
}
