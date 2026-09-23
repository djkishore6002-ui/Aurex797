import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb, plainRows } from '@/db';
import { WatchExperience } from '@/components/WatchExperience';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

/** Static snapshot: prerender every YouTube resource watch page. */
export const generateStaticParams: () => { resourceId: string }[] =
  process.env.SOLAI_STATIC === '1'
    ? () => {
        const db = getDb();
        const rows = db
          .prepare("SELECT CAST(id AS TEXT) AS resourceId FROM learning_resources WHERE is_published = 1 AND youtube_id IS NOT NULL")
          .all() as unknown as { resourceId: string }[];
        return rows;
      }
    : () => [];

export async function generateMetadata({ params }: { params: { resourceId: string } }): Promise<Metadata> {
  const db = getDb();
  const r = db
    .prepare('SELECT title FROM learning_resources WHERE id = ? AND is_published = 1 AND youtube_id IS NOT NULL')
    .get(Number(params.resourceId)) as unknown as { title: string } | undefined;
  return { title: r ? `${r.title} · Watch` : 'Watch' };
}

export default function WatchPage({ params }: { params: { resourceId: string } }) {
  const db = getDb();
  const id = Number(params.resourceId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const resource = db
    .prepare(
      `SELECT id, title, title_tamil, description, description_tamil, language, provider, url, youtube_id, type
       FROM learning_resources WHERE id = ? AND is_published = 1 AND youtube_id IS NOT NULL`
    )
    .get(id) as
    | {
        id: number;
        title: string;
        title_tamil: string | null;
        description: string | null;
        description_tamil: string | null;
        language: string;
        provider: string;
        url: string;
        youtube_id: string;
        type: string;
      }
    | undefined;
  if (!resource) notFound();

  // Curriculum = all live-class lectures (the batch series). For a
  // non-live-class video, show the other embedded videos instead.
  const curriculum = plainRows<{ id: number; title: string; title_tamil: string | null }>(
    db
      .prepare(
        `SELECT id, title, title_tamil
         FROM learning_resources
         WHERE is_published = 1 AND youtube_id IS NOT NULL AND ${resource.type === 'live_class' ? "type = 'live_class'" : "type != 'live_class'"}
         ORDER BY sort_order, id`
      )
      .all()
  );

  const idx = curriculum.findIndex((c) => c.id === resource.id);
  const prev = idx > 0 ? curriculum[idx - 1] : null;
  const next = idx >= 0 && idx < curriculum.length - 1 ? curriculum[idx + 1] : null;

  return (
    <WatchExperience
      resource={{
        id: resource.id,
        title: resource.title,
        titleTamil: resource.title_tamil,
        description: resource.description,
        descriptionTamil: resource.description_tamil,
        language: resource.language,
        provider: resource.provider,
        url: resource.url,
        youtubeId: resource.youtube_id,
        isLiveClass: resource.type === 'live_class',
      }}
      curriculum={curriculum}
      prev={prev}
      next={next}
      currentIndex={idx}
    />
  );
}
