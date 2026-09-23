import type { DB } from '@/db';

/**
 * Seed for the separate learning-resources store (NPTEL / YouTube / Alison /
 * notes / books / guides) and the Culture & Heritage Explorer
 * (temples, heritage, inscriptions, food, festivals, dance, music, dress,
 * regions, museum objects, districts, culture quiz).
 *
 * All external links below are real, public resources.
 */
export function seedContentResources(db: DB): void {
  const adminId = Number((db.prepare("SELECT id FROM users WHERE role='super_admin' LIMIT 1").get() as unknown as { id: number })?.id ?? 1);
  const c1 = Number((db.prepare("SELECT id FROM courses WHERE slug='tamil-for-beginners'").get() as unknown as { id: number })?.id ?? 1);
  const c2 = Number((db.prepare("SELECT id FROM courses WHERE slug='everyday-tamil-conversation'").get() as unknown as { id: number })?.id ?? 2);

  /* ────────────────────────── Learning resources ────────────────────────── */
  const insRes = db.prepare(
    `INSERT INTO learning_resources (course_id, lesson_id, title, title_tamil, type, provider, url, youtube_id, description, description_tamil, language, level, sort_order, is_published)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
  );

  // YouTube — embedded videos (verified video ids)
  insRes.run(c1, null, 'Learn Tamil in 5 Days — Conversation for Beginners', '5 நாடில் தமிழ் கற்போம்', 'video', 'youtube', 'https://www.youtube.com/watch?v=bhF5iR1rufo', 'bhF5iR1rufo',
    'A free crash course covering the 300 most common Tamil words and expressions — ideal first video for absolute beginners.',
    'பொதுவாகப் பயன்படும் 300 தமிழ் வார்த்தைகள் — முழுக்க முழுக்க தொடக்கவர்களுக்கு.', 'en', 'beginner', 1);
  insRes.run(c1, null, 'Learn Tamil Vocabulary — Video 318', 'தமிழ் சொற்கள் கற்றல்', 'video', 'youtube', 'https://www.youtube.com/watch?v=1R0d0Glt_EU', '1R0d0Glt_EU',
    'Everyday vocabulary taught the way native speakers actually say it — with clear pronunciation help.',
    'அன்றாட சொற்கள் — தாய்மொழியானவர்களே பேசும் முறையில்.', 'en', 'beginner', 2);
  insRes.run(c1, null, 'Learn Spoken Tamil for Absolute Beginners (channel)', 'பேசும் தமிழ் கற்றுக்கொள்', 'playlist', 'youtube', 'https://www.youtube.com/@learnspokentamil101', null,
    'An international video series that teaches you to read, write and speak Tamil step by step, entirely in English.',
    'தமிழ் படிக்க, எழுத, பேச — படிப்படியாக, முழுவதுமாக இங்கிலிஷில்.', 'en', 'beginner', 3);
  insRes.run(c1, null, 'Tamil Alphabet — Uyir Ezhuthukal (YouTube lessons)', 'உயிர் எழுத்துக்கள்', 'playlist', 'youtube', 'https://www.youtube.com/results?search_query=learn+tamil+alphabet+uyir+ezhuthukkal', null,
    'Video lessons on the 12 Tamil vowels (uyir ezhuthukkal) — the foundation of reading and writing Tamil.',
    'தமிழ் உயிர் எழுத்துக்கள் (12) — படிக்கவும் எழுதவும் இதுவே அடிப்படை.', 'ta', 'beginner', 4);
  insRes.run(c1, null, 'Tamil Numbers for Beginners (videos)', 'தமிழ் எண்கள்', 'playlist', 'youtube', 'https://www.youtube.com/results?search_query=tamil+numbers+for+beginners', null,
    'Learn one to one hundred — ஒன்று, இரண்டு, மூன்று… — with songs and drills.',
    'ஒன்று முதல் நூறு வரை எண்களை பாடல்களுடன் கற்றல்.', 'ta', 'beginner', 5);
  insRes.run(c2, null, 'Everyday Tamil Conversation (YouTube playlist)', 'அன்றாட கথனல்', 'playlist', 'youtube', 'https://www.youtube.com/results?search_query=everyday+tamil+conversation+phrases', null,
    'Real conversation patterns: greetings, shopping, transport and phone calls — with Tamil + English on screen.',
    'அவசரம், கொடுப்பனவு, போக்குவரத்து, தொலைபேசி — நடைமுறை உரையாடல்கள்.', 'ta', 'intermediate', 6);

  // NPTEL — free IIT video lectures, Tamil translations, e-books
  insRes.run(null, null, 'NPTEL — Free IIT video lectures & course catalog', 'என்பிட்டெல் — இலவச வகுப்புகள்', 'course', 'npel', 'https://nptel.ac.in/courses', null,
    '700+ free certification courses from the IITs and IISc — 174 of them available in Tamil with video lectures, Tamil subtitles, transcripts and e-books. A treasure trove of structured, university-grade learning.',
    '700+ இலவச வகுப்புகள்; 174 வகுப்புகள் தமிழில் — வீடியோ, தலைப்பு-எழுத்து, மின்-நூல்கள்.', 'multi', 'advanced', 10);
  insRes.run(null, null, 'NPTEL home — programmes, swayam & Tamil e-books', 'என்பிட்டெல் முகப்பு', 'guide', 'npel', 'https://nptel.ac.in/', null,
    '159 NPTEL e-books are published in Tamil and 900+ hours of video content carry Tamil audio tracks — all free to use with Solai courses.',
    '159 தமிழ் மின்-நூல்கள் + 900 மணி நேர தமிழ் ஆடியோ வாகைகளுடன்.', 'ta', 'advanced', 11);
  insRes.run(null, null, 'NPTEL Tamil lectures on YouTube', 'என்பிட்டெல் தமிழ் வீடியோ', 'playlist', 'npel', 'https://www.youtube.com/results?search_query=NPTEL+Tamil+lecture', null,
    'Search "NPTEL Tamil" on YouTube to watch university lectures with Tamil explanations — great for advanced learners.',
    'உயர்கல்வி தமிழ் சொற்பொழிவுகளை யூடியூப்பில் பாருங்கள்.', 'ta', 'advanced', 12);

  // Alison — free accredited courses
  insRes.run(null, null, 'Alison — Tamil for Beginners (free, 3h, CPD-accredited)', 'அலிசன் — தொடக்க தமிழ்', 'course', 'alison', 'https://alison.com/course/tamil-for-beginners', null,
    'A free structured course: Tamil alphabet, greetings, numbers, colours, food and animals — with Tamil text, transliteration and English meaning in every lesson. Finish it and you get a certificate.',
    'தமிழ் எழுத்துக்கள், அவசரம், எண்கள், நிறங்கள், உணவு, பறவைகள் — பாடம் முடித்தால் சான்றிதழ்.', 'en', 'beginner', 20);
  insRes.run(null, null, 'Alison — free online courses catalog', 'அலிசன் இலவச வகுப்புகள்', 'course', 'alison', 'https://alison.com/', null,
    'Thousands of free courses for learners worldwide — pair them with Solai for a complete self-study path.',
    'உலகம் முழுவதற்கும் இலவச வகுப்புகள் — சோலை உடன் இணைத்து படிக்கவும்.', 'en', 'beginner', 21);

  // Notes / guides
  insRes.run(c1, null, 'Learn Tamil from YouTube — 20-lesson syllabus (notes)', '20 பாட திட்டம் (குறிப்புகள்)', 'note', 'website', 'https://www.classcentral.com/course/youtube-learn-tamil-54681', null,
    'A syllabus of 20+ video lessons from vowels to combined letters to grammar (paal, porul illakkanam) — use it as a structured study plan alongside Solai Level 1.',
    'உயிர் எழுத்துக்கள் முதல் இலக்கணம் வரை 20+ பாடங்கள் — சோலை நிலை 1 உடன் பயன்படுத்தவும்.', 'en', 'beginner', 30);
  insRes.run(c2, null, 'NPTEL IIT Kharagpur — open learning resources', 'என்பிட்டெல் – ஐ.ஐ.டி.கே.பி.', 'guide', 'npel', 'https://nptel.iitkgp.ac.in/', null,
    'Open-access recorded lectures and study material from NPTEL, IIT Kharagpur — courses in Tamil, Hindi and many Indian languages.',
    'தமிழ், இந்தி உள்ளிட்ட மொழிகளில் இலவச சொற்பொழிவுகள்.', 'multi', 'intermediate', 31);


  // Live teaching — recorded classes & lectures on YouTube (Sangam literature,
  // TNPSC/UPSC Tamil history, temples, inscriptions, food, Silambam & culture).
  // Shared via the Kaviyarasi batch; more lectures are added as they arrive.
  insRes.run(null, null, "\u0b9a\u0b99\u0bcd\u0b95 \u0b87\u0bb2\u0b95\u0bcd\u0b95\u0bbf\u0baf\u0bae\u0bcd/\u0b9a\u0b99\u0bcd\u0b95 \u0b87\u0bb2\u0b95\u0bcd\u0b95\u0bbf\u0baf\u0ba4\u0bcd\u0ba4\u0bbf\u0ba9\u0bcd \u0bae\u0bbe\u0ba3\u0bcd\u0baa\u0bc1\u0b95\u0bb3\u0bcd/TNPSC/TAMIL/sangam literatur/\u0b8e\u0b9f\u0bcd\u0b9f\u0bc1\u0ba4\u0bcd\u0ba4\u0bca\u0b95\u0bc8/Ettuthogai", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=Ll-Kzuprp3s', 'Ll-Kzuprp3s',
    "Recorded live teaching \u00b7 \u0ba4\u0bae\u0bbf\u0bb4\u0bcd\u0b95\u0ba3\u0bc7\u0bb7\u0bcd", null, 'ta', null, 40);
  insRes.run(null, null, "\u0938\u0902\u0917\u092e \u0938\u093e\u0939\u093f\u0924\u094d\u092f | Sangam Literature | Tamil Classics & Culture |  UPSC CSE 2026-27 | B L Trivedi", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=j9DbKbfJ1vI', 'j9DbKbfJ1vI',
    "Recorded live teaching \u00b7 CKS Academy", null, 'en', null, 41);
  insRes.run(null, null, "Sthala Puranas | Part 5 | by Sri PR Kannan | 20Feb22 | Patanjali | Mahabhashyam | 1000 pillared", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=Ow8eiLJtZ6U', 'Ow8eiLJtZ6U',
    "Recorded live teaching \u00b7 Sri Kanchi Kamakoti Peetam, Kanchipuram", null, 'en', null, 42);
  insRes.run(null, null, "Sthala Puranas | Part 11 | by Sri PR Kannan | 03Apr22 | @ 6PM | Sri Parthasarathy Swamy Temple", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=I5VVt1wpGlo', 'I5VVt1wpGlo',
    "Recorded live teaching \u00b7 Thanjavur Parampara", null, 'en', null, 43);
  insRes.run(null, null, "Sthala Puranas | Part 12 | by Sri PR Kannan | 10Apr22 | @ 6PM | Sri Jayantipura Mahatmyam |", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=9Pkd3_nrgzc', '9Pkd3_nrgzc',
    "Recorded live teaching \u00b7 Sri Kanchi Kamakoti Peetam, Kanchipuram", null, 'en', null, 44);
  insRes.run(null, null, "Ancient Tamil Nadu SECRETS That Will Change How You See History | Malavika Binny | TRS", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=hdzasYoSmGk', 'hdzasYoSmGk',
    "Recorded live teaching \u00b7 BeerBiceps", null, 'en', null, 45);
  insRes.run(null, null, "Kundalakesi Story in Tamil | \u0b95\u0bc1\u0ba3\u0bcd\u0b9f\u0bb2\u0b95\u0bc7\u0b9a\u0bbf \u0b95\u0ba4\u0bc8 | Aimperum Kappiyangal | AppleBox Sabari", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=WnhKueN1myc', 'WnhKueN1myc',
    "Recorded live teaching \u00b7 APPLEBOX By Sabari", null, 'ta', null, 46);
  insRes.run(null, null, "GREAT EPIC OF POST SANGAM LITERATURE  - MANIMEGHALAI - IN TAMIL WITH SHORT NOTES #TnpscVetripaadhai", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=UjPUhSBS5ME', 'UjPUhSBS5ME',
    "Recorded live teaching \u00b7 TNPSC Vetripaadhai", null, 'en', null, 47);
  insRes.run(null, null, "Gangai Konda Cholapuram | Virtual Tour of \u0b99\u0b99\u0bcd\u0b95\u0bc8 \u0b95\u0b95\u0bcd\u0b95\u0bcb\u0ba9\u0bcd\u0b9f \u0b9a\u0bcb\u0bb4\u0baa\u0bc1\u0bb0\u0bae\u0bcd | Weekend Getaway From Chennai \ud83c\udfcd\ud83d\ude98", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=IPfKydF-Py8', 'IPfKydF-Py8',
    "Recorded live teaching \u00b7 WORLD OF SPARK", null, 'ta', null, 48);
  insRes.run(null, null, "Dance in Early Tamilakam by Prof. Mahalakshmi Ramakrishnan", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=4ReLkXJGt5w', '4ReLkXJGt5w',
    "Recorded live teaching \u00b7 University of Hyderabad", null, 'en', null, 49);
  insRes.run(null, null, "Sucheendram Temple Legends & Epigraphy| Dr G Sankara Narayanan | #NAM2020 Online | Lakshmi Ramaswamy", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=d2lz3ayu-cg', 'd2lz3ayu-cg',
    "Recorded live teaching \u00b7 Lakshmi Ramaswamy's Sri Mudhraalaya", null, 'en', null, 50);
  insRes.run(null, null, "Keezhadi excavation findings - full details | \u0b95\u0bc0\u0bb4\u0b9f\u0bbf \u0b87\u0ba8\u0bcd\u0ba4\u0bbf\u0baf \u0bb5\u0bb0\u0bb2\u0bbe\u0bb1\u0bcd\u0bb1\u0bc8\u0baf\u0bc7  \u0ba4\u0bbf\u0bb0\u0bc1\u0ba4\u0bcd\u0ba4\u0bbf \u0b8e\u0bb4\u0bc1\u0ba4\u0bc1\u0bae\u0bbe? | Keeladi", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=IrV6wC_Fvdc', 'IrV6wC_Fvdc',
    "Recorded live teaching \u00b7 BBC News Tamil", null, 'ta', null, 51);
  insRes.run(null, null, "The Oldest Settlements in South India: The Keeladi Excavations", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=XOXFTwb9GnA', 'XOXFTwb9GnA',
    "Recorded live teaching \u00b7 Storytrails", null, 'en', null, 52);
  insRes.run(null, null, "\u0b9a\u0b99\u0bcd\u0b95 \u0b95\u0bbe\u0bb2\u0bae\u0bcd \u0b95\u0bc1\u0bb1\u0bbf\u0ba4\u0bcd\u0ba4\u0bc1 \u0b95\u0bc0\u0bb4\u0b9f\u0bbf \u0b85\u0b95\u0bb4\u0bcd\u0bb5\u0bbe\u0bb0\u0bbe\u0baf\u0bcd\u0b9a\u0bcd\u0b9a\u0bbf \u0b9a\u0bc6\u0bbe\u0bb2\u0bcd\u0bb5\u0ba4\u0bc1 \u0b8e\u0ba9\u0bcd\u0ba9? | \u0b85\u0bae\u0bb0\u0bcd\u0ba8\u0bbe\u0ba4\u0bcd \u0bb0\u0bbe\u0bae\u0b95\u0bbf\u0bb0\u0bc1\u0bb7\u0bcd\u0ba3\u0bbe | Keeladi Excavation", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=AzU9filsWtQ', 'AzU9filsWtQ',
    "Recorded live teaching \u00b7 KULUKKAI", null, 'ta', null, 53);
  insRes.run(null, null, "\u0b9a\u0bbf\u0bb2\u0baa\u0bcd\u0baa\u0ba4\u0bbf\u0b95\u0bbe\u0bb0\u0bae\u0bcd \u0baa\u0bc1\u0b95\u0bbe\u0bb0\u0bcd\u0b95\u0bcd \u0b95\u0bbe\u0ba3\u0bcd\u0b9f\u0bae\u0bcd \u0bae\u0bc1\u0bb4\u0bc1\u0ba4\u0bcd\u0ba4\u0bca\u0b95\u0bc1\u0baa\u0bcd\u0baa\u0bc1 l G Gnanasambandan l #Silappathikaram #Puharkaandam", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=_Dvppw1CGq4', '_Dvppw1CGq4',
    "Recorded live teaching \u00b7 G Gnanasambandan", null, 'ta', null, 54);
  insRes.run(null, null, "Did elephants haul tonnes of rock 200 feet up to the top of this temple?", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=BgJ6oS6oCtI', 'BgJ6oS6oCtI',
    "Recorded live teaching \u00b7 HISTORY TV18", null, 'en', null, 55);
  insRes.run(null, null, "Thanjai Periya Kovil History in Tamil  | Thanjai Periya Kovil TOUR | Raja Raja Cholan Temple", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=MU32pzCgQiY', 'MU32pzCgQiY',
    "Recorded live teaching \u00b7 Ungal Anban Hemanth", null, 'en', null, 56);
  insRes.run(null, null, "Brihadeeswara Temple, a Marvelous landmark in South India | Sancharam | CHETTINAD | Safari TV", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=YFw2SG7-vRo', 'YFw2SG7-vRo',
    "Recorded live teaching \u00b7 Safari", null, 'en', null, 57);
  insRes.run(null, null, "Evolution of Tamil with Dr E Jeeva", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=5ikMK9_sXFs', '5ikMK9_sXFs',
    "Recorded live teaching \u00b7 What You Missed In Tamil Class", null, 'en', null, 58);
  insRes.run(null, null, "Tamil brahmi inscriptions and paintings created by the ancient man 4000 years ago | Mr.DK", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=O9B9XqEnPV8', 'O9B9XqEnPV8',
    "Recorded live teaching \u00b7 Mr.DK", null, 'en', null, 59);
  insRes.run(null, null, "The Secret About Pallavas! \ud83e\udd81 - Tamil Podcast | Mannar Mannan | Vallal Media | Varun Talks", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=_B3FC-XIkxM', '_B3FC-XIkxM',
    "Recorded live teaching \u00b7 Varun Talks", null, 'en', null, 60);
  insRes.run(null, null, "The Rise and Fall of the Pallava Dynasty | Builders of Mahabalipuram | Ancient India Documentary", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=_4-aVaAibkk', '_4-aVaAibkk',
    "Recorded live teaching \u00b7 Engr. Usama Manzoor", null, 'en', null, 61);
  insRes.run(null, null, "Sangam Age in Tamil | Chera Chola Pandya History in Tamil | TNPSC History |  Karthick Elangovan |", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=F0POARTdurU', 'F0POARTdurU',
    "Recorded live teaching \u00b7 Quick Learning 4 TNPSC , IBPS, SSC", null, 'en', null, 62);
  insRes.run(null, null, "Cheras Cholas Pandyas | Sangam Age - Political History | Ancient History for UPSC", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=83Tnofm1LJM', '83Tnofm1LJM',
    "Recorded live teaching \u00b7 Bookstawa", null, 'en', null, 63);
  insRes.run(null, null, "2000-\u0bb5\u0bb0\u0bc1\u0b9f \u0baa\u0bbf\u0bb0\u0bae\u0bcd\u0bae\u0bbe\u0ba3\u0bcd \u0bb5\u0bb0\u0bb2\u0bbe\u0bb1\u0bc1!\ud83d\udd25FULL History in 1 Hour | Pandya History | Pandya King History in Tamil", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=tlxLZP9TYtc', 'tlxLZP9TYtc',
    "Recorded live teaching \u00b7 Ungal Anban Hemanth", null, 'ta', null, 64);
  insRes.run(null, null, "The Pandya Dynasty \u2013 Ancient Tamil Kings Who Shaped South India\u2019s Glory \ud83c\udf3a Forgotten Empire Reborn ", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=LHwH3i1OrZs', 'LHwH3i1OrZs',
    "Recorded live teaching \u00b7 TIME CAPSULE TALES", null, 'en', null, 65);
  insRes.run(null, null, "madurai tamizhi inscription | nedunchezhiyan pandya king | tamil", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=9QOz9h9rrQY', '9QOz9h9rrQY',
    "Recorded live teaching \u00b7 Across Cultures: A Valluvar Path", null, 'en', null, 66);
  insRes.run(null, null, "3000 \u0bb5\u0bb0\u0bc1\u0b9a\u0bae\u0bcd \u0baa\u0bb4\u0bc8\u0baf \u0b95\u0bcb\u0bb5\u0bbf\u0bb2\u0bcd\ud83d\ude31#madurai #thiruparangundram #travelvlog", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=qWI9yDSzuaM', 'qWI9yDSzuaM',
    "Recorded live teaching \u00b7 Srii vlogz", null, 'ta', null, 67);
  insRes.run(null, null, "Discovered in Madurai: Is This 800-Year-Old Temple the Final Trace of the Pandyas? | EDU TERIA IAS", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=I2ktXXRbl0E', 'I2ktXXRbl0E',
    "Recorded live teaching \u00b7 EDU TERIA IAS", null, 'en', null, 68);
  insRes.run(null, null, "Chettinad Heritage & Cultural Festival - Fourth Edition (2025) | Short Documentary", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=qez1rO2EmEY', 'qez1rO2EmEY',
    "Recorded live teaching \u00b7 Coromandel Productions", null, 'en', null, 69);
  insRes.run(null, null, "Discovering the Beauty and Richness of Tamil Nadu", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=QrhpDFB3buc', 'QrhpDFB3buc',
    "Recorded live teaching \u00b7 Tattva", null, 'en', null, 70);
  insRes.run(null, null, "\u0ba4\u0bae\u0bbf\u0bb4\u0bb0\u0bcd \u0baa\u0bbe\u0bb0\u0bae\u0bcd\u0baa\u0bb0\u0bbf\u0baf  \u0b86\u0ba4\u0bbf \u0ba4\u0bae\u0bbf\u0bb4\u0bcd \u0b87\u0b9a\u0bc8\u0baf\u0bc1\u0b9f\u0ba9\u0bcd \u0baa\u0bb1\u0bc8 \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd \u0b9a\u0bbf\u0bb2\u0bae\u0bcd\u0bae\u0bae\u0bcd Tamil Art of Beautiful Parai Isai Silambam", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=pWlZo2FvhYA', 'pWlZo2FvhYA',
    "Recorded live teaching \u00b7 RN MEDIA TAMIL \u0bb5\u0bbf\u0bb4\u0bbf\u0ba4\u0bcd\u0ba4\u0bbf\u0bb0\u0bc1 \u0ba4\u0bae\u0bbf\u0bb4\u0bbe", null, 'ta', null, 71);
  insRes.run(null, null, "Silambam by American Tamil Women | Tamil Kural | Silambam Ladies | Silambam Fight | Martial arts |", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=Wf_pAGQJD4M', 'Wf_pAGQJD4M',
    "Recorded live teaching \u00b7 Tamilkural", null, 'en', null, 72);
  insRes.run(null, null, "Can not hide Truth ! | Ancient Tamil Food | \u0b9a\u0b99\u0bcd\u0b95 \u0b95\u0bbe\u0bb2 \u0ba4\u0bae\u0bbf\u0bb4\u0bb0\u0bcd \u0b89\u0ba3\u0bb5\u0bc1 #tamil", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=47utjr0DMAU', '47utjr0DMAU',
    "Recorded live teaching \u00b7 Damaaram", null, 'ta', null, 73);
  insRes.run(null, null, "Ancient Vegetables: What did Indians Eat Before Colonisation?", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=KatdtodBpY8', 'KatdtodBpY8',
    "Recorded live teaching \u00b7 krishashok", null, 'en', null, 74);
  insRes.run(null, null, "The Shocking History of Indian Food Hierarchies | Dr Pal", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=Y14hr3FEZXc', 'Y14hr3FEZXc',
    "Recorded live teaching \u00b7 Dr Pal", null, 'en', null, 75);
  insRes.run(null, null, "Prof. V. SELVAKUMAR : MUSIRI IN SANGAM LITERATURE AND PATTANAM EXCAVATION.", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=Pvs0aZrt3Xg', 'Pvs0aZrt3Xg',
    "Recorded live teaching \u00b7 Dr B.ARUNRAJ", null, 'en', null, 76);
  insRes.run(null, null, "What was the BIGGEST Secret of Ancient Tamil Trade? | @Rangawisdom", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=dFCFLyQD7GE', 'dFCFLyQD7GE',
    "Recorded live teaching \u00b7 RANGA Wisdom", null, 'en', null, 77);
  insRes.run(null, null, "\u201cKilvalai & Sethavarai: Tamil Nadu\u2019s 3000-Year-Old Rock Paintings\u201d", null, 'live_class', 'youtube', 'https://www.youtube.com/watch?v=KWhxiUjiKSo', 'KWhxiUjiKSo',
    "Recorded live teaching \u00b7 PASSION FOR TRAVEL", null, 'en', null, 78);

  /* ────────────────────────── Culture: temples & heritage ────────────────────────── */
  const insCulture = db.prepare(
    `INSERT INTO culture_items (category, slug, title, title_tamil, subtitle, subtitle_tamil, meaning, meaning_tamil, description, description_tamil, region, era, facts_json, sort_order, is_published)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`
  );
  const F = (o: Record<string, string>[]) => JSON.stringify(o);

  insCulture.run('temple', 'brihadeeswarar', 'Brihadeeswarar Temple', 'பிரகதீஸ்வரர் கோவில்', 'Thanjavur · Rajaraja Chola, 1010 CE', 'தஞ்சாவூர் · ராஜராஜ சோழன், 1010', null, null,
    'A UNESCO World Heritage masterpiece. Its 66-metre vimana (tower) was the tallest brick-and-stone structure in the world when built. The entire shrine is granite, including a 80-tonne monolithic base and a 20-tonne capstone.',
    'யுனெஸ்கோ உலக பாரம்பரியம். 66 மீட்டர் விமானம் அப்போது உலகின் உயர்ந்த கட்டடம். முழுக்க கிராணைட் கல்.', 'Thanjavur', 'Chola · 11th century',
    F([{ l: 'Built by', v: 'Rajaraja Chola I (1010 CE)' }, { l: 'Deity', v: 'Shiva (Nandi the bull faces west — rare)' }, { l: 'Height', v: 'Vimana ≈ 66 m (217 ft)' }, { l: 'UNESCO', v: 'World Heritage Site, 2004' }]), 1);

  insCulture.run('temple', 'meenakshi', 'Meenakshi Amman Temple', 'மீனாட்சி அம்மன் கோவில்', 'Madurai · Nayak-era gopurams', 'மதுரை · நாயக்கர் காலம்', null, null,
    'The beating heart of Madurai, with 14 towering gopurams covered in hundreds of thousands of brightly painted sculptures of gods, demons and dancers. The temple town is planned around the goddess Meenakshi, wife of Lord Sundareswarar.',
    'மதுரையின் மனம். 14 கோபுரங்கள், லட்சக்கணக்கான சிற்பங்கள். அம்மன் மீனாட்சி — சுந்தரேஸ்வரரின் மனைவி.', 'Madurai', '14th–17th century (Nayak)',
    F([{ l: 'Gopurams', v: '14 towers, tallest ≈ 52 m' }, { l: 'Deity', v: 'Meenakshi (Parvati) & Sundareswarar (Shiva)' }, { l: 'Famous for', v: 'Chithirai Thiruvizha (goddess wedding festival)' }]), 2);

  insCulture.run('temple', 'rameswaram', 'Ramanathaswamy Temple', 'ராமநாதசுவாமி கோவில்', 'Rameswaram · 22-km corridor of pillars', 'ரமேஸ்வரம்', null, null,
    'One of the 12 Jyotirlingas. Its pillared corridors stretch about 6.9 km — among the longest in the world. Legend says Rama worshipped Shiva here before returning to Ayodhya after rescuing Sita.',
    '12 ஜோதிர்லிங்கங்களில் ஒன்று. உலகின் நீளமான கோவில் படிக்கைகளில் ஒன்று.', 'Rameswaram', '15th century (Chola origin)',
    F([{ l: 'Jyotirlinga', v: '1 of the 12 Shiva Jyotirlingas' }, { l: 'Corridor', v: '≈ 6.9 km of pillared corridors' }, { l: 'Wells', v: '22 theerthams (holy wells), Agni Theertham first' }]), 3);

  insCulture.run('temple', 'airavateswara', 'Airavateswara Temple', 'அயிரவதேஸ்வரர் கோவில்', 'Darasuram · Chola, 12th century', 'தாராசூரம் · சோழர் காலம்', null, null,
    'The most complete Chola temple still standing, with a magnificent carved mandapam (audience hall). Part of the UNESCO "Great Living Chola Temples" group.',
    'மிக முழுமையான சோழர் கோவில். யுனெஸ்கோ "Great Living Chola Temples" பகுதி.', 'Darasuram', 'Chola · 12th century',
    F([{ l: 'Built by', v: 'Rajendra Chola I' }, { l: 'UNESCO', v: 'World Heritage Site, 2004' }, { l: 'Deity', v: 'Shiva (Airavateswara = "elephant lord")' }]), 4);

  insCulture.run('temple', 'gangaikondacholapuram', 'Gangaikondacholapuram Temple', 'கங்கைகொண்டசோழபுரம் கோவில்', 'Rajendra Chola, 1036 CE', null, null, null,
    'Rajendra Chola built this to commemorate his victory over the Ganga dynasty — he brought holy Ganga water and named the town after the event. Its vimana once rivaled Brihadeeswarar.',
    'கங்கா வெற்றியை நினைவுகூரும் கோவில்.', 'Kumbakonam', 'Chola · 11th century',
    F([{ l: 'Built by', v: 'Rajendra Chola I (1036 CE)' }, { l: 'UNESCO', v: 'World Heritage Site, 2004' }, { l: 'Deity', v: 'Shiva' }]), 5);

  insCulture.run('temple', 'shore', 'Shore Temple', 'கங்கைக் கோவில்', 'Mahabalipuram · Pallava, 8th century', 'மகாபலிபுரம் · பல்லவர் காலம்', null, null,
    'A seaside shrine of the Pallava king Rajasimha, carved from living rock and facing the Bay of Bengal. A UNESCO site and the face of Tamil heritage on every postcard.',
    'மகாபலிபுரத்தில் கடலை நோக்கி நிற்கும் பாறைக் கோவில்.', 'Mahabalipuram', 'Pallava · 8th century',
    F([{ l: 'Built by', v: 'Narasimhavarman II (Rajasimha)' }, { l: 'Style', v: 'Rock-cut + structural, Dravidian' }, { l: 'UNESCO', v: 'Part of "Monuments of Mahabalipuram", 1984' }]), 6);

  insCulture.run('temple', 'srirangam', 'Sri Ranganathaswamy Temple', 'ஸ்ரீரங்கநாதசுவாமி கோவில்', 'Srirangam · the largest functioning temple', 'ஸ்ரீரங்கம்', null, null,
    'Spread over 217 acres with seven concentric walls — the largest functioning Hindu temple in the world. A Vaishnava holiest site, home of the famous Vaikuntavasi festival.',
    '217 ஏக்கர், 7 சுவர்கள் — உலகின் மிகப் பெரிய செயல்படும் கோவில்.', 'Srirangam', '2nd century legend · 12th century Chola',
    F([{ l: 'Area', v: '≈ 217 acres, 7 Prakarams' }, { l: 'Deity', v: 'Ranganatha (reclining Vishnu)' }, { l: 'Famous for', v: 'Vaikuntavasi, Thiruvonam festival' }]), 7);

  insCulture.run('heritage', 'marudhamalai', 'Marudhamalai Fort', 'மருதமாலை கோட்டை', 'Vellore · 17th-century hill fort', 'வேலூர்', null, null,
    'A hill fort with underground chambers, cannon positions and a secret tunnel system. Tipu Sultan and the British both fought over it in the 1780s — a dramatic slice of Tamil military history.',
    'வாசல்கள், துப்பாக்கி இடங்கள், ரகசியச் சுரங்கங்கள். தீபு சுல்தான்-பிரித்தானியப் போராட்டம்.', 'Vellore', '17th century',
    F([{ l: 'Location', v: 'Marudhamalai hill, Vellore' }, { l: 'Key era', v: '1780s — Tipu Sultan vs British' }, { l: 'Features', v: 'Underground chambers, secret tunnels' }]), 8);

  insCulture.run('heritage', 'vellore', 'Vellore Fort', 'வேலூர் கோட்டை', 'Built by the Dutch, 1633', null, null, null,
    'A triangular star fort built by the Dutch East India Company, later used by the British — and the site of the 1806 Vellore Mutiny, one of the earliest revolts against the British in India.',
    'ஆங்கிலேயர்க்கெதிரான 1806 வேலூர் கிளர்ச்சியின் இடம்.', 'Vellore', '1633 (Dutch)',
    F([{ l: 'Built by', v: 'Dutch East India Company' }, { l: 'Historic event', v: 'Vellore Mutiny, July 1806' }, { l: 'Shape', v: 'Triangular star fort' }]), 9);

  /* ────────────────────────── Culture: inscriptions ────────────────────────── */
  insCulture.run('inscription', 'mangulam', 'Mangulam Inscription', 'மாங்குலம் கல்வெட்டு', 'Madurai district · 3rd century BCE', 'மதுரை மாவட்டம்', 'Kadalan Vazhuthi, a worker of Nedunchezhiyan, made a stone bed for the Jain monk Nanda Sirikuvan.', 'நெடுஞ்சேழியனின் தொழிலாளி கடலன் வாழுதியன், நந்த சிரிகுவான் (ஜெயின் சாலைக்காரர்) என்பவருக்கு கல் படுக்கை செய்தான் — என்ற கல்வெட்டு.',
    'One of the oldest Tamil rock inscriptions (Tamil-Brahmi script). It proves that Tamil — not just Sanskrit or Prakrit — was carved on stone in the Sangam age.',
    'தமிழ்-பிராமி எழுத்தில் — சங்க காலத்தில் கல்லில் தமிழ் எழுதப்பட்டதே இதன் சான்று.', 'Madurai district', '3rd century BCE',
    F([{ l: 'Script', v: 'Tamil-Brahmi' }, { l: 'Mentions', v: 'Nedunchezhiyan (Pandya king), Jain monk Nanda Sirikuvan' }, { l: 'Significance', v: 'Earliest Tamil rock inscription' }]), 1);

  insCulture.run('inscription', 'jambai', 'Jambai Inscription', 'ஜம்பாய் கல்வெட்டு', 'Tiruvannamalai district · 1st century BCE', 'திருவண்ணாமலை மாவட்டம்', 'ஸதியபுதோ அதியந் நெடுமாந் அஞ்சி ஈத்த பாழி — "The hermitage (palli) given by Atiyan Neduman Anji, a Satyaputra."', 'அதியன் நெடுமானஞ்சி (ஸதியபுத்து) தந்த குடிகாறும் பாளையம்.',
    'A single line of Tamil-Brahmi that settled a 2,000-year debate: the "Satyaputra" clan named in Ashoka\'s inscriptions was a South Indian (Tamil) dynasty. A landmark of Tamil epigraphy.',
    'அசோகர் கல்வெட்டில் எழுதப்பட்ட "ஸதியபுத்து" இனம் தமிழ் இனம் என்பதை நிரூபித்த கல்வெட்டு.', 'Tiruvannamalai district', '1st century BCE',
    F([{ l: 'Reads', v: 'Satiyaputo Atiyan Nedumaan Anji itta Paali' }, { l: 'Meaning', v: 'Hermitage given by Atiyan Neduman Anji, Satyaputra' }, { l: 'Significance', v: 'Identifies the Satyaputra dynasty of Ashoka\'s records' }]), 2);

  insCulture.run('inscription', 'mangudi', 'Mangudi Inscription', 'மாங்குடி கல்வெட்டு', 'Tirunelveli · 2nd century BCE', 'திருநெல்வேலி', 'Kurummangala Athan yi Yanai Po — "The horse cart of Kurumangala, son of Athan."', 'அத்தனின் மகன் குருமகளாவின் குதிரை வண்டி.',
    'A pottery shard (Tamil-Brahmi) showing that ordinary people — cart-owners, farmers, toddy-tappers — marked their belongings in Tamil. Literacy was common in the Sangam age.',
    'பொது மக்களும் தமிழில் எழுதித் தெரிவித்தனர் — எழுத்துரத்து அன்றாடம் என்பதற்கு சான்று.', 'Tirunelveli', '2nd century BCE',
    F([{ l: 'Material', v: 'Inscribed pottery (black-and-red ware)' }, { l: 'Reads', v: 'Kurummangala Athan yi Yanai Po' }, { l: 'Significance', v: 'Everyday literacy in Sangam Tamil Nadu' }]), 3);

  insCulture.run('inscription', 'sittanavasal', 'Sittanavasal Cave Inscription', 'சித்தனவாசல் குகைக் கல்வெட்டு', 'Pudukkottai · 1st century BCE', 'புதுக்கோட்டை', 'Eruminatu kumul-ur piranta kavuti-i tenku-cirupocil ilayar ceyta atit-anam — an offering of a rock-cut cave to Jain monks.', 'ஜெயின் சாலைக்காரர்களுக்குக் குகை அர்ப்பணிப்பு — தமிழ்-பிராமி கலைச்சாதனையின் மாதிரி.',
    'Rock-bed inscriptions inside natural caves where Jain monks lived. Among the finest examples of Tamil-Brahmi artistry in Tamil Nadu.',
    'ஜெயின் திருநிருவாகவாசிகளுக்குக் குகை அர்ப்பணிப்பு — தமிழ்-பிராமி கலைச்சாதனையின் மாதிரி.', 'Pudukkottai', '1st century BCE',
    F([{ l: 'Script', v: 'Tamil-Brahmi, rock-cut' }, { l: 'Dedicated to', v: 'Jain monks (Kulavika community)' }, { l: 'Significance', v: 'Cave religion + Tamil script combined' }]), 4);

  insCulture.run('inscription', 'korkai', 'Korkai (Andrapattinam) Finds', 'கொற்கை (அந்தரப்பட்டுனம்) கண்டங்கள்', 'Thoothukudi · 3rd century BCE port', 'துத்துக்குடி', 'Potsherds in Tamil-Brahmi from the port of Korkai — the great Pandya harbour of Sangam literature.', 'சங்க இலக்கியக் கொற்கை துறைமுகத்திலிருந்து தமிழ்-பிராமி தாண்டிக் கைகள்.',
    'Korkai was the Pandya port where the Chola prince Karikalan drowned, according to the Silappadhikaram. The excavated Tamil inscriptions prove real, large-scale maritime trade.',
    'சிலப்பதிகாரக் கொற்கை — கடல் வணிகம் நிஜம் என்பதற்கான பழங்கல் சான்று.', 'Thoothukudi', '3rd century BCE',
    F([{ l: 'Site', v: 'Korkai, Thoothukudi district' }, { l: 'Finds', v: 'Tamil-Brahmi potsherds, megalithic urns' }, { l: 'Significance', v: 'Sangam-age maritime trade in Tamil' }]), 5);

  insCulture.run('inscription', 'adichanallur', 'Adichanallur & Keeladi', 'அடிசனல்லூர் & கீழாடி', 'Nagapattinam / Virudhunagar · up to ~3,800 years', 'நாகப்பட்டினம்', 'Megalithic urn fields with Tamil-Brahmi inscriptions; Keeladi yields Tamil-script artifacts dated to 580 BCE.', 'தமிழ்-பிராமி எழுத்துகளையுடைய கல்லறைக் களங்கள்; 580 கி.மு. கீழாடி கண்டங்கள்.',
    'Among the oldest Tamil writing ever found. The urn-burial fields and the Keeladi excavations push Tamil literacy back to at least the 6th–3rd century BCE.',
    'தமிழ் எழுத்துரத்தின் மிகப் பழமையான சான்றுகள் (6–3ஆம் நூற்றாண்டு கி.மு. வரை).', 'Nagapattinam / Virudhunagar', '6th–3rd century BCE',
    F([{ l: 'Site', v: 'Adichanallur (Nagapattinam), Keeladi (Virudhunagar)' }, { l: 'Dating', v: 'Artifacts dated to 580 BCE (Keeladi)' }, { l: 'Significance', v: 'Oldest Tamil inscriptions in India' }]), 6);

  insCulture.run('inscription', 'andipatti', 'Andipatti "Toddy Pot"', 'அண்டிப்பட்டி "பாக்குத் தொட்டி"', 'Vellore · 3rd century CE', 'வேலூர்', 'நாகன் உரல் (naakan uRal) — "Nakan\'s pot for toddy-sap."', 'நாகனின் பாக்குத் தொட்டி — நாகனின் சொந்தமாக எழுதிய தொட்டி.',
    'A humble potters\' mark — but it shows a rural toddy-tapper writing his name and the pot\'s purpose in Tamil. Literacy reached the countryside.',
    'கிராமத்துத் தொட்டித் தடவை எழுதிய தமிழ் — எழுத்துரத்து கிராமம் வரை சேர்ந்தது.', 'Vellore', '3rd century CE',
    F([{ l: 'Reads', v: 'naakan uRal — "Nakan\'s pot (for toddy)"' }, { l: 'Material', v: 'Inscribed pottery' }, { l: 'Significance', v: 'Rural literacy, ownership marks' }]), 7);

  insCulture.run('inscription', 'anaikoddai', 'Anaikoddai (Sri Lanka)', 'ஆனையக்கோடை (இலங்கை)', 'Sri Lanka · c. 3rd century BCE', 'இலங்கை', 'திருளி முரி (tiraLi muRi) — "written agreement of the assembly."', 'கூட்டத்தின் எழுத்துப்பூர்வ ஒப்பந்தம்.',
    'A Tamil merchant guild\'s written agreement, found in Sri Lanka — proof that Tamil traders ran organised maritime business across the bay over 2,000 years ago.',
    'தமிழ் வணிகக் கூட்டத்தின் எழுத்துப்பூர்வ ஒப்பந்தம் — 2000+ ஆண்டுகளுக்கு முன் கடல் வணிகம்.', 'Sri Lanka', 'c. 3rd century BCE',
    F([{ l: 'Site', v: 'Anaikoddai, southern Sri Lanka' }, { l: 'Reads', v: 'tiraLi muRi — written agreement of the assembly' }, { l: 'Significance', v: 'Tamil mercantile guilds in maritime trade' }]), 8);

  /* ────────────────────────── Culture: food ────────────────────────── */
  insCulture.run('food', 'dosa', 'Masala Dosa', 'தோசை', 'Crisp rice-and-dal crepe', 'வெல்லுறையான அரிசி-வாழை தோசை', null, null,
    'The pride of Tamil breakfast: a thin, crisp crepe of fermented rice-and-lentil batter, folded around potato masala, with sambar and coconut chutney on the side.',
    'தமிழ் காலை உணவின் பெருமை — சாம்பர் & கோழை சாஸ் உட்பட.', 'All TN', 'Ancient',
    F([{ l: 'Tamil', v: 'தோசை (dosa)' }, { l: 'Ingredients', v: 'Rice, urad dal, potato, sambar, coconut chutney' }, { l: 'Pronunciation', v: 'TOH-suh' }]), 1);

  insCulture.run('food', 'idli', 'Idli & Sambar', 'இட்லி & சாம்பர்', 'Steamed rice-dal cakes', 'நெல்லி அரிசி-வாழை கட்டிகள்', null, null,
    'Soft, pillowy steamed cakes of fermented rice and urad dal, eaten with hot sambar and coconut chutney. A gentle, perfect first taste of Tamil food.',
    'புடைந்த நெல்-வாழை மிளகாய் — சாம்பர் & கோழை சாஸ் உட்பட.', 'All TN', 'Ancient',
    F([{ l: 'Tamil', v: 'இட்லி (idli)' }, { l: 'Ingredients', v: 'Rice, urad dal, sambar, chutney' }, { l: 'Pronunciation', v: 'ID-lee' }]), 2);

  insCulture.run('food', 'filter-coffee', 'Filter Coffee', 'தூக்கித்தானே காவி / காப்பி', 'South India\'s slow-brewed brew', 'மெதுவான தயாரிக்கப்பட்ட காப்பி', null, null,
    'Strong coffee steeped in a two-chamber brass filter, frothed between two steel tumblers (davara). "Kaapi!" is a word every Tamil household knows.',
    'இரண்டு ஸ்டீல் குவில்களுக்கு இடையே அடித்து நுரைக்கப்பட்ட காப்பி.', 'All TN', 'Colonial-era → beloved',
    F([{ l: 'Tamil', v: 'காப்பி (kaapi)' }, { l: 'Method', v: 'Brass filter, frothed between tumblers' }, { l: 'Pronunciation', v: 'KAH-pee' }]), 3);

  insCulture.run('food', 'kanda-vial', 'Kanda Vial', 'கண்டா வியால்', 'Madurai\'s banana-flower dish', 'மதுரையின் வாய்மலர் உணவு', null, null,
    'A signature Madurai dish of shredded banana flower (kanda) slow-cooked with lentils, coconut and tempering — often served with pongal or curd rice.',
    'மதுரையின் சிறப்பு — வாய்மலர் + வாழை + நெல்லி.', 'Madurai', 'Traditional',
    F([{ l: 'Tamil', v: 'கண்டா வியால் (kanda vial)' }, { l: 'Key ingredient', v: 'Banana flower (kanda)' }, { l: 'Pronunciation', v: 'KON-duh VY-al' }]), 4);

  insCulture.run('food', 'adhirasam', 'Adhirasam', 'அதிரசம்', 'Jaggery rice cake of Deepavali', 'தீபாவளி சர்க்கரை அரிசி', null, null,
    'Sweet, spongy cakes of rice flour and jaggery, shaped by hand over a hot plate — a Deepavali and festival essential across Tamil Nadu.',
    'தீபாவளி இனிப்பு — நெல்லி மாவு + தேன்.', 'All TN', 'Festival food',
    F([{ l: 'Tamil', v: 'அதிரசம் (adhirasam)' }, { l: 'Made of', v: 'Rice flour, jaggery, ghee' }, { l: 'Pronunciation', v: 'a-dhee-RA-sam' }]), 5);

  insCulture.run('food', 'murukku', 'Murukku', 'முருங்கை (Murukku)', 'Crisp spiral snack', 'வறுத்த சுருள் இனிப்பு', null, null,
    'Crisp, crunchy spirals of rice flour, urad dal and sesame — the snack that lines every Tamil temple and festival plate, and every home for Pongal.',
    'திருவிழாக்களிலும், வீடுகளிலும் — நம் இனிப்பு.', 'All TN', 'Everyday + festival',
    F([{ l: 'Tamil', v: 'முருங்கை (murukku)' }, { l: 'Made of', v: 'Rice flour, urad dal, sesame, cumin' }, { l: 'Pronunciation', v: 'moo-ROOK-ku' }]), 6);

  insCulture.run('food', 'pongal-sweet', 'Pongal (sweet)', 'பொங்கல் (இனிப்பு)', 'Boiled rice & lentils with jaggery', 'கருங்குழம்பு-அரிசி-வாழை', null, null,
    'The namesake dish of the Pongal festival: rice and moong dal boiled in milk with jaggery, ghee and cashews until it overflows — "pongam!" — a blessing of abundance.',
    'பொங்கல் பண்டிகையின் பெயர் உணவு — நிரம்பி வழியுமானால் "பொங்கலென்று" வாழ்த்து.', 'All TN', 'Thai Pongal festival',
    F([{ l: 'Tamil', v: 'பொங்கல் (pongal)' }, { l: 'Made of', v: 'Rice, moong dal, jaggery, ghee, cashews' }, { l: 'Meaning', v: 'Overflow = abundance & blessing' }]), 7);

  insCulture.run('food', 'milagai-podi', 'Milagai Podi', 'மிளகாய் போடி', 'The home ground spice of Tamil Nadu', 'வீடு தயாரிக்கும் காரம்', null, null,
    'A dry rub of dried chilies, roasted lentils, black pepper, sesame and coriander — mixed into curd, rice, or just eaten with ghee. Every Tamil home grinds its own.',
    'வீடு தயாரிக்கும் காரம் — குழம்பு, காயி, அரிசி உட்பட.', 'All TN', 'Everyday',
    F([{ l: 'Tamil', v: 'மிளகாய் போடி (milagai podi)' }, { l: 'Made of', v: 'Dried chilies, lentils, pepper, sesame' }, { l: 'Pronunciation', v: 'mi-lah-gai POH-dee' }]), 8);

  insCulture.run('food', 'rasam', 'Paruppu Rasam', 'வாழை ரசம்', 'Spiced lentil-tamarind soup', 'காரமான குழம்பு', null, null,
    'A hot, tangy soup of tamarind, lentils and a crackling tempering of mustard seeds, curry leaves and dry chilies — the healing, homely heart of a Tamil meal.',
    'வெல்லரி + வாழை + காரம் — வீட்டு உணவின் மனம்.', 'All TN', 'Everyday',
    F([{ l: 'Tamil', v: 'வாழை ரசம் (paruppu rasam)' }, { l: 'Made of', v: 'Tamarind, lentils, mustard, curry leaf' }, { l: 'Pronunciation', v: 'RA-sam' }]), 9);

  /* ────────────────────────── Culture: festivals ────────────────────────── */
  insCulture.run('festival', 'pongal', 'Thai Pongal', 'தை பொங்கல்', '4-day harvest festival (Jan)', '4 நாள் திருவிழா', null, null,
    'The biggest harvest thanksgiving: Bhogi (new clothes, fire), Thai Pongal (cooking the overflowing pot, sun salutation), Mattu Pongal (worshiping cattle), and Kanum (family outing by water).',
    'தலைமை நன்றி திருவிழா: நான்கு நாட்கள் — சூரிய உவசாரம், பசு மாட்டு, குடும்பம்.', 'All TN', 'January',
    F([{ l: 'When', v: 'Mid-January (Thai month)' }, { l: 'Days', v: 'Bhogi → Thai → Mattu → Kanum' }, { l: 'Symbol', v: 'Overflowing pot = abundance' }]), 1);

  insCulture.run('festival', 'chithirai', 'Chithirai Thiruvizha', 'சிதிரி திருவிழா', '21-day goddess wedding (Madurai)', '21 நாள் அம்மன் திருமணம்', null, null,
    'Madurai\'s grandest festival: a 21-day "wedding" of Meenakshi Amman to Lord Sundareswarar, with a royal procession, street theatre, and thousands of lamps in the Chithirai star month.',
    'மதுரையின் மிகப்பெரிய திருவிழா — அம்மன் & சுந்தரேஸ்வரர் திருமணம்.', 'Madurai', 'April–May (Chithirai)',
    F([{ l: 'When', v: 'Chithirai month (Apr–May)' }, { l: 'Highlight', v: 'Goddess wedding, street procession' }, { l: 'Length', v: '21 days' }]), 2);

  insCulture.run('festival', 'vaikuntavasi', 'Vaikuntavasi', 'வையங்கடவாசி', '4-day Thiruvonam festival (Srirangam)', '4 நாள் திருவோணம்', null, null,
    'The holiest Vaishnava festival at Srirangam: for four days the Ranganatha deity is dressed in gold, and the golden vaibhagam (audience hall) is filled with light and music.',
    'ஸ்ரீரங்கத்தின் தலைமை வைஷ்ணவ திருவிழா — தங்க ஆபரணம், தங்க கதிரவன்.', 'Srirangam', 'December (Margazhi)',
    F([{ l: 'When', v: 'Margazhi, Thiruvonam star' }, { l: 'Highlight', v: 'Golden vaibhagam, 4 days' }, { l: 'Deity', v: 'Ranganatha (Vishnu)' }]), 3);

  insCulture.run('festival', 'karthigai', 'Karthigai Deepam', 'கார்த்திகை தீபம்', 'Festival of lamps (Thanjavur)', 'விளக்கு திருவிழா', null, null,
    'On the full-moon of Karthigai, the whole of Thanjavur glows with oil lamps. The most sacred: the "brahmasthana deepam" lit in the Brihadeeswarar temple.',
    'கார்த்திகை பௌர்ணமி — தஞ்சாவூர் முழுவதும் விளக்குகள்.', 'Thanjavur (all TN)', 'November–December',
    F([{ l: 'When', v: 'Karthigai full moon' }, { l: 'Highlight', v: 'Lakhs of oil lamps, brahmasthana deepam' }, { l: 'City', v: 'Thanjavur (Rajaraja festival)' }]), 4);

  insCulture.run('festival', 'panguni', 'Panguni Uttiram', 'பங்குனி உத்திரம்', 'Shiva festival (all temples)', 'சிவன் திருவிழா', null, null,
    'A day of Shiva worship across every Tamil temple, marking the start of the auspicious Panguni month — with abhishekam (ritual bathing of the lingam) and grand processions.',
    'சிவன் ஆராதனை — பங்குனி மாத தொடக்கம், அபிஷேகம் & காவல்.', 'All TN', 'February–March',
    F([{ l: 'When', v: 'Panguni month, Uttiram star' }, { l: 'Rite', v: 'Abhishekam of the Shiva lingam' }, { l: 'Where', v: 'Every Shiva temple' }]), 5);

  insCulture.run('festival', 'garaga', 'Garaga / Navaratri', 'காரகம் / நவராத்திரி', '10-day Goddess festival (Madurai)', '10 நாள் அம்மன் திருவிழா', null, null,
    'Ten days of worship of the Goddess in 16 forms (Garaga), culminating in a night of processions and fire — Madurai\'s streets become a river of lamps.',
    '10 நாள் அம்மன் — 16 வடிவம், நெருப்பு & காவல்.', 'Madurai', 'September–October',
    F([{ l: 'When', v: 'Sharad Navaratri' }, { l: 'Highlight', v: '16 forms of the Goddess, night processions' }, { l: 'City', v: 'Madurai' }]), 6);

  insCulture.run('festival', 'puthandu', 'Puthandu', 'புத்தாண்டு', 'Tamil New Year (14 April)', 'தமிழ் புதிய ஆண்டு', null, null,
    'The Tamil new year: households clean and decorate with kolam (rangoli), prepare the sweet "maamangalyam" (mix of 16 tastes), and greet each other with "Puthandu Nalvazhchukku!"',
    'தமிழ் புதிய ஆண்டு — கோலம், மாமாங்கல்யம், நல்வாழ்த்து.', 'All TN', '14 April',
    F([{ l: 'When', v: 'Chithirai 1 (≈ 14 April)' }, { l: 'Tradition', v: 'Kolam, maamangalyam (16 tastes)' }, { l: 'Greeting', v: 'புத்தாண்டு நல்வாழ்த்துகள்!' }]), 7);

  /* ────────────────────────── Culture: dance & music ────────────────────────── */
  insCulture.run('dance', 'bharatanatyam', 'Bharatanatyam', 'பரதநாட்டியம்', 'The classical temple dance of Tamil Nadu', 'கோவில் ஆடல் நுணுக்கம்', null, null,
    'India\'s oldest classical dance, born in the Tamil temples: precise footwork, meaningful hand gestures (mudras), and stories of Shiva, Vishnu and the Goddess told through expression.',
    'தமிழ் கோவில்களில் பிறந்த பண்டை ஆடல் — சிவன், விஷ்ணு, அம்மன் கதை.', 'All TN (born in temples)', 'Ancient → classical',
    F([{ l: 'Origin', v: 'Tamil temples (sadir → bharatanatyam)' }, { l: 'Key', v: 'Mudras (hand gestures), footwork, abhinaya' }, { l: 'Story', v: 'Divine tales through expression' }]), 1);

  insCulture.run('dance', 'villu-pattu', 'Villu Pattu', 'வில்லு பாட்டு', 'Folk bow-singing', 'மக்கள் பாட்டு', null, null,
    'A folk singer (villu pattar) sings tales of love, war and village life to the rhythm of a bamboo bow — a moving, storytelling dance of rural Tamil Nadu.',
    'மக்கள் பாடகன் — கனபு விட்டில் காதல், போர், கிராம கதை.', 'Rural TN', 'Folk',
    F([{ l: 'Instrument', v: 'Bamboo bow (villu)' }, { l: 'Themes', v: 'Love, war, village life' }, { l: 'Form', v: 'Singing + moving dance' }]), 2);

  insCulture.run('dance', 'therukkolattu', 'Therukkolattu', 'தேருக்கொலாட்டு', 'Stick-dance of Pongal', 'கம்பு ஆடல்', null, null,
    'A rhythmic stick dance performed by women during Pongal and village festivals — clashing bamboo sticks to fast drum beats in joyful, swirling circles.',
    'பொங்கல் & கிராம திருவிழா — பெண்கள் கம்பு ஆடல்.', 'All TN', 'Pongal / festivals',
    F([{ l: 'When', v: 'Pongal & village festivals' }, { l: 'Who', v: 'Women, in circles' }, { l: 'Instrument', v: 'Bamboo sticks + drums' }]), 3);

  insCulture.run('dance', 'karagattam', 'Karagattam', 'கரகாட்டம்', 'Devotional procession dance', 'சாமி பணி கரம்', null, null,
    'A devotional dance where performers whirl a decorated "karagam" (pot) on a stick to the rhythm of drums and cymbals, invoking the blessings of the divine.',
    'பெண்ணின் சாமி — கரம் + பறை + தாளம்.', 'Coastal TN', 'Folk / devotional',
    F([{ l: 'Object', v: 'Decorated pot (karagam) on a stick' }, { l: 'Rhythm', v: 'Drums & cymbals' }, { l: 'Purpose', v: 'Devotional, blessing' }]), 4);

  insCulture.run('dance', 'thiruvathira', 'Thiruvathira', 'திருவாத்திரா', 'Women\'s circle dance at festivals', 'திருவிழா வட்ட ஆடல்', null, null,
    'Women join hands in a circle around a lamp, singing and swaying to folk tunes at night-time festival gatherings — one of the oldest and most beautiful Tamil traditions.',
    'பெண்கள் விளக்கை சுற்றி, கைகோர்த்து, பாடி ஆடல்.', 'All TN', 'Festivals (night)',
    F([{ l: 'When', v: 'Night, at festivals' }, { l: 'Form', v: 'Circle around a lamp' }, { l: 'Who', v: 'Women, all ages' }]), 5);

  insCulture.run('music', 'carnatic', 'Carnatic Music', 'கர்நாடக இசை', 'The classical music of South India', 'தென்னாடு நுணுக்க இசை', null, null,
    'Born in the temples of Tamil Nadu, built on the trinity of Thyagaraja, Muthuswami Dikshitar and Shyama Shastri. Ragas (melodic scales) are "worshipped" as much as performed.',
    'தமிழ் கோவில்களில் பிறந்தது — தியாகராஜர், தீட்சிதர், சாமா சாஸ்திரர்.', 'All TN (temple roots)', 'Classical',
    F([{ l: 'Roots', v: 'Tamil temples' }, { l: 'Trinity', v: 'Thyagaraja, Dikshitar, Shyama Shastri' }, { l: 'Core', v: 'Ragas, talams (rhythms)' }]), 1);

  insCulture.run('music', 'nadaswaram', 'Nadaswaram & Thavil', 'நாதஸ்வரம் & தவில்', 'The soul sound of Tamil temples', 'கோவில் இசை ஊசல்', null, null,
    'A loud, soulful double-reed pipe (nadaswaram) played with the thavil drum — the traditional "band" of Tamil weddings and temple processions, replacing the modern orchestra.',
    'தமிழ் திருமணம் & கோவில் காவலின் இசை — நாதஸ்வரம் + தவில்.', 'All TN', 'Traditional',
    F([{ l: 'Instruments', v: 'Nadaswaram (pipe) + thavil (drum)' }, { l: 'Used at', v: 'Weddings, temple processions' }, { l: 'Sound', v: 'Loud, soulful, ceremonial' }]), 2);

  insCulture.run('music', 'parai', 'Parai', 'பறை', 'The folk drum of Tamil Nadu', 'மக்கள் பறை', null, null,
    'A double-headed frame drum played at village festivals, temple events and harvest celebrations — its deep, rolling rhythm is the heartbeat of Tamil folk life.',
    'கிராம திருவிழா, கோவில், விளைச்சல் — மனத்துடிப்பு.', 'All TN', 'Folk',
    F([{ l: 'Type', v: 'Double-headed frame drum' }, { l: 'Used at', v: 'Village & temple festivals' }, { l: 'Rhythm', v: 'Deep, rolling heartbeat' }]), 3);

  insCulture.run('music', 'thiruvachi', 'Thiruvachi & Temple Songs', 'திருவாசி & கோவில் பாடல்கள்', 'Devotional songs of the saints', 'சாமி பாடல்கள்', null, null,
    'Devotional songs (thiruvachi, vaibhagi) sung in temples by the saints like Appar, Sambandar and Manikkavacakar — 1,200-year-old Tamil poetry set to music, still sung every day.',
    'அப்பர், சம்பந்தர், மாணிக்கவாகரர் சாமி — 1200 ஆண்டு பாடல்கள்.', 'All TN', 'Ancient → present',
    F([{ l: 'Saints', v: 'Appar, Sambandar, Manikkavacakar' }, { l: 'Age', v: '≈ 1,200 years of poetry' }, { l: 'Today', v: 'Still sung in temples daily' }]), 4);

  /* ────────────────────────── Culture: dress & objects/crafts ────────────────────────── */
  insCulture.run('dress', 'kanchipuram-saree', 'Kanchipuram Saree', 'காஞிபுரம் சேலை', 'The royal silk saree', 'ராஜ சேலை', null, null,
    'Woven in Kanchipuram with pure silk and real zari (gold thread) and a bold "temple border" — the saree of every Tamil wedding and the state\'s most famous craft.',
    'இயல்பான சேலை & தங்கக் கம்பி, கோவில் எல்லை — திருமண சேலை.', 'Kanchipuram (all TN)', 'Ancient → present',
    F([{ l: 'Made of', v: 'Pure silk + real zari (gold)' }, { l: 'Signature', v: 'Bold "temple border"' }, { l: 'Occasion', v: 'Weddings & festivals' }]), 1);

  insCulture.run('dress', 'pavadai', 'Pavadai Dhoti', 'பாவடை (அரை-சேலை)', 'The classic woman\'s half-saree', 'பெண் அரை-சேலை', null, null,
    'A graceful two-piece: a fitted blouse and a draped lower garment (pavadai) — worn with jewellery, the everyday and festive dress of Tamil women, especially in villages.',
    'பெண் அரை-சேலை — ஊர் & திருவிழா பாவனை.', 'All TN (esp. villages)', 'Traditional',
    F([{ l: 'Form', v: 'Blouse + draped pavadai' }, { l: 'Worn by', v: 'Women, everyday & festive' }, { l: 'Paired with', v: 'Traditional jewellery' }]), 2);

  insCulture.run('dress', 'veshti', 'Veshti / Mundu', 'வெஷ்டி / முண்டு', 'The traditional man\'s wrap', 'ஆண் முண்டு', null, null,
    'A white cotton dhoti, often with a gold "kasavu" border, worn by men to temples, weddings and ceremonies — simple, dignified, and the base of many Tamil costumes.',
    'சேலை & தங்க எல்லை — கோவில், திருமண, பணி.', 'All TN', 'Traditional',
    F([{ l: 'Form', v: 'White cotton wrap (dhoti)' }, { l: 'Border', v: 'Gold "kasavu" border' }, { l: 'Occasion', v: 'Temples, weddings, ceremony' }]), 3);

  insCulture.run('object', 'nataraja', 'Nataraja Bronze', 'நடராஜர் பித்தளை', 'The cosmic dance of Shiva', 'சிவன் உலக ஆடல்', null, null,
    'The Chola bronzes of Shiva as Nataraja — the "lord of the dance" — are among the finest sculptures ever made: Shiva dancing inside a ring of fire, mastering creation and destruction.',
    'சிவன் நடராஜர் — நெருப்பு வளையத்தில் உலக ஆடல் — பித்தளை சிற்பம்.', 'Tanjavur / Chola', 'Chola · 10th–12th century',
    F([{ l: 'Deity', v: 'Shiva as Nataraja (lord of dance)' }, { l: 'Era', v: 'Chola bronzes' }, { l: 'Symbol', v: 'Creation & destruction in balance' }]), 1);

  insCulture.run('craft', 'tanjore-painting', 'Thanjavur Painting', 'தஞ்சாவூர் ஓவியம்', 'Gold-leaf temple painting', 'தங்க ஓவியம்', null, null,
    'A vivid, gold-leaf painting style of gods, kings and temple scenes, using bright pigments and real gold — a UNESCO-listed tradition of the Thanjavur region.',
    'தங்க + நிறம் — சாமி, ராஜா, கோவில் கதை.', 'Tanjavur', 'Maratha → present',
    F([{ l: 'Style', v: 'Gold leaf + bright pigments' }, { l: 'Subjects', v: 'Gods, kings, temple scenes' }, { l: 'Heritage', v: 'UNESCO-listed craft' }]), 1);

  insCulture.run('craft', 'terracotta', 'Terracotta Figurines', 'மண் சிற்பிகள்', 'Sangam-age clay figures', 'சங்க மண் சிற்பிகள்', null, null,
    'Clay figures of dancers, drummers, animals and daily life found across Sangam Tamil Nadu — a window into art, dress, music and belief over 2,000 years ago.',
    'சங்க கால மண் சிற்பிகள் — ஆடல், இசை, நம்பிக்கை, வாழ்வு.', 'All TN (Sangam sites)', 'Sangam age',
    F([{ l: 'Era', v: 'Sangam age' }, { l: 'Shows', v: 'Dancers, drummers, daily life' }, { l: 'Value', v: 'Window into ancient Tamil life' }]), 2);

  insCulture.run('object', 'stone-chariot', 'Stone Chariot (Mahabalipuram)', 'கல் வண்டி (மகாபலிபுரம்)', 'The 8th-century rock chariot', '8ஆம் நூற்றாண்டு கல் வண்டி', null, null,
    'A monolithic granite "chariot" carved at Mahabalipuram — a UNESCO rock monument shaped like a temple on wheels, one of the icons of Tamil heritage.',
    'மகாபலிபுரத்தில் கல்லில் செதுக்கப்பட்ட கோவில் வண்டி.', 'Mahabalipuram', 'Pallava · 8th century',
    F([{ l: 'Material', v: 'Monolithic granite' }, { l: 'Shape', v: 'Temple on wheels (chariot)' }, { l: 'UNESCO', v: 'Monuments of Mahabalipuram' }]), 3);

  /* ────────────────────────── Culture: regions (regional Tamil) ────────────────────────── */
  insCulture.run('region', 'chennai', 'Chennai / Madras Tamil', 'சென்னை / மத்திரஸ் தமிழ்', 'City speech, English mix', 'நகர மொழி, இங்கிலிஷ் கலப்பு', null, null,
    'Fast, mixed city Tamil full of English loanwords — "machaa", "ondy" — the sound of metro Tamil Nadu.',
    'வேகமான நகர மொழி — இங்கிலிஷ் கலந்தது.', 'Chennai', 'Modern',
    F([{ l: 'Sample', v: 'எங்கோ போறே? (en-go por-e?) — "Where are you going?"' }, { l: 'Feature', v: 'English loanwords, fast pace' }, { l: 'Feel', v: 'Urban, energetic' }]), 1);

  insCulture.run('region', 'kongu', 'Kongu Tamil', 'கொங்கு தமிழ்', 'Coimbatore – Ooty region', 'கொச்சிபட்டு – ஊடு', null, null,
    'Known for warmth and directness. Uses "அப்பை/அம்மா" forms and distinctive words like "புருசன்" and "மச்சான்" — a region\'s strong, melodic voice.',
    'நேர்மையான, அழகான மொழி — கொங்கு பகுதி.', 'Coimbatore / Ooty', 'Traditional',
    F([{ l: 'Sample', v: 'வந்தா? (vantha?) — "Did you come?"' }, { l: 'Word', v: 'மச்சான் (machaa) — "buddy / brother"' }, { l: 'Feel', v: 'Warm, direct, melodic' }]), 2);

  insCulture.run('region', 'madurai', 'Madurai Tamil', 'மதுரை தமிழ்', 'South Tamil, famous for "மாட்டா"', 'தென் தமிழ்', null, null,
    'Famous for the friendly "மாட்டா" (I\'ll do it) and a slower, softer flow. Madurai Tamil carries the weight of the old Pandya capital\'s culture.',
    'நட்பான "மாட்டா" — மெதுவான, மென்மையான மொழி.', 'Madurai', 'Traditional',
    F([{ l: 'Sample', v: 'மாட்டா (maatta) — "I\'ll do it"' }, { l: 'Feel', v: 'Soft, slow, friendly' }, { l: 'Root', v: 'Pandya capital culture' }]), 3);

  insCulture.run('region', 'nellai', 'Nellai / Tiyya Tamil', 'நெல்லை / திய்யா தமிழ்', 'Tirunelveli – deep south', 'திருநெல்லை', null, null,
    'The deep-southern "Tiyya" Tamil — with words like "ஒண்டி" and a rich, musical cadence, and one of the oldest continuous Tamil-speaking regions.',
    'தென் பகுதி "திஷா" மொழி — இசைமிக்க, பண்டைய மொழி.', 'Tirunelveli', 'Traditional (ancient)',
    F([{ l: 'Sample', v: 'எங்கிட்ட (engaith) — "with me / at my place"' }, { l: 'Word', v: 'ஒண்டி (ondi) — "one / only"' }, { l: 'Feel', v: 'Rich, musical, ancient' }]), 4);

  /* ────────────────────────── Districts (virtual map) ────────────────────────── */
  const insDistrict = db.prepare(
    `INSERT INTO tn_districts (name, name_tamil, zone, famous_for, culture, language_note, food, temple, festival, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  const D = (n: string, nt: string, z: string, ff: string, cu: string, ln: string, fd: string, tp: string, fe: string, s: number) => insDistrict.run(n, nt, z, ff, cu, ln, fd, tp, fe, s);

  D('Chennai', 'சென்னை', 'coast', 'Capital, port, Marina, film capital (Kollywood)', 'Urban, multicultural, strong temple + British colonial blend', 'Madras Tamil with heavy English mix — fast, practical', 'Filter coffee, dosa, Muthamillai, Chettinad food', 'Marina beaches, Parthasarathy Temple, Kapaleeshwarar (Mylapore)', 'Pongal, Vaikuntavasi (Mylapore)', 1);
  D('Madurai', 'மதுரை', 'south', 'Temple city, Meenakshi, poetry capital of Tamil', 'Deep temple culture, street food, ancient Pandya capital', 'Classic South Tamil — soft, famous for "மாட்டா"', 'Kanda vial, filter kaapi, Jigarthanda, Madurai dosa', 'Meenakshi Amman Temple (14 gopurams)', 'Chithirai Thiruvizha (21-day wedding)', 2);
  D('Thanjavur', 'தஞ்சாவூர்', 'central', 'Chola capital, Brihadeeswarar, rice bowl of TN', 'Chola art, bronzes, classical music, Pongal hub', 'Central Tamil, clear and traditional', 'Tanjavur pongal, Murukku, payasam', 'Brihadeeswarar Temple (UNESCO, 66 m vimana)', 'Karthigai Deepam (lamps festival)', 3);
  D('Coimbatore', 'கொச்சிபட்டு', 'west', 'Cotton city, gateway to the hills, Ooty nearby', 'Industry + hill culture, strong Kongu identity', 'Kongu Tamil — warm, direct, "மச்சான்"', 'Kongu biryani, idli, hot filter kaapi', 'Vellalar temples, Subramaniya Swamy', 'Pongal, Kongu festivals', 4);
  D('Tiruchirappalli', 'திருச்சிராப்பள்ளி', 'central', 'Sri Ranganathaswamy, rock fort, Kaveri bend', 'Largest functioning temple, Kaveri culture', 'Central Tamil, clear', 'Filter coffee, Teynampet sweets, fish', 'Sri Ranganathaswamy Temple (217 acres)', 'Vaikuntavasi (golden festival)', 5);
  D('Tirunelveli', 'திருநெல்வேலி', 'south', 'Ancient Pandya land, deep-south Tamil', 'Tiyya Tamil, temple towns, agriculture', 'Nellai / Tiyya Tamil — rich, musical', 'Nellai pongal, banana, spices', 'Nellaiyappar, Kapileswarar temples', 'Pongal, Karthigai', 6);
  D('Kanyakumari', 'கன்னியாகுமரி', 'south', 'Where three oceans meet, Vivekananda Rock', 'Coastal + Hindu-Buddhist blend, fishing culture', 'Mix of deep-south Tamil with coastal words', 'Fresh seafood, banana, coconut', 'Kanyakumari Devi, Vivekananda Rock', 'Sunrise festival, Devi festivals', 7);
  D('Vellore', 'வேலூர்', 'north', 'Forts, Kaveri delta, Dutch-British history', 'Agriculture + fort history, mixed Tamil', 'North Tamil, mixed with city speech', 'Filter kaapi, delta rice dishes', 'Maruthu temples, Mariamman', 'Pongal, Mariamman festivals', 8);
  D('Salem', 'சேலம்', 'north', 'Steel city, waterfalls, Kollidam', 'Industry + temple towns, granite', 'North Tamil', 'Salem sweets, dosa, kaapi', 'Ekambareswarar, Kollidam temples', 'Pongal, Ekambareswarar festivals', 9);
  D('Dindigul', 'திண்டுக்கல்', 'central', 'Cauvery, indigo, Thirupparankundram', 'Agriculture + hill-temple culture', 'Central Tamil', 'Dindigul filter kaapi, curd rice', 'Thirupparankundram Murugan, Indralan', 'Murugan festivals, Pongal', 10);
  D('Karur', 'கரூர்', 'central', 'Ancient Pandya port, textile (Salem-Karur)', 'Textile trade, temple towns, Kaveri', 'Central Tamil', 'Filter kaapi, Kaveri fish, sweets', 'Sri Kasi Viswanatha, Kaveri ghat temples', 'Pongal, Kaveri festivals', 11);
  D('Nagapattinam', 'நாகப்பட்டினம்', 'coast', 'Maritime port, Manakula Vinayakar, Sri Lanka trade', 'Maritime + temple, fishing, ancient trade', 'Coastal Tamil', 'Fresh seafood, coconut, banana', 'Manakula Vinayakar, Nagapoondi Nagaswamy', 'Naga festivals, Pongal', 12);

  /* ────────────────────────── Culture quiz ────────────────────────── */
  const q = db.prepare("INSERT INTO quizzes (lesson_id, course_id, title, description, pass_score, is_published, created_by) VALUES (NULL,NULL,?,?,70,1,?)").run(
    'Culture Quiz · தமிழ் கலாசார வினாடி-வினா', 'Test your Tamil culture: temples, food, festivals, dance, inscriptions and regions. 10 questions.', adminId
  );
  const quizId = Number(q.lastInsertRowid);
  const insQ = db.prepare('INSERT INTO quiz_questions (quiz_id, type, prompt, prompt_data, explanation, points, sort_order) VALUES (?,?,?,?,?,1,?)');
  const mcq = (i: number, prompt: string, options: string[], correct: number, explanation: string) =>
    insQ.run(quizId, 'mcq', prompt, JSON.stringify({ options, correct: [correct] }), explanation, i);

  mcq(1, 'Which temple has the famous 66-metre vimana and is a UNESCO World Heritage site?', ['Meenakshi Temple, Madurai', 'Brihadeeswarar Temple, Thanjavur', 'Ramanathaswamy Temple', 'Shore Temple'], 1, 'Brihadeeswarar\'s vimana (≈66 m) was the tallest structure of its time. UNESCO 2004.');
  mcq(2, 'Pongal (Thai Pongal) is a festival of…', ['Monsoon', 'Harvest thanksgiving', 'New moon', 'Rains'], 1, 'Pongal thanks the sun and the harvest; the pot "overflowing" (pongam) is the symbol.');
  mcq(3, 'The Jambai inscription is famous because it identifies…', ['The Satyaputra dynasty of Ashoka\'s records', 'The Chola kings', 'A Buddhist stupa', 'A port tax'], 0, 'Jambai (Tamil-Brahmi) names Atiyan Neduman Anji, a Satyaputra — solving a 2,000-year question.');
  mcq(4, 'Which classical dance was born in the Tamil temples?', ['Bharatanatyam', 'Kathak', 'Odissi', 'Kuchipudi'], 0, 'Bharatanatyam grew out of temple sadir in Tamil Nadu.');
  mcq(5, 'Kanchipuram is world-famous for its…', ['Gold temples', 'Silk sarees with a "temple border"', 'Rock forts', 'Seafood'], 1, 'Kanchipuram silk with real zari and a bold temple border is a national icon.');
  mcq(6, '"நன்றி" (nandri) means…', ['Hello', 'Please', 'Thank you', 'Goodbye'], 2, 'நன்றி = thank you.');
  mcq(7, 'Chithirai Thiruvizha is the 21-day wedding festival of…', ['Meenakshi Amman, Madurai', 'Ranganatha, Srirangam', 'Nataraja, Chidambaram', 'Kamatchi, Kanchipuram'], 0, 'Chithirai is Madurai\'s grand 21-day goddess wedding festival.');
  mcq(8, 'The sweet name of filter coffee in a Tamil home is…', ['Tea', 'Kaapi', 'Lassi', 'Sharbat'], 1, '"Kaapi!" — frothed between two tumblers.');
  mcq(9, 'Kanda Vial, a famous Madurai dish, is made mainly from…', ['Coconut', 'Banana flower', 'Tender coconut', 'Mango'], 1, 'Kanda = banana flower, slow-cooked with lentils and coconut.');
  mcq(10, 'Vaikuntavasi (the golden festival) is celebrated at the temple in…', ['Madurai', 'Thanjavur', 'Srirangam', 'Rameswaram'], 2, 'Vaikuntavasi is the holiest Vaishnava festival at Srirangam\'s Ranganathaswamy temple.');
}
