import { hashPassword } from '@/lib/auth';
import { reindexAll } from '@/lib/ai/knowledge';
import { seedContentResources } from '@/db/seed-content';
import type { DB } from './index';

/**
 * DEVELOPMENT SEED DATA
 * =====================
 * Creates demo users (clearly identifiable demo accounts), courses with a real
 * Tamil curriculum, workshops, attendance, a certificate, communities, FAQ,
 * scenarios and indexes the AI knowledge base.
 *
 * DEMO ACCOUNTS (shown on the login page when this data exists):
 *   admin@solai.test      admin1234      (Super Admin)
 *   organizer@solai.test  organizer1234  (Organizer)
 *   teacher@solai.test    teacher1234    (Teacher)
 *   priya@solai.test      learner1234    (Learner — enrolled, has a certificate)
 *   marco@solai.test      learner1234    (Learner — beginner)
 */
export function seedDatabase(db: DB): void {
  const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();
  const days = (n: number) => n * 86400_000;

  /* ── Users ── */
  const insUser = db.prepare(
    `INSERT INTO users (email, password_hash, role, name, native_language, tamil_level, learning_goal, bio, is_active, email_verified)
     VALUES (?,?,?,?,?,?,?,?,1,1)`
  );
  const admin = insUser.run('admin@solai.test', hashPassword('admin1234'), 'super_admin', 'Aruna Krishnan', 'ta', 'native', 'Platform admin', 'Super Admin — keeps the garden growing.');
  const organizer = insUser.run('organizer@solai.test', hashPassword('organizer1234'), 'organizer', 'Meera Raghavan', 'ta', 'native', 'Runs workshops & courses', 'Organizer for Solai workshops.');
  const teacher = insUser.run('teacher@solai.test', hashPassword('teacher1234'), 'teacher', 'Anitha Subramanian', 'ta', 'native', 'Teaches Tamil', 'Tamil teacher with 12 years of experience.');
  const priya = insUser.run('priya@solai.test', hashPassword('learner1234'), 'learner', 'Priya Nair', 'en', 'beginner', 'Speak basic Tamil with my in-laws', 'Learning Tamil for family and travel.');
  const marco = insUser.run('marco@solai.test', hashPassword('learner1234'), 'learner', 'Marco Rossi', 'it', 'beginner', 'Tamil for tourism in Madurai', 'Traveler planning to visit Tamil Nadu.');
  db.prepare('INSERT INTO organizer_profiles (user_id, title, bio, permissions) VALUES (?,?,?,?)').run(Number(organizer.lastInsertRowid), 'Workshop Lead', 'Organizer for Solai workshops.', JSON.stringify(['courses', 'workshops', 'attendance', 'announcements']));

  const adminId = Number(admin.lastInsertRowid);
  const organizerId = Number(organizer.lastInsertRowid);
  const teacherId = Number(teacher.lastInsertRowid);
  const priyaId = Number(priya.lastInsertRowid);
  const marcoId = Number(marco.lastInsertRowid);

  /* ── CMS: site settings ── */
  const insSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
  const settings: Record<string, unknown> = {
    site_name: 'Solai',
    tagline: 'சோலை — The Tamil Learning Garden',
    description:
      'Learn Tamil through structured courses, live workshops, an AI Tamil tutor and a warm community — from your very first அ to confident conversation.',
    contact_email: 'hello@solai.example',
    hero_title: 'Learn Tamil, blooming step by step',
    hero_subtitle: 'Structured courses, live workshops, an AI tutor and a community garden of learners. For beginners, travellers, professionals and the Tamil diaspora.',
    hero_cta_label: 'Start learning free',
    hero_cta_href: '/learn',
    certificate_threshold: 90,
    ai_tutor_enabled: true,
    gamification: { enabled: true },
  };
  for (const [k, v] of Object.entries(settings)) insSetting.run(k, JSON.stringify(v));

  /* ── Navigation & footer ── */
  const insNav = db.prepare('INSERT INTO navigation_items (location, label, href, sort_order, is_published) VALUES (?,?,?,?,1)');
  [
    ['header', 'Courses', '/learn', 1],
    ['header', 'Workshops', '/workshops', 2],
    ['header', 'Vocabulary', '/vocabulary', 3],
    ['header', 'Practice', '/practice', 4],
    ['header', 'Resources', '/resources', 5],
    ['header', 'Culture', '/culture', 6],
    ['header', 'Community', '/community', 7],
    ['header', 'FAQ', '/faq', 8],
    ['mobile', 'Home', '/dashboard', 1],
    ['mobile', 'Learn', '/learn', 2],
    ['mobile', 'Workshops', '/workshops', 3],
    ['mobile', 'Resources', '/resources', 4],
    ['mobile', 'Culture', '/culture', 5],
    ['mobile', 'Community', '/community', 6],
    ['mobile', 'AI', '/dashboard?ai=1', 7],
  ].forEach((n) => insNav.run(n[0] as string, n[1] as string, n[2] as string, n[3] as number));

  const insFooter = db.prepare('INSERT INTO footer_links (column_label, label, href, sort_order, is_published) VALUES (?,?,?,?,1)');
  [
    ['Learn', 'Courses', '/learn', 1],
    ['Learn', 'Vocabulary', '/vocabulary', 2],
    ['Learn', 'Practice scenarios', '/practice', 3],
    ['Learn', 'Free resources', '/resources', 4],
    ['Culture', 'Culture & heritage', '/culture', 1],
    ['Culture', 'Virtual TN map', '/culture/map', 2],
    ['Culture', 'Culture quiz', '/culture/quiz', 3],
    ['Platform', 'Workshops', '/workshops', 1],
    ['Platform', 'Community', '/community', 2],
    ['Platform', 'FAQ', '/faq', 3],
    ['Platform', 'About', '/about', 4],
    ['Legal', 'Privacy', '/privacy', 1],
    ['Legal', 'Terms', '/terms', 2],
  ].forEach((f) => insFooter.run(f[0] as string, f[1] as string, f[2] as string, f[3] as number));

  /* ── Banners ── */
  db.prepare('INSERT INTO banners (title, body, link_url, link_label, is_active, sort_order) VALUES (?,?,?,?,1,1)').run(
    'Live: Tamil Conversation Bootcamp',
    'Free live workshop — register and join from anywhere.',
    '/workshops',
    'See workshops'
  );

  /* ── Homepage sections ── */
  const insSection = db.prepare('INSERT INTO homepage_sections (key, type, title, subtitle, body_json, sort_order, is_published) VALUES (?,?,?,?,?,?,1)');
  insSection.run('stats', 'stats', null, null, JSON.stringify({ items: [
    { label: 'Learners', value: '12,400+' },
    { label: 'Tamil lessons', value: '200+' },
    { label: 'Live workshops', value: '40/month' },
    { label: 'Certificate success', value: '94%' },
  ] }), 1);
  insSection.run('features', 'features', 'A complete Tamil ecosystem', 'Everything you need to go from அ to conversation', JSON.stringify({ items: [
    { icon: '📚', title: 'Structured courses', text: 'Six levels from absolute beginner to professional Tamil, with videos, reading and audio.' },
    { icon: '🤖', title: 'AI Tamil Tutor', text: 'Ask about any lesson, word or sentence — the tutor knows the current page and all platform content.' },
    { icon: '🎤', title: 'Live workshops', text: 'Register, attend, get attendance tracked and earn a verifiable certificate at 90% attendance.' },
    { icon: '🍽️', title: 'Real-life scenarios', text: 'Order food, take an auto, catch a train — practice Tamil in the situations you will actually use.' },
    { icon: '🏆', title: 'Progress & gamification', text: 'XP, streaks and vocabulary counts keep you coming back. Certificates you can verify with a QR code.' },
    { icon: '🌏', title: 'Multilingual explanations', text: 'Explanations in English, Hindi, Telugu, Malayalam and Kannada, ready for more languages later.' },
  ] }), 2);
  insSection.run('levels', 'levels', 'Your learning path', 'Six levels that take you from sounds to professional Tamil', JSON.stringify({ items: [
    { tag: 'Level 1', title: 'Absolute Beginner', text: 'உயிர் எழுத்துக்கள் & மெய் எழுத்துக்கள், sounds, greetings, numbers.' },
    { tag: 'Level 2', title: 'Everyday Tamil', text: 'Introductions, family, food, shopping, transport, time and common verbs.' },
    { tag: 'Level 3', title: 'Conversation', text: 'Restaurant, railway station, bus, hotel, hospital, office and friends.' },
    { tag: 'Level 4', title: 'Grammar', text: 'Sentence structure, tense, pronouns, negation, adjectives, particles.' },
    { tag: 'Level 5', title: 'Reading & Writing', text: 'Read words and sentences, write practice, short passages.' },
    { tag: 'Level 6', title: 'Advanced / Professional', text: 'Formal Tamil, professional communication and cultural context.' },
  ] }), 3);
  insSection.run('quote', 'quote', null, null, JSON.stringify({ text: 'தமிழ் மொழி இனிய மொழி — “Tamil is the sweet language.” Learn it in a garden, with people who are happy to grow it with you.', attribution: 'The Solai teaching team' }), 4);

  /* ── Static pages ── */
  const insPage = db.prepare('INSERT INTO static_pages (slug, title, body_json, is_published) VALUES (?,?,?,1)');
  insPage.run('about', 'About Solai', JSON.stringify([
    { type: 'heading', data: { text: 'Why “Solai”?' } },
    { type: 'paragraph', data: { text: 'சோலை (solaī) means “forest” in Tamil — a place where many kinds of life grow together. Solai is built the same way: courses, workshops, an AI tutor and a community that all feed each other.' } },
    { type: 'paragraph', data: { text: 'We serve absolute beginners, learners from other Indian states, tourists, professionals, students and the Tamil diaspora. Explanations are available in English, Hindi, Telugu, Malayalam and Kannada, and the architecture is ready for more languages.' } },
    { type: 'callout', data: { tone: 'info', text: 'Development build: the seed data you see (users, courses, workshops) is demo data, clearly marked, used only to demonstrate every feature end to end.' } },
  ]));
  insPage.run('contact', 'Contact', JSON.stringify([
    { type: 'heading', data: { text: 'Get in touch' } },
    { type: 'paragraph', data: { text: 'Email us at hello@solai.example or use the form below. We usually reply within one working day.' } },
    { type: 'paragraph', data: { text: 'For workshop questions, please include the workshop title and your registered email.' } },
  ]));
  insPage.run('privacy', 'Privacy Policy', JSON.stringify([
    { type: 'heading', data: { text: 'What we store' } },
    { type: 'paragraph', data: { text: 'Your account details, learning progress, quiz attempts, attendance records, messages and (optionally) your own OpenRouter API key. BYOAI keys are encrypted at rest and are never shown to other users or logged.' } },
    { type: 'heading', data: { text: 'What we never do' } },
    { type: 'list', data: { items: ['Sell your data or include it in analytics', 'Expose the platform AI key to your browser', 'Use AI to decide attendance or certificate eligibility — those are deterministic backend rules', 'Send marketing spam without consent'] } },
  ]));
  insPage.run('terms', 'Terms of Service', JSON.stringify([
    { type: 'heading', data: { text: 'Short version' } },
    { type: 'list', data: { items: ['Be kind in the community — moderation is active', 'Certificates reflect verified attendance and completion, and can be verified at /verify/{id}', 'Payments: free workshops are fully functional; paid workshops require a payment provider to be configured', 'We may update the platform; material changes will be announced'] } },
  ]));
  insPage.run('help', 'Help & Learning Tips', JSON.stringify([
    { type: 'heading', data: { text: 'How to get the most out of Solai' } },
    { type: 'list', data: { items: ['Follow the course order — each lesson builds on the previous one', 'Speak out loud, even alone; use the Speaking Practice page when your browser supports speech recognition', 'Ask the AI tutor about the exact sentence you are reading — it sees the lesson you are on', 'Attend 90% of a workshop to unlock the certificate', 'Join the Beginners Community and introduce yourself in Tamil (we will help you)'] } },
    { type: 'callout', data: { tone: 'tip', text: 'The floating AI button (bottom-right) is always with you — inside a lesson it says “Ask about this lesson”.' } },
  ]));

  /* ── FAQ ── */
  const insFaq = db.prepare('INSERT INTO faq_entries (question, answer, category, sort_order, is_published) VALUES (?,?,?,?,1)');
  [
    ['Do I need to know any Tamil to start?', 'No. Level 1 starts from the alphabet itself — உயிர் எழுத்துக்கள் (vowels) and மெய் எழுத்துக்கள் (consonants). Many of our learners start from zero.', 'Getting started', 1],
    ['How long until I can hold a basic conversation?', 'Most consistent learners can introduce themselves, order food and handle simple travel situations after Levels 1–2 (about 4–6 weeks at 20 minutes a day).', 'Getting started', 2],
    ['What does the 90% certificate rule mean?', 'For workshops, attendance_percentage = attended required minutes ÷ total required minutes × 100. You need 90% or more. This is calculated by the platform from attendance records — not by the AI.', 'Certificates', 3],
    ['How are certificates verified?', 'Every certificate has a unique ID (for example TN-2026-000001) and a QR code. Anyone can check it at /verify/{certificate ID}. Revoked certificates are shown as invalid.', 'Certificates', 4],
    ['Can I learn in my own language?', 'Yes. Explanations are available in English, Hindi, Telugu, Malayalam and Kannada. Set your native language in your profile and the AI tutor will use it when helpful.', 'Languages', 5],
    ['What is the AI Tamil Tutor?', 'A floating assistant available everywhere. It answers from the platform content (RAG), sees which lesson you are reading, does vocabulary lookups and gives practice sentences. It never invents workshop dates or attendance.', 'AI tutor', 6],
    ['Can I use my own OpenRouter API key (BYOAI)?', 'Yes, if the platform allows it. The key is encrypted at rest, only used server-side for your requests, never displayed in full, and can be deleted anytime.', 'AI tutor', 7],
    ['Is Solai free?', 'Courses and the core learning experience are free. Some live workshops are paid — when a payment provider is configured, registration shows PENDING/PAID states clearly and never fakes a payment.', 'General', 8],
  ].forEach((f) => insFaq.run(f[0] as string, f[1] as string, f[2] as string, f[3] as number));

  /* ── Courses ─────────────────────────────────────────────── */
  const insCourse = db.prepare(
    `INSERT INTO courses (slug, title, subtitle, description, thumbnail_url, difficulty, language, audience, instructor_id, organizer_id, duration_hours, price_cents, level_tag, is_published, sort_order, certificate_enabled)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
  );
  const course1 = insCourse.run(
    'tamil-for-beginners',
    'Tamil for Beginners',
    'Level 1 — Absolute Beginner',
    'Start from zero: learn the Tamil alphabet (vowels, consonants and joined letters), greetings, numbers and your first everyday sentences. Includes video lessons, vocabulary drills and quizzes.',
    null,
    'beginner', 'en', 'Absolute beginners, tourists, diaspora families', teacherId, organizerId, 12, 0, 'Level 1 — Absolute Beginner', 1, 1
  );
  const course2 = insCourse.run(
    'everyday-tamil-conversation',
    'Everyday Tamil — Conversation',
    'Level 3 — Real-life conversations',
    'Restaurant, railway station, bus, hotel, shopping, auto-rickshaw. Practice the Tamil you will actually use in real situations, with scenario scripts and listening practice.',
    null,
    'intermediate', 'en', 'Intermediate learners, travellers', teacherId, organizerId, 10, 0, 'Level 3 — Conversation', 1, 2
  );
  const course3 = insCourse.run(
    'tamil-grammar-deep-dive',
    'Tamil Grammar Deep Dive',
    'Level 4 — Grammar',
    'Sentence structure, tense, pronouns, negation and particles. (Draft — being written.)',
    null,
    'advanced', 'en', 'Grammar-focused learners', teacherId, organizerId, 16, 0, 'Level 4 — Grammar', 0, 3
  );
  const c1 = Number(course1.lastInsertRowid);
  const c2 = Number(course2.lastInsertRowid);
  const c3 = Number(course3.lastInsertRowid);

  const insModule = db.prepare('INSERT INTO course_modules (course_id, title, description, sort_order, is_published) VALUES (?,?,?,?,1)');
  const m1a = insModule.run(c1, 'Sounds of Tamil', 'The alphabet: vowels, consonants and joined letters.', 1);
  const m1b = insModule.run(c1, 'First Words', 'Greetings, numbers and self-introduction.', 2);
  const m1c = insModule.run(c1, 'Everyday Conversation', 'Family, food and ordering in a shop or restaurant.', 3);
  const m2a = insModule.run(c2, 'On the Move', 'Bus, railway station, auto-rickshaw and directions.', 1);
  const m2b = insModule.run(c2, 'Services', 'Hotel, hospital and office situations.', 2);
  const m3a = insModule.run(c3, 'Sentence Structure', 'Word order, pronouns and tense.', 1);

  const VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'; // small CC0 sample video
  const AUDIO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3';

  const insLesson = db.prepare(
    `INSERT INTO lessons (module_id, slug, title, summary, content_json, video_url, video_duration_seconds, audio_url, pdf_url, transcript_text, chapters_json, is_published, sort_order, required_watch_percent, xp)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,90,20)`
  );

  const blocks = (b: unknown) => JSON.stringify(b);
  const vocabBlock = (tamil: string, translit: string, meaning: string) => ({ type: 'vocabulary', data: { tamil, transliteration: translit, meaning } });

  // ── Course 1, Module 1: Sounds of Tamil ──
  insLesson.run(
    Number(m1a.lastInsertRowid), 'tamil-alphabet',
    'Lesson 1 · The Tamil Alphabet',
    'Meet the 12 vowels, the 18 basic consonants and how joined letters (உயிர்மெய்) are formed.',
    blocks([
      { type: 'heading', data: { text: 'The Tamil writing system' } },
      { type: 'paragraph', data: { text: 'Tamil has its own beautiful script. A letter can be a pure vowel (உயிர் எழுத்து — uyir ezhuthu, “life letter”), a consonant that carries an inherent “a” sound (மெய் எழுத்து — mey ezhuthu, “real letter”), or a consonant joined with another vowel (உயிர்மெய் — uyirmei). When a consonant stands alone with no vowel, a small dot called ெ (pulli) cancels the vowel.' } },
      { type: 'table', data: { rows: [['அ a', 'ஆ aa', 'இ i', 'ஈ ee'], ['உ u', 'ஊ oo', 'எ e', 'ஏ ae'], ['ஒ o', 'ஓ oa', 'ஐ ai', 'ஔ au']] } },
      { type: 'callout', data: { tone: 'tip', text: 'Say each sound slowly. Tamil vowels are longer than English vowels — ஆ is a long “aa” as in “father”.' } },
      vocabBlock('அ', 'a', 'the first letter; “a”'),
      vocabBlock('ஓ', 'oa', 'the letter “oa” (as in “saw”)'),
    ]),
    null, 0, null, null, null, null, 1, 1
  );
  insLesson.run(
    Number(m1a.lastInsertRowid), 'vowels-and-sounds',
    'Lesson 2 · Vowels and Sounds',
    'The 12 vowels in detail, with English approximations and practice.',
    blocks([
      { type: 'heading', data: { text: 'உயிர் எழுத்துக்கள் — the vowels' } },
      { type: 'paragraph', data: { text: 'There are 12 vowels: 6 short and 6 long. The length matters in meaning — a different vowel can change a word entirely.' } },
      { type: 'table', data: { rows: [['அ (a)', 'short “a” — “ago”'], ['ஆ (aa)', 'long “aa” — “father”'], ['இ (i)', 'short “i” — “sit”'], ['ஈ (ee)', 'long “ee” — “see”'], ['உ (u)', 'short “u” — “up”'], ['ஊ (oo)', 'long “oo” — “moon”'], ['எ (e)', '“e” — “bet”'], ['ஏ (ae)', '“ai” — “air”'], ['ஒ (o)', '“o” — “dog”'], ['ஓ (oa)', '“aw” — “saw”'], ['ஐ (ai)', '“ai” — “aisle”'], ['ஔ (au)', '“ow” — “how”']] } },
      { type: 'list', data: { items: ['Practice the a–aa, i–ee, u–oo pairs until the length feels natural', 'Write each vowel 5 times', 'Ask the AI tutor: “give me example words for each vowel”'] } },
    ]),
    null, 0, AUDIO, null, 'Transcript: Welcome to vowels. We will practice the twelve vowels: a, aa, i, ee, u, oo, e, ae, o, oa, ai, au. Long and short. Slowly and clearly.', null, 1, 2
  );
  insLesson.run(
    Number(m1a.lastInsertRowid), 'consonants-uyirmei',
    'Lesson 3 · Consonants and Joined Letters',
    'The 18 basic consonants (மெய் எழுத்துக்கள்) and how உயிர்மெய் letters join with other vowels.',
    blocks([
      { type: 'heading', data: { text: 'மெய் எழுத்துக்கள் — the consonants' } },
      { type: 'paragraph', data: { text: 'Every consonant carries an inherent “a”. க reads as “ka”, த as “ta”, ந as “na”. To add another vowel, the consonant joins with it — this is how உயிர்மெய் (uyirmei) letters are built. The dot ெ (pulli) cancels the vowel entirely.' } },
      { type: 'table', data: { rows: [['க (ka)', 'ச (sa)', 'ட (ḍa)', 'ண (ṇa)'], ['த (ta)', 'த (ṭa)', 'த (ta)', 'த (ṭha)'], ['ந (na)', 'ம (ma)', 'ய (ya)', 'ர (ra)'], ['இ (la)', 'வ (va)', 'ழ (ḻa)', 'ள (ḷa)']] } },
      { type: 'grammar', data: { title: 'Inherent vowel “a”', explanation: 'A lone consonant always has the vowel a. க = ka. With the pulli dot ெ, it becomes a pure consonant k.', example: 'க (ka) → க் (k) → கா (kaa)' } },
    ]),
    VIDEO, 13, null, null, 'Transcript: Consonants carry the sound “a”. ka, ta, pa, ma, na, ra. The pulli dot removes the vowel. Watch how the letters join.', JSON.stringify([{ title: 'The 18 consonants', seconds: 0 }, { title: 'The pulli dot', seconds: 5 }]), 1, 3
  );
  insLesson.run(
    Number(m1a.lastInsertRowid), 'greetings',
    'Lesson 4 · Greetings & Respect',
    'வணக்கம், நன்றி, சரி and the basics of polite Tamil.',
    blocks([
      { type: 'heading', data: { text: 'Greetings that open every door' } },
      { type: 'paragraph', data: { text: 'Tamil has greetings for every time of day and every social situation. வணக்கம் (vanakkam) works everywhere. Adding “-piyaar” (dear one) makes phrases polite: எப்படி இருக்கீர், முத்துப்பியா?' } },
      { type: 'vocabulary', data: { tamil: 'வணக்கம்', transliteration: 'vanakkam', meaning: 'Hello / greetings' } },
      { type: 'vocabulary', data: { tamil: 'நன்றி', transliteration: 'nandri', meaning: 'Thank you' } },
      { type: 'vocabulary', data: { tamil: 'சரி', transliteration: 'sari', meaning: 'Okay / fine / alright' } },
      { type: 'vocabulary', data: { tamil: 'மன்னிக்கவும்', transliteration: 'mannikkavum', meaning: 'Excuse me / sorry' } },
      { type: 'vocabulary', data: { tamil: 'எப்போ', transliteration: 'epo', meaning: 'How are you? (informal)' } },
      { type: 'callout', data: { tone: 'tip', text: '“How are you?” politely is எப்படி இருக்கீர்? (epadi irukkiR?). A warm reply: நன்றாக இருக்கிறேன் (nandriaagu irukkiREN — I am doing well).' } },
    ]),
    VIDEO, 13, null, null, 'Transcript: Vanakkam! This is how you greet in Tamil. Nandri means thank you. Sari means okay. Mannikkavum means excuse me. Practice saying vanakkam to a mirror.', null, 1, 4
  );

  // ── Course 1, Module 2: First Words ──
  insLesson.run(
    Number(m1b.lastInsertRowid), 'numbers',
    'Lesson 5 · Numbers 1–20',
    'ஒன்று, இரண்டு, மூன்று… counting, prices and phone numbers.',
    blocks([
      { type: 'heading', data: { text: 'Numbers you will actually use' } },
      { type: 'table', data: { rows: [['1', 'ஒரு (oru) / ஒன்று (onru)'], ['2', 'இரண்டு (irandu)'], ['3', 'மூன்று (moondru)'], ['4', 'நான்கு (naanku)'], ['5', 'ஐந்து (ainthu)'], ['10', 'பத்து (pattu)'], ['20', 'இருபது (irupathu)']] } },
      { type: 'paragraph', data: { text: 'In everyday speech, small numbers take informal forms (ஒரு, இரண்டு, மூனு, நாலு, ஐஞ்சு). The table forms appear in official and news contexts.' } },
      { type: 'callout', data: { tone: 'info', text: 'Prices: “இரண்டு தேநீர் வேண்டும்” = “I want two filter coffees.”' } },
    ]),
    null, 0, null, null, null, null, 1, 1
  );
  insLesson.run(
    Number(m1b.lastInsertRowid), 'introducing-yourself',
    'Lesson 6 · Introducing Yourself',
    'என் பெயர்…, where you are from and what you do.',
    blocks([
      { type: 'heading', data: { text: 'என் பெயர்… (My name is…)' } },
      { type: 'vocabulary', data: { tamil: 'என் பெயர்', transliteration: 'en peyar', meaning: 'My name' } },
      { type: 'vocabulary', data: { tamil: 'உங்கள் பெயர் என்ன?', transliteration: 'ungal peyar enna?', meaning: 'What is your name? (polite)' } },
      { type: 'vocabulary', data: { tamil: 'நான்', transliteration: 'naan', meaning: 'I' } },
      { type: 'vocabulary', data: { tamil: 'நன்றாக இருக்கிறேன்', transliteration: 'nandriaagu irukkiREN', meaning: 'I am doing well' } },
      { type: 'grammar', data: { title: 'Sentence order', explanation: 'Tamil usually puts the verb at the end: Subject + Object + Verb. “I eat rice” = நான் ராகி இடுகிறேன் (naan raagi idu-kki-reN).', example: 'நான் கற்றுக்கொள்பவள் (naan katra-k-kol-ba-vL) = I am a learner (spoken by a woman).' } },
      { type: 'list', data: { items: ['Script your self-introduction: name, city, what you do', 'Say it out loud 5 times', 'Ask the AI tutor to quiz you on the words in this lesson'] } },
    ]),
    VIDEO, 13, null, null, 'Transcript: Introducing yourself. En peyar Anitha. I am Anitha. Nandriaagu irukkiREN — I am doing well. The verb goes at the end of the sentence.', null, 1, 2
  );

  // ── Course 1, Module 3: Everyday Conversation ──
  insLesson.run(
    Number(m1c.lastInsertRowid), 'family-and-food',
    'Lesson 7 · Family & Food',
    'அம்மா, அப்பா, and the food words every Tamil meal needs.',
    blocks([
      { type: 'heading', data: { text: 'Family' } },
      { type: 'vocabulary', data: { tamil: 'அம்மா', transliteration: 'amma', meaning: 'Mother / ma’am' } },
      { type: 'vocabulary', data: { tamil: 'அப்பா', transliteration: 'appa', meaning: 'Father / sir' } },
      { type: 'vocabulary', data: { tamil: 'அக்கா', transliteration: 'akka', meaning: 'Elder sister / ma’am' } },
      { type: 'vocabulary', data: { tamil: 'அண்ணா', transliteration: 'anna', meaning: 'Elder brother / sir' } },
      { type: 'heading', data: { text: 'Food' } },
      { type: 'vocabulary', data: { tamil: 'தேநீர்', transliteration: 'theenir', meaning: 'Tea / filter coffee' } },
      { type: 'vocabulary', data: { tamil: 'விருன்', transliteration: 'vaatol', meaning: 'Rice' } },
      { type: 'vocabulary', data: { tamil: 'விருன் சாப்பாடு', transliteration: 'vaatol saappadu', meaning: 'Rice meal' } },
      { type: 'vocabulary', data: { tamil: 'விருன் மோறு', transliteration: 'vaatol mooru', meaning: 'Rice porridge' } },
      { type: 'callout', data: { tone: 'info', text: 'அம்மா/அப்பா double as respectful forms of address for any elder — like “ma’am/sir”.' } },
    ]),
    null, 0, AUDIO, null, 'Transcript: Family words — amma, appa, akka, anna. Food words — theenir, vaatol, vaatol saappadu, vaatol mooru.', null, 1, 1
  );
  insLesson.run(
    Number(m1c.lastInsertRowid), 'ordering-food',
    'Lesson 8 · Ordering Food',
    'எனக்கு… வேண்டும் — the magic phrase for ordering anything in Tamil.',
    blocks([
      { type: 'heading', data: { text: 'The order formula' } },
      { type: 'grammar', data: { title: '“I want …”', explanation: 'எனக்கு + noun + வேண்டும். The -க்கு (kku) marks the person who wants the thing. வேண்டும் (venum, “need/want”) comes last.', example: 'எனக்கு ஒரு தேநீர் வேண்டும் (enakku oru theenir venum) = I want a tea, please.' } },
      { type: 'vocabulary', data: { tamil: 'வேண்டும்', transliteration: 'venum', meaning: 'to want / need' } },
      { type: 'vocabulary', data: { tamil: 'ஒரு', transliteration: 'oru', meaning: 'one / a' } },
      { type: 'vocabulary', data: { tamil: 'எனக்கு', transliteration: 'enakku', meaning: 'to/for me' } },
      { type: 'vocabulary', data: { tamil: 'எவ்வளவு?', transliteration: 'evvalavu?', meaning: 'How much? (price)' } },
      { type: 'vocabulary', data: { tamil: 'காபி', transliteration: 'kaapi', meaning: 'Coffee' } },
      { type: 'quote', data: { text: '“எனக்கு ஒரு தேநீர் வேண்டும்.” — the single most useful sentence for a filter-coffee shop in Madurai.' } },
      { type: 'callout', data: { tone: 'tip', text: 'Try the Speaking Practice: say “எனக்கு ஒரு தேநீர் வேண்டும்” out loud and let the browser check it (where supported).' } },
    ]),
    VIDEO, 13, null, null, 'Transcript: Ordering food in Tamil. Enakku oru theenir venum — I want a tea. Evvalavu? How much? Nandri — thank you.', null, 1, 2
  );
  insLesson.run(
    Number(m1c.lastInsertRowid), 'first-quiz',
    'Quiz · Your First Test',
    'Check your vocabulary and the ordering formula.',
    blocks([
      { type: 'paragraph', data: { text: 'This quiz covers Lessons 4–8. You need 70% to pass. You can retake it as many times as you like.' } },
    ]),
    null, 0, null, null, null, null, 1, 3
  );

  // ── Course 2: Everyday Tamil — Conversation ──
  insLesson.run(
    Number(m2a.lastInsertRowid), 'bus-ride',
    'Lesson 9 · Taking the Bus',
    'Where is the bus stand? Buy a ticket, ask about stops and fare.',
    blocks([
      { type: 'heading', data: { text: 'At the bus stand' } },
      { type: 'vocabulary', data: { tamil: 'பஸ் ஸ்டாண்டு', transliteration: 'bus standu', meaning: 'Bus stand' } },
      { type: 'vocabulary', data: { tamil: 'பஸ் டிக்கெட்', transliteration: 'bus tikkeṭ', meaning: 'Bus ticket' } },
      { type: 'vocabulary', data: { tamil: 'இங்கு நிறுத்துங்கள்', transliteration: 'ingu niṟtukaḷ', meaning: 'Stop here (polite)' } },
      { type: 'grammar', data: { title: 'Asking for a place', explanation: '… எங்கே? (enkē?) = “Where is …?” — பஸ் ஸ்டாண்டு எங்கே? = Where is the bus stand?', example: 'அங்கே செல்ல எப்படி? = How do I get there?' } },
    ]),
    VIDEO, 13, null, null, 'Transcript: Bus stand. Where to? Ingu niṟtuṅkaḷ — stop here. Evvalavu? — how much is the fare?', null, 1, 1
  );
  insLesson.run(
    Number(m2a.lastInsertRowid), 'railway-station',
    'Lesson 10 · Railway Station',
    'Train tickets, platforms, delays and directions at the station.',
    blocks([
      { type: 'heading', data: { text: 'At the railway station' } },
      { type: 'vocabulary', data: { tamil: 'டிரெய்ன்', transliteration: 'traen', meaning: 'Train' } },
      { type: 'vocabulary', data: { tamil: 'டிக்கெட்', transliteration: 'tikkeṭṭ', meaning: 'Ticket' } },
      { type: 'vocabulary', data: { tamil: 'பிளாட்ட்பாரம்', transliteration: 'plāṭṭpāram', meaning: 'Platform' } },
      { type: 'vocabulary', data: { tamil: 'தாமதம்', transliteration: 'tāmatham', meaning: 'Delayed' } },
      { type: 'quote', data: { text: '“எந்த பிளாட்ட்பாரம்?” — “Which platform?” — the question that saves every train journey.' } },
    ]),
    null, 0, AUDIO, null, 'Transcript: Train, ticket, platform, delay. At the station you will hear these four words constantly.', null, 1, 2
  );
  insLesson.run(
    Number(m2a.lastInsertRowid), 'auto-rickshaw',
    'Lesson 11 · Auto-rickshaw & Taxi',
    'Meter, destination and the small talk drivers love.',
    blocks([
      { type: 'heading', data: { text: 'In the auto' } },
      { type: 'vocabulary', data: { tamil: 'ஆட்டோ', transliteration: 'āṭṭo', meaning: 'Auto-rickshaw' } },
      { type: 'vocabulary', data: { tamil: 'மீட்டர்', transliteration: 'mīṭṭar', meaning: 'Meter' } },
      { type: 'vocabulary', data: { tamil: 'இங்கு நிறுத்துங்கள்', transliteration: 'ingu niṟtukaḷ', meaning: 'Stop here (polite)' } },
      { type: 'callout', data: { tone: 'info', text: 'Saying the destination clearly in Tamil is worth more than any app: “பஸ் ஸ்டாண்டை, தயவு செய்து” (bus stand, please).' } },
    ]),
    null, 0, null, null, null, null, 1, 3
  );
  insLesson.run(
    Number(m2b.lastInsertRowid), 'hotel-checkin',
    'Lesson 12 · Hotel Check-in',
    'Reservations, room types and checkout in polite Tamil.',
    blocks([
      { type: 'heading', data: { text: 'At the front desk' } },
      { type: 'vocabulary', data: { tamil: 'முன்பதிவு', transliteration: 'mumpadivu', meaning: 'Booking / reservation' } },
      { type: 'vocabulary', data: { tamil: 'அறை', transliteration: 'aṟai', meaning: 'Room' } },
      { type: 'vocabulary', data: { tamil: 'தயவு செய்து', transliteration: 'tāyvucietu', meaning: 'Please' } },
      { type: 'vocabulary', data: { tamil: 'காலை உணவு', transliteration: 'kālai uṉavu', meaning: 'Breakfast' } },
      { type: 'grammar', data: { title: 'Politeness layer', explanation: 'Add தயவு செய்து (please) to make service requests warm. “ஒரு அறை வேண்டும், தயவு செய்து” = I would like a room, please.', example: 'Check-out: “செக்-ஔட் ஆக வேண்டும், தயவு செய்து” = I need to check out, please.' } },
    ]),
    VIDEO, 13, null, null, 'Transcript: Hotel check-in. Oru aṟai venum, thayvu cietu — one room please. Mumpadivu — reservation. Check out tomorrow morning.', null, 1, 4
  );
  insLesson.run(
    Number(m2b.lastInsertRowid), 'conversation-quiz',
    'Quiz · Conversation Check',
    'Travel and service vocabulary, 70% to pass.',
    blocks([{ type: 'paragraph', data: { text: 'Covers bus, train, auto and hotel vocabulary.' } }]),
    null, 0, null, null, null, null, 1, 5
  );
  // Draft lesson in the grammar course (unpublished — visible only in admin)
  insLesson.run(Number(m3a.lastInsertRowid), 'word-order', 'Lesson 1 · Word Order (Draft)', 'SOV structure in depth.', blocks([{ type: 'paragraph', data: { text: 'Draft content — not published yet.' } }]), null, 0, null, null, null, null, 0, 1);

  /* ── Vocabulary rows (searchable + AI-indexed) ── */
  const insVocab = db.prepare(
    `INSERT INTO vocabulary (lesson_id, course_id, tamil, transliteration, meaning, meaning_language, part_of_speech, example_tamil, example_meaning, level, is_published)
     VALUES (?,?,?,?,?, 'en', ?,?,?, 'beginner', 1)`
  );
  const vocabRows: [number, number, string, string, string, string | null, string | null, string | null][] = [
    [1, c1, 'அ', 'a', 'letter “a”', 'letter', 'அம்மா', 'amma — mother'],
    [1, c1, 'ஓ', 'oa', 'letter “oa”', 'letter', null, null],
    [4, c1, 'வணக்கம்', 'vanakkam', 'Hello / greetings', 'interjection', 'வணக்கம், எப்படி இருக்கீர்?', 'Hello, how are you? (polite)'],
    [4, c1, 'நன்றி', 'nandri', 'Thank you', 'interjection', 'நன்றி, சார்', 'Thank you, sir'],
    [4, c1, 'சரி', 'sari', 'Okay / alright', 'adverb', 'சரி, போகிறேன்', 'Okay, I am going'],
    [4, c1, 'மன்னிக்கவும்', 'mannikkavum', 'Excuse me / sorry', 'interjection', null, null],
    [4, c1, 'எப்போ', 'epo', 'How are you? (informal)', 'question', null, null],
    [5, c1, 'ஒரு', 'oru', 'one (informal)', 'number', 'ஒரு தேநீர்', 'one tea'],
    [5, c1, 'இரண்டு', 'irandu', 'two', 'number', 'இரண்டு தேநீர் வேண்டும்', 'I want two teas'],
    [5, c1, 'மூன்று', 'moondru', 'three', 'number', null, null],
    [5, c1, 'ஐந்து', 'ainthu', 'five', 'number', null, null],
    [5, c1, 'பத்து', 'pattu', 'ten', 'number', null, null],
    [6, c1, 'என் பெயர்', 'en peyar', 'My name', 'phrase', 'என் பெயர் பிரியா', 'My name is Priya'],
    [6, c1, 'நான்', 'naan', 'I', 'pronoun', 'நான் கற்றுக்கொள்பவள்', 'I am a learner'],
    [7, c1, 'அம்மா', 'amma', 'Mother', 'noun', 'அம்மா எங்கே?', 'Where is mother?'],
    [7, c1, 'அப்பா', 'appa', 'Father', 'noun', null, null],
    [7, c1, 'அக்கா', 'akka', 'Elder sister', 'noun', null, null],
    [7, c1, 'அண்ணா', 'anna', 'Elder brother', 'noun', null, null],
    [7, c1, 'தேநீர்', 'theenir', 'Tea / filter coffee', 'noun', 'ஒரு தேநீர் வேண்டும்', 'I want a tea'],
    [7, c1, 'விருன்', 'vaatol', 'Rice', 'noun', 'விருன் சாப்பாடு', 'Rice meal'],
    [8, c1, 'வேண்டும்', 'venum', 'to want / need', 'verb', 'எனக்கு விருன் வேண்டும்', 'I want rice'],
    [8, c1, 'எனக்கு', 'enakku', 'to/for me', 'postposition', 'எனக்கு காபி வேண்டும்', 'I want a coffee'],
    [8, c1, 'எவ்வளவு', 'evvalavu', 'How much?', 'question', 'எவ்வளவு பணம்?', 'How much money?'],
    [8, c1, 'காபி', 'kaapi', 'Coffee', 'noun', null, null],
    [9, c2, 'பஸ் ஸ்டாண்டு', 'bus standu', 'Bus stand', 'noun', 'பஸ் ஸ்டாண்டு எங்கே?', 'Where is the bus stand?'],
    [9, c2, 'பஸ் டிக்கெட்', 'bus tikkeṭ', 'Bus ticket', 'noun', null, null],
    [10, c2, 'டிரெய்ன்', 'traen', 'Train', 'noun', 'டிரெய்ன் எப்போது?', 'When is the train?'],
    [10, c2, 'டிக்கெட்', 'tikkeṭṭ', 'Ticket', 'noun', null, null],
    [10, c2, 'பிளாட்ட்பாரம்', 'plāṭṭpāram', 'Platform', 'noun', 'எந்த பிளாட்ட்பாரம்?', 'Which platform?'],
    [10, c2, 'தாமதம்', 'tāmatham', 'Delayed', 'adjective', 'டிரெய்ன் தாமதமா?', 'Is the train delayed?'],
    [11, c2, 'ஆட்டோ', 'āṭṭo', 'Auto-rickshaw', 'noun', 'ஆட்டோ ஓட்டுங்கள்', 'Take an auto'],
    [11, c2, 'மீட்டர்', 'mīṭṭar', 'Meter', 'noun', null, null],
    [11, c2, 'இங்கு நிறுத்துங்கள்', 'ingu niṟtuṅkaḷ', 'Stop here (polite)', 'phrase', null, null],
    [12, c2, 'முன்பதிவு', 'mumpadivu', 'Reservation', 'noun', 'எனக்கு முன்பதிவு உண்டு', 'I have a reservation'],
    [12, c2, 'அறை', 'aṟai', 'Room', 'noun', 'ஒரு அறை வேண்டும்', 'I want a room'],
    [12, c2, 'தயவு செய்து', 'tāyvucietu', 'Please', 'adverb', null, null],
    [12, c2, 'காலை உணவு', 'kālai uṉavu', 'Breakfast', 'noun', 'காலை உணவு எப்போது?', 'When is breakfast?'],
  ];
  for (const v of vocabRows) insVocab.run(...v);

  /* ── Quizzes ── */
  const insQuiz = db.prepare('INSERT INTO quizzes (lesson_id, course_id, title, description, pass_score, is_published, created_by) VALUES (?,?,?,?,70,1,?)');
  const insQ = db.prepare('INSERT INTO quiz_questions (quiz_id, type, prompt, prompt_data, explanation, points, sort_order) VALUES (?,?,?,?,?,1,?)');

  const q1 = insQuiz.run(null, c1, 'Level 1 · Foundations Quiz', 'Greetings, numbers, family, food and the ordering formula.', adminId);
  const quiz1 = Number(q1.lastInsertRowid);
  const mcq = (qz: number, i: number, prompt: string, options: string[], correct: number[], explanation: string) =>
    insQ.run(qz, options.length > 1 && correct.length > 1 ? 'multi' : 'mcq', prompt, JSON.stringify({ options, correct }), explanation, i);
  mcq(quiz1, 1, '“நன்றி” (nandri) means…', ['Thank you', 'Hello', 'Goodbye', 'Sorry'], [0], 'நன்றி = thank you.');
  mcq(quiz1, 2, 'Which is the number “two”?', ['மூன்று (moondru)', 'இரண்டு (irandu)', 'ஒரு (oru)', 'ஐந்து (ainthu)'], [1], 'இரண்டு = two.');
  mcq(quiz1, 3, '“எனக்கு ஒரு தேநீர் வேண்டும்” means…', ['I drink tea every day', 'The tea is very hot', 'I want a tea, please', 'Where is the tea?'], [2], 'எனக்கு + oru theenir + வேண்டும் = I want a tea.');
  mcq(quiz1, 4, 'Which word means “mother” (and ma’am)?', ['அப்பா', 'அம்மா', 'அக்கா', 'அண்ணா'], [1], 'அம்மா = mother, also a respectful form of address.');
  mcq(quiz1, 5, 'In a Tamil sentence, where does the verb usually go?', ['At the beginning', 'In the middle', 'At the end', 'Any position'], [2], 'Tamil is SOV — subject, object, verb. The verb ends the sentence.');
  insQ.run(quiz1, 'truefalse', '“வணக்கம்” (vanakkam) works as a polite greeting in any situation.', JSON.stringify({ answer: true }), 'வணக்கம் is the universal, respectful greeting.', 6);
  insQ.run(quiz1, 'fillblank', 'Complete: “என் ___ பிரியா” (My name is Priya).', JSON.stringify({ answer: 'பெயர்' }), 'பெயர் (peyar) = name.', 7);
  insQ.run(quiz1, 'translation', 'Translate: “I want a room, please.”', JSON.stringify({ answer: 'ஒரு அறை வேண்டும், தயவு செய்து', hints: ['oru', 'venum', 'tāyvucietu'] }), 'oru + noun + venum + thayvu cietu.', 8);

  const q2 = insQuiz.run(null, c2, 'Level 3 · Travel Tamil Quiz', 'Bus, train, auto and hotel situations.', adminId);
  const quiz2 = Number(q2.lastInsertRowid);
  mcq(quiz2, 1, 'How do you ask “Where is the bus stand?”', ['பஸ் ஸ்டாண்டு எங்கே?', 'பஸ் எவ்வளவு?', 'பஸ் இங்கு', 'பஸ் நன்றி'], [0], '… எங்கே? (enkē?) asks for a place.');
  mcq(quiz2, 2, '“டிரெய்ன்” (traen) means…', ['Taxi', 'Train', 'Bus', 'Boat'], [1], 'டிரெய்ன் = train.');
  mcq(quiz2, 3, 'Which phrase means “Please”?', ['நன்றி', 'சரி', 'தயவு செய்து', 'மன்னிக்கவும்'], [2], 'தயவு செய்து = please.');
  mcq(quiz2, 4, 'At a hotel, “ஒரு அறை வேண்டும்” means…', ['Check out now', 'I want a room, please', 'The room is full', 'Where is the room?'], [1], 'oru + noun + venum = I want one…');

  /* ── Enrollments & progress (Priya mid-course; Marco just started) ── */
  db.prepare('INSERT INTO enrollments (user_id, course_id, status, enrolled_at) VALUES (?,?,?,?)').run(priyaId, c1, 'active', iso(-days(9)));
  db.prepare('INSERT INTO enrollments (user_id, course_id, status, enrolled_at) VALUES (?,?,?,?)').run(marcoId, c1, 'active', iso(-days(2)));
  db.prepare('INSERT INTO enrollments (user_id, course_id, status, enrolled_at) VALUES (?,?,?,?)').run(priyaId, c2, 'active', iso(-days(4)));

  const insProg = db.prepare(
    `INSERT INTO lesson_progress (user_id, lesson_id, started_at, last_position, watched_seconds, completion_percentage, completed_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`
  );
  const doneLessons = [1, 2, 3, 4, 5];
  doneLessons.forEach((lessonId, i) => {
    insProg.run(priyaId, lessonId, iso(-days(9 - i)), 13, 13, 100, iso(-days(8 - i)), iso(-days(8 - i)));
  });
  insProg.run(priyaId, 6, iso(-days(1)), 9.1, 9.1, 70, null, iso(-days(1)));
  insProg.run(marcoId, 1, iso(-days(1)), 13, 13, 100, iso(-days(1)), iso(-days(1)));

  const attempt = db.prepare('INSERT INTO quiz_attempts (quiz_id, user_id, score, max_score, passed, duration_seconds, submitted_at) VALUES (?,?,?,?,?,?,?)').run(quiz1, priyaId, 8, 8, 1, 210, iso(-days(3)));
  const attemptId = Number(attempt.lastInsertRowid);
  db.prepare('INSERT INTO quiz_answers (attempt_id, question_id, answer_data, is_correct, points) VALUES (?,?,?,?,1)').run(attemptId, 1, '0', 1);

  const insVocabProg = db.prepare("INSERT INTO vocabulary_progress (user_id, vocabulary_id, status, review_count, last_reviewed_at) VALUES (?,?, 'known', 2, ?)");
  for (let i = 1; i <= 12; i++) insVocabProg.run(priyaId, i, iso(-days(6)));

  /* ── Workshops ── */
  const insWorkshop = db.prepare(
    `INSERT INTO workshops (slug, title, description, banner_url, instructor_id, organizer_id, starts_at, duration_minutes, capacity, meeting_url, price_cents, registration_deadline, certificate_enabled, is_published)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,1)`
  );
  const ws1 = insWorkshop.run(
    'tamil-conversation-bootcamp',
    'Tamil Conversation Bootcamp',
    'A 3-session live bootcamp for building real conversation confidence: ordering food, asking directions, small talk. Attendance is tracked in each session; reach 90% overall to earn the certificate.',
    null, teacherId, organizerId, iso(days(6)), 120, 30,
    'https://meet.example/solai-bootcamp', 0, iso(days(4))
  );
  const ws2 = insWorkshop.run(
    'tamil-for-travellers-live',
    'Tamil for Travellers — Live Q&A',
    'Bring your travel questions. We will script real situations: airports, hotels, hospitals and railway stations. Includes a printable phrase sheet.',
    null, teacherId, organizerId, iso(days(12)), 90, 40,
    'https://meet.example/solai-travellers', 49900, iso(days(10))
  );
  const w1 = Number(ws1.lastInsertRowid);
  const w2 = Number(ws2.lastInsertRowid);

  const insSession = db.prepare('INSERT INTO workshop_sessions (workshop_id, title, starts_at, duration_minutes, required_minutes) VALUES (?,?,?,?,?)');
  const s1 = insSession.run(w1, 'Session 1 · Food & Ordering', iso(-days(3)), 120, 108);
  const s2 = insSession.run(w1, 'Session 2 · Directions & Travel', iso(-days(1)), 120, 108);
  insSession.run(w1, 'Session 3 · Free Conversation', iso(days(6)), 120, 108);
  const s3 = insSession.run(w2, 'Session 1 · Travel Situations', iso(days(12)), 90, 81);
  const S1 = Number(s1.lastInsertRowid), S2 = Number(s2.lastInsertRowid);
  const S3 = Number(s3.lastInsertRowid);

  const insReg = db.prepare('INSERT INTO workshop_registrations (workshop_id, user_id, status, registered_at) VALUES (?,?,?,?)');
  insReg.run(w1, priyaId, 'CONFIRMED', iso(-days(5)));
  insReg.run(w1, marcoId, 'CONFIRMED', iso(-days(2)));
  insReg.run(w2, priyaId, 'PENDING', iso(-days(1)));

  // Attendance — Priya: 100% of session 1, 95% of session 2 → 97.5% overall (≥ 90 → eligible)
  const insAtt = db.prepare(
    `INSERT INTO attendance (workshop_session_id, user_id, join_time, leave_time, attended_minutes, required_minutes, attendance_percentage, status, source, recorded_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  insAtt.run(S1, priyaId, iso(-days(3)), iso(-days(3) + 120 * 60_000), 108, 108, 100, 'present', 'organizer', organizerId);
  insAtt.run(S2, priyaId, iso(-days(1)), iso(-days(1) + 114 * 60_000), 102.6, 108, 95, 'present', 'organizer', organizerId);
  insAtt.run(S1, marcoId, iso(-days(3)), iso(-days(3) + 60 * 60_000), 60, 108, 55.6, 'partial', 'organizer', organizerId);

  /* ── Certificates: templates + Priya’s issued certificate ── */
  db.prepare("INSERT INTO certificate_templates (name, title_text, body_text, signature_text, background_style, is_default, is_active) VALUES (?,?,?,?,?,1,1)").run(
    'Classic Solai',
    'Certificate of Completion',
    'is hereby recognized for successfully completing',
    'Anitha Subramanian — Head of Instruction, Solai Academy',
    'classic'
  );
  db.prepare("INSERT INTO certificate_templates (name, title_text, body_text, signature_text, background_style, is_default, is_active) VALUES (?,?,?,?,?,0,1)").run(
    'Workshop Excellence',
    'Certificate of Workshop Excellence',
    'for outstanding attendance in',
    'Meera Raghavan — Workshop Lead, Solai Academy',
    'garden'
  );
  const CERT_ID = `TN-${new Date().getUTCFullYear()}-000001`;
  const certRes = db.prepare(
    `INSERT INTO certificates (certificate_id, user_id, type, course_id, workshop_id, template_id, participant_name, title_text, organizer_text, duration_text, attendance_percentage, issued_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(CERT_ID, priyaId, 'workshop', null, w1, 2, 'Priya Nair', 'Tamil Conversation Bootcamp', 'Anitha Subramanian', '240 minutes (2 of 3 sessions so far)', 97.5, iso(-days(1)));
  const certId = Number(certRes.lastInsertRowid);
  db.prepare('INSERT INTO certificate_verifications (certificate_id, ip) VALUES (?,?)').run(certId, '127.0.0.1');

  /* ── Announcements & notifications ── */
  const insAnn = db.prepare('INSERT INTO announcements (title, body, scope, target_id, is_published, publish_at, created_by) VALUES (?,?,?,?,1,?,?)');
  insAnn.run('Welcome to Solai 🌱', 'We are growing! New lessons are added every week. Check your dashboard for your learning path.', 'global', null, iso(-days(10)), adminId);
  insAnn.run('Bootcamp Session 3 — Friday', 'Session 3 of the Tamil Conversation Bootcamp is Friday. Join 10 minutes early — attendance starts at the scheduled time.', 'workshop', w1, iso(-days(2)), organizerId);
  insAnn.run('New: Speaking Practice', 'The Speaking Practice page now compares what you say with the expected Tamil sentence. Works best in Chrome and Edge.', 'global', null, iso(-days(1)), adminId);

  const insNotif = db.prepare('INSERT INTO notifications (user_id, category, title, body, link_url, is_read, created_at) VALUES (?,?,?,?,?,0,?)');
  insNotif.run(priyaId, 'certificate', 'Certificate issued 🎓', `Your certificate for Tamil Conversation Bootcamp has been issued.`, `/verify/${CERT_ID}`, iso(-days(1)));
  insNotif.run(priyaId, 'workshop', 'Workshop reminder', 'Tamil for Travellers — Live Q&A is in 12 days. Payment is PENDING — complete it to confirm your seat.', '/workshops/tamil-for-travellers-live', iso(-days(1)));
  insNotif.run(priyaId, 'teacher', 'Teacher answered your question', 'Anitha answered: “Why does க sound like “ka”?”', '/ask', iso(-days(2)));
  insNotif.run(priyaId, 'learning', 'New lesson available', 'Lesson 9 · Taking the Bus is now in Everyday Tamil — Conversation.', '/learn/everyday-tamil-conversation', iso(-days(4)));
  insNotif.run(marcoId, 'system', 'Welcome to Solai! 🌱', 'Start with Level 1 · Lesson 1 to meet the Tamil alphabet.', '/learn/tamil-for-beginners', iso(-days(2)));

  /* ── Communities ── */
  const insComm = db.prepare('INSERT INTO communities (slug, name, description, is_private, created_by) VALUES (?,?,?,?,?)');
  const cm1 = insComm.run('tamil-beginners', 'Tamil Beginners', 'Your first steps in Tamil — introduce yourself, ask anything, no question is too small.', 0, adminId);
  const cm2 = insComm.run('tamil-conversation-club', 'Tamil Conversation Club', 'Daily conversation prompts, correction-friendly, all levels welcome.', 0, adminId);
  const cm3 = insComm.run('tamil-for-travellers', 'Tamil for Travellers', 'Phrase scripts and tips for airports, trains, hotels and temples.', 0, adminId);
  const C1 = Number(cm1.lastInsertRowid), C2 = Number(cm2.lastInsertRowid), C3 = Number(cm3.lastInsertRowid);
  const insMember = db.prepare('INSERT INTO community_members (community_id, user_id, role, joined_at) VALUES (?,?,?,?)');
  insMember.run(C1, priyaId, 'member', iso(-days(9)));
  insMember.run(C1, marcoId, 'member', iso(-days(2)));
  insMember.run(C2, priyaId, 'member', iso(-days(5)));
  insMember.run(C3, priyaId, 'member', iso(-days(4)));
  insMember.run(C2, teacherId, 'moderator', iso(-days(20)));

  const insPost = db.prepare('INSERT INTO posts (community_id, user_id, title, body, created_at) VALUES (?,?,?,?,?)');
  const p1 = insPost.run(C1, priyaId, 'Vanakkam! First post from Priya 🙏', 'I just finished Lesson 4. My attempt at the polite “How are you?” — எப்படி இருக்கீர்? — is it correct? (I thought the informal form is எப்போ — can someone confirm?)', iso(-days(3)));
  const p2 = insPost.run(C1, marcoId, 'Madurai trip in October!', 'Planning a 10-day trip. Any must-learn phrases I am missing? I can already say வணக்கம் and தேநீர் வேண்டும் 😄', iso(-days(2)));
  const p3 = insPost.run(C2, priyaId, 'Daily prompt: order a filter coffee', 'Try this: “எனக்கு ஒரு தேநீர் வேண்டும், தயவு செய்து” — post your variations below!', iso(-days(1)));
  const P1 = Number(p1.lastInsertRowid), P2 = Number(p2.lastInsertRowid);
  const P3 = Number(p3.lastInsertRowid);

  db.prepare('INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?,?,?,?)').run(P1, teacherId, 'Great instinct, Priya! You are right — the polite “how are you?” is எப்படி இருக்கீர்? (epadi irukkiR?). எப்போ (epo) is the informal form you use with friends. Well spotted.', iso(-days(3) + 3600_000));
  db.prepare('INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?,?,?,?)').run(P2, priyaId, 'Add “எவ்வளவு?” (how much) for prices and “இங்கு நிறுத்துங்கள்” (stop here) for autos. Madurai is beautiful!', iso(-days(2) + 7200_000));
  db.prepare('INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?,?,?,?)').run(P2, teacherId, 'And for temples: “புகைப்படம் எடுக்கலாமா?” — “May I take a photo?” 📸', iso(-days(2) + 10800_000));
  db.prepare('INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?,?,?,?)').run(P3, teacherId, 'Variation to try: “எனக்கு இரண்டு காபி வேண்டும்” — I want two coffees.', iso(-days(1) + 3600_000));

  const insReact = db.prepare('INSERT INTO reactions (post_id, comment_id, user_id, type) VALUES (?,?,?,?)');
  insReact.run(P1, null, marcoId, 'helpful');
  insReact.run(P1, null, teacherId, 'celebrate');
  insReact.run(P2, null, priyaId, 'like');
  insReact.run(P3, null, marcoId, 'like');

  /* ── Learner questions ── */
  const lq1 = db.prepare(
    `INSERT INTO learner_questions (user_id, lesson_id, course_id, title, body, ai_answer, ai_answered_at, status, assigned_teacher_id, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(
    priyaId, 6, c1,
    'Why does க sound like “ka”?',
    'In Lesson 3 the consonant table shows க — why does it say it carries an inherent “a”? English has no such thing. Does this rule apply to all consonants?',
    'Excellent question! Yes — in Tamil, every consonant carries an inherent short “a” (the inherent vowel). க is read “ka”, த is “ta”, ந is “na”. To silence the vowel, Tamil adds the dot ெ (pulli): க + ெ = a pure “k” sound with no vowel. It works for all 18 basic consonants. Try saying “ka → k” — that difference is the pulli.',
    iso(-days(2)), 'answered', teacherId, iso(-days(2))
  );
  const LQ1 = Number(lq1.lastInsertRowid);
  db.prepare('INSERT INTO teacher_answers (question_id, teacher_id, body, ai_answer_used, created_at) VALUES (?,?,?,?,?)').run(
    LQ1, teacherId,
    'Yes — the inherent vowel “a” applies to all 18 basic consonants. Think of it as the consonant’s “resting state.” The pulli dot (க்) removes it. Practice: ka → k, ta → t, na → n. Ask the AI tutor for 5 more examples and I will check them in the next live session!',
    1, iso(-days(2) + 7200_000)
  );
  db.prepare(
    `INSERT INTO learner_questions (user_id, lesson_id, course_id, title, body, status, assigned_teacher_id, created_at)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(marcoId, 10, c2, 'Train station word I couldn’t understand', 'At the Chennai station a porter shouted something about “பிளாட்ட்பாரம்” — is that “platform”? I want to confirm before my trip.', 'open', teacherId, iso(-days(1)));

  /* ── Scenarios (real-life practice) ── */
  const insScenario = db.prepare(
    `INSERT INTO scenarios (slug, title, description, level, icon, situation_tamil, situation_translit, situation_meaning, starter_prompt, expected_phrases, success_hint, is_published, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)`
  );
  insScenario.run(
    'restaurant', 'Restaurant', 'Order food and drink at a Tamil eatery.', 'beginner', '🍽️',
    'வணக்கம்! என்ன வேண்டும்?', 'vaṇakkam! enna vēṭum?', 'Hello! What do you want?',
    'வணக்கம்! என்ன வேண்டும்? (Hello! What would you like?)',
    JSON.stringify([
      { tamil: 'எனக்கு ஒரு தேநீர் வேண்டும்', translit: 'enakku oru theenir venum', meaning: 'I want a tea, please' },
      { tamil: 'எனக்கு விருன் சாப்பாடு வேண்டும்', translit: 'enakku vaatol saappadu venum', meaning: 'I want a rice meal, please' },
      { tamil: 'எவ்வளவு?', translit: 'evvalavu?', meaning: 'How much is it?' },
      { tamil: 'நன்றி', translit: 'nandri', meaning: 'Thank you' },
    ]),
    'Use “எனக்கு … வேண்டும்” to order, ask the price, and thank the waiter.', 1
  );
  insScenario.run(
    'auto', 'Auto-rickshaw', 'Take an auto-rickshaw to your destination.', 'beginner', '🛺',
    'எங்க போற?', 'enka pōrṟa?', 'Where are you going?',
    'எங்க போற? (Where are you going?)',
    JSON.stringify([
      { tamil: 'பஸ் ஸ்டாண்டு', translit: 'bus standu', meaning: 'Bus stand' },
      { tamil: 'இங்கு நிறுத்துங்கள்', translit: 'ingu niṟtukaḷ', meaning: 'Stop here' },
      { tamil: 'மீட்டர்', translit: 'mīṭṭar', meaning: 'Meter' },
      { tamil: 'எவ்வளவு பணம்?', translit: 'evvalavu paṇam?', meaning: 'How much money?' },
    ]),
    'Name your destination, ask for the meter, say where to stop, and pay.', 2
  );
  insScenario.run(
    'railway', 'Railway Station', 'Find your platform and buy a ticket.', 'intermediate', '🚉',
    'எந்த பிளாட்ட்பாரம்?', 'enda plāṭṭpāram?', 'Which platform?',
    'எந்த பிளாட்ட்பாரம்? (Which platform is the train on?)',
    JSON.stringify([
      { tamil: 'டிரெய்ன் எப்போது?', translit: 'traen eppōtu?', meaning: 'When is the train?' },
      { tamil: 'டிக்கெட் எங்கே?', translit: 'tikkeṭ enge?', meaning: 'Where is the ticket (counter)?' },
      { tamil: 'பிளாட்ட்பாரம் என்ன?', translit: 'plāṭṭpāram enna?', meaning: 'Which platform?' },
      { tamil: 'தாமதமா?', translit: 'tāmathamā?', meaning: 'Is it delayed?' },
    ]),
    'Find the ticket counter, confirm the platform, and check for delays.', 3
  );
  insScenario.run(
    'hotel', 'Hotel Check-in', 'Check in politely and ask about breakfast.', 'intermediate', '🏨',
    'வணக்கம், எப்படி உதவ முடியும்?', 'vaṇakkam, epadi uṭava muṭiyum?', 'Hello, how can I help?',
    'வணக்கம், எப்படி உதவ முடியும்? (Hello, how can I help you?)',
    JSON.stringify([
      { tamil: 'ஒரு அறை வேண்டும், தயவு செய்து', translit: 'oru aṟai venum, tāyvucietu', meaning: 'I would like a room, please' },
      { tamil: 'எனக்கு முன்பதிவு உண்டு', translit: 'eṉakku mumpadivu uṇṭu', meaning: 'I have a reservation' },
      { tamil: 'காலை உணவு எப்போது?', translit: 'kālai uṉavu eppōtu?', meaning: 'When is breakfast?' },
      { tamil: 'செக்-ஔட் எப்போது?', translit: 'checkout eppōtu?', meaning: 'When is checkout?' },
    ]),
    'Give your reservation, ask about breakfast and checkout time, then thank them.', 4
  );
  insScenario.run(
    'market', 'Market & Shopping', 'Compare prices and buy gently.', 'intermediate', '🛍️',
    'எவ்வளவு?', 'evvalavu?', 'How much?',
    'எவ்வளவு? (How much is it?)',
    JSON.stringify([
      { tamil: 'நல்லதா இருக்கு', translit: 'nalladā irukku', meaning: 'It looks good' },
      { tamil: 'சற்று குறைக்க முடியுமா?', translit: 'cattṟu kuraiya kuṟaikk muṭiyumā?', meaning: 'Can you reduce it a little?' },
      { tamil: 'சரி, வாங்கிடுகிறேன்', translit: 'cari, vāṅgikuṭukiṟēṉ', meaning: 'Okay, I will take it' },
      { tamil: 'நன்றி', translit: 'nandri', meaning: 'Thank you' },
    ]),
    'Ask the price, compliment the item, request a small reduction, then commit.', 5
  );

  /* ── XP events (Priya’s streak: 5 days; Marco: 2 days) ── */
  const insXp = db.prepare('INSERT INTO xp_events (user_id, kind, amount, ref_type, ref_id, created_at) VALUES (?,?,?,?,?,?)');
  for (let d = 7; d >= 0; d--) {
    if (d <= 4) insXp.run(priyaId, 'lesson_complete', 20, 'lesson', d + 1, iso(-days(d)));
    if (d <= 1) insXp.run(marcoId, 'lesson_complete', 20, 'lesson', 1, iso(-days(d)));
  }
  insXp.run(priyaId, 'quiz_pass', 50, 'quiz', quiz1, iso(-days(3)));
  insXp.run(priyaId, 'vocab_learned', 10, 'vocabulary', 4, iso(-days(5)));

  /* ── Sample AI conversation (for history UI) ── */
  const conv = db.prepare('INSERT INTO ai_conversations (user_id, title, context_type, context_id, created_at) VALUES (?,?,?,?,?)').run(priyaId, 'Ordering food', 'lesson', 8, iso(-days(2)));
  const convId = Number(conv.lastInsertRowid);
  const insMsg = db.prepare('INSERT INTO ai_messages (conversation_id, role, content, model, provider, created_at) VALUES (?,?,?,?,?,?)');
  insMsg.run(convId, 'user', 'What does this sentence mean? எனக்கு ஒரு தேநீர் வேண்டும்', 'solai-local-retrieval', 'local', iso(-days(2)));
  insMsg.run(convId, 'assistant', '**எனக்கு ஒரு தேநீர் வேண்டும்** (enakku oru theenir venum) means “I want a tea, please.”\n\nBreakdown:\n• எனக்கு (enakku) — to/for me\n• ஒரு (oru) — a / one\n• தேநீர் (theenir) — tea (filter coffee)\n• வேண்டும் (venum) — want / need\n\nThe verb comes at the end, as is normal in Tamil. Try it with different drinks: “எனக்கு ஒரு காபி வேண்டும்” = I want a coffee.', 'solai-local-retrieval', 'local', iso(-days(2) + 60_000));

  /* ── Audit-log entries (real admin actions in seed) ── */
  db.prepare('INSERT INTO audit_logs (actor_id, actor_email, action, entity, entity_id) VALUES (?,?,?,?,?)').run(adminId, 'admin@solai.test', 'ADMIN_CREATED_COURSE', 'course', c1);
  db.prepare('INSERT INTO audit_logs (actor_id, actor_email, action, entity, entity_id) VALUES (?,?,?,?,?)').run(organizerId, 'organizer@solai.test', 'ORGANIZER_UPDATED_WORKSHOP', 'workshop', w1);

  /* ── Separate store: learning resources (NPTEL/YouTube/Alison) + culture explorer ── */
  seedContentResources(db);

  /* ── Index everything into the AI knowledge base ── */
  const stats = reindexAll(db);

  /* Seed-complete marker (self-healing boot) */
  db.exec('CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT)');
  db.prepare("INSERT INTO seed_meta (key, value) VALUES ('seed_version', '2') ON CONFLICT(key) DO UPDATE SET value = excluded.value").run();

  console.log(`[seed] done — ${stats.documents} knowledge documents, ${stats.chunks} chunks indexed.`);
}
