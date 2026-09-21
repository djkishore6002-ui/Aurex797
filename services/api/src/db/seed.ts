import { initDb, db } from './index';
import { hashPassword } from '../utils/auth';
import { newId, certNumber } from '../utils/helpers';

initDb();

export async function maybeSeed() {
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
  if (count > 0) {
    // Ensure default admin exists
    const ad = db.prepare("SELECT id FROM users WHERE email='admin@aurex.local'").get();
    if (!ad) await createSeedUsers();
    return;
  }
  console.log('[seed] Seeding database...');
  await createSeedUsers();
  const instructorId = (db.prepare("SELECT id FROM users WHERE email='organizer@aurex.local'").get() as any).id;
  const learnerId = (db.prepare("SELECT id FROM users WHERE email='learner@aurex.local'").get() as any).id;
  createCourses(instructorId, learnerId);
  createWorkshops(instructorId);
  createCommunities(instructorId);
  createAnnouncements(instructorId);
  console.log('[seed] Done.');
}

async function createSeedUsers() {
  const users = [
    { email: 'admin@aurex.local', password: 'admin123', name: 'Aurex Admin', role: 'admin' },
    { email: 'organizer@aurex.local', password: 'organizer123', name: 'Dr. Kavitha Subramaniam', role: 'organizer' },
    { email: 'learner@aurex.local', password: 'learner123', name: 'Alex Johnson', role: 'learner' },
    { email: 'priya@aurex.local', password: 'learner123', name: 'Priya Sharma', role: 'learner' },
  ];
  for (const u of users) {
    const exists = db.prepare('SELECT id FROM users WHERE email=?').get(u.email);
    if (exists) continue;
    const id = newId('u_');
    const hash = await hashPassword(u.password);
    db.prepare('INSERT INTO users (id,email,password_hash,name,role,email_verified) VALUES (?,?,?,?,?,1)')
      .run(id, u.email.toLowerCase(), hash, u.name, u.role);
    db.prepare('INSERT INTO profiles (user_id, native_language, learning_goal, level, xp, streak_days, daily_goal_minutes) VALUES (?,?,?,?,?,?,?)')
      .run(id, u.role === 'learner' && u.email.startsWith('alex') ? 'en' : u.role === 'learner' ? 'hi' : null,
        u.role === 'learner' ? 'travel' : null, u.role === 'learner' ? 'beginner' : 'intermediate',
        u.role === 'learner' ? 486 : 0, u.role === 'learner' ? 12 : 0, 15);
    db.prepare('INSERT INTO ai_provider_settings (user_id,mode,provider) VALUES (?,?,?)')
      .run(id, 'platform', process.env.OPENROUTER_API_KEY ? 'openrouter' : 'mock');
  }
}

function createCourses(instructorId: string, _learnerId: string) {
  const courses = [
    {
      id: newId('c_'), title: 'Tamil from Zero', title_ta: 'தமிழ் பூஜ்யத்திலிருந்து',
      description: 'Master the Tamil script, pronunciation, and basic conversation. Absolute beginner friendly.',
      level: 'absolute_beginner', category: 'Foundations', duration: 420,
      modules: [
        { title: 'The Tamil Alphabet', lessons: [
          { title: 'Uyir Ezhuthukal — Vowels (உயிரெழுத்து)', type: 'reading', duration: 480,
            content: { alphabet: 'uyir' },
            vocab: [
              { tamil: 'அ', transliteration: 'A', meaning: 'First vowel sound (short "a")', difficulty: 'absolute_beginner' },
              { tamil: 'ஆ', transliteration: 'Aa', meaning: 'Long "a" vowel', difficulty: 'absolute_beginner' },
              { tamil: 'இ', transliteration: 'I', meaning: 'Short "i" vowel', difficulty: 'absolute_beginner' },
              { tamil: 'ஈ', transliteration: 'Ii', meaning: 'Long "i" vowel', difficulty: 'absolute_beginner' },
              { tamil: 'உ', transliteration: 'U', meaning: 'Short "u" vowel', difficulty: 'absolute_beginner' },
              { tamil: 'ஊ', transliteration: 'Uu', meaning: 'Long "u" vowel', difficulty: 'absolute_beginner' },
            ]
          },
          { title: 'Mei Ezhuthukal — Consonants (மெய்யெழுத்து)', type: 'reading', duration: 600, vocab: [
            { tamil: 'க்', transliteration: 'k', meaning: 'Velar consonant "k"', difficulty: 'absolute_beginner' },
            { tamil: 'ச்', transliteration: 'ch', meaning: 'Palatal "ch"', difficulty: 'absolute_beginner' },
            { tamil: 'ட்', transliteration: 't', meaning: 'Hard retroflex "t"', difficulty: 'absolute_beginner' },
            { tamil: 'ந்', transliteration: 'n', meaning: 'Dental "n"', difficulty: 'absolute_beginner' },
            { tamil: 'ப்', transliteration: 'p', meaning: 'Bilabial "p"', difficulty: 'absolute_beginner' },
            { tamil: 'ம்', transliteration: 'm', meaning: '"m" consonant', difficulty: 'absolute_beginner' },
          ]},
        ]},
        { title: 'Your First Words', lessons: [
          { title: 'Greetings & Politeness', type: 'vocabulary', duration: 360, vocab: [
            { tamil: 'வணக்கம்', transliteration: 'Vanakkam', meaning: 'Hello / Greetings', difficulty: 'absolute_beginner', example: 'வணக்கம் நண்பரே!' },
            { tamil: 'நன்றி', transliteration: 'Nanri', meaning: 'Thank you', difficulty: 'absolute_beginner' },
            { tamil: 'தயவுசெய்து', transliteration: 'Tayavu ceytu', meaning: 'Please', difficulty: 'beginner' },
            { tamil: 'மன்னிக்கவும்', transliteration: 'Mannikkavum', meaning: 'Sorry / Excuse me', difficulty: 'beginner' },
            { tamil: 'ஆம்', transliteration: 'Aam', meaning: 'Yes', difficulty: 'absolute_beginner' },
            { tamil: 'இல்லை', transliteration: 'Illai', meaning: 'No', difficulty: 'absolute_beginner' },
          ]},
          { title: 'Numbers 1–10', type: 'vocabulary', duration: 300, vocab: [
            { tamil: 'ஒன்று', transliteration: 'Ondru', meaning: 'One (1)', difficulty: 'beginner' },
            { tamil: 'இரண்டு', transliteration: 'Irandu', meaning: 'Two (2)', difficulty: 'beginner' },
            { tamil: 'மூன்று', transliteration: 'Moondru', meaning: 'Three (3)', difficulty: 'beginner' },
            { tamil: 'நான்கு', transliteration: 'Naangu', meaning: 'Four (4)', difficulty: 'beginner' },
            { tamil: 'ஐந்து', transliteration: 'Aindhu', meaning: 'Five (5)', difficulty: 'beginner' },
            { tamil: 'ஆறு', transliteration: 'Aaru', meaning: 'Six (6)', difficulty: 'beginner' },
          ]},
        ]},
      ]
    },
    {
      id: newId('c_'), title: 'Spoken Tamil for Beginners', title_ta: 'பேசும் தமிழ்',
      description: 'Build conversational confidence with everyday phrases, polite forms, and colloquial patterns.',
      level: 'beginner', category: 'Conversation', duration: 540,
      modules: [
        { title: 'Introducing Yourself', lessons: [
          { title: 'Introductions & Small Talk', type: 'scenario', duration: 480, vocab: [
            { tamil: 'என் பெயர்', transliteration: 'En peyar', meaning: 'My name is', difficulty: 'beginner' },
            { tamil: 'உங்கள் பெயர் என்ன?', transliteration: 'Ungal peyar enna?', meaning: 'What is your name? (formal)', difficulty: 'beginner' },
            { tamil: 'நான் அமெரிக்காவில் இருந்து வருகிறேன்', transliteration: 'Naan Americavil irundhu varugiren', meaning: 'I come from America', difficulty: 'intermediate' },
            { tamil: 'சந்தோஷம்', transliteration: 'Sandhosham', meaning: 'Nice to meet you / Happiness', difficulty: 'beginner' },
          ]},
        ]},
        { title: 'Grammar Basics', lessons: [
          { title: 'Pronouns & Simple Sentences', type: 'grammar', duration: 540, vocab: [
            { tamil: 'நான்', transliteration: 'Naan', meaning: 'I', difficulty: 'beginner' },
            { tamil: 'நீ', transliteration: 'Nee', meaning: 'You (informal)', difficulty: 'beginner' },
            { tamil: 'நீங்கள்', transliteration: 'Neengal', meaning: 'You (formal / plural)', difficulty: 'beginner' },
            { tamil: 'அவன்', transliteration: 'Avan', meaning: 'He', difficulty: 'beginner' },
            { tamil: 'அவள்', transliteration: 'Aval', meaning: 'She', difficulty: 'beginner' },
          ]},
        ]},
      ]
    },
    {
      id: newId('c_'), title: 'Tamil for Travelers', title_ta: 'பயணிகளுக்கான தமிழ்',
      description: 'Survival Tamil for travel: restaurants, transport, hotels, shopping — hands-on scenario lessons.',
      level: 'beginner', category: 'Travel', duration: 360,
      modules: [
        { title: 'Travel Scenarios', lessons: [
          { title: 'Restaurant — உணவகம்', type: 'scenario', duration: 420, vocab: [
            { tamil: 'ஒரு மெனு தர முடியுமா?', transliteration: 'Oru menu thara mudiyuma?', meaning: 'Can I get a menu?', difficulty: 'beginner' },
            { tamil: 'பில் தரவும்', transliteration: 'Bill tharavum', meaning: 'Please bring the bill', difficulty: 'beginner' },
            { tamil: 'சாப்பாடு சுவையாக இருந்தது', transliteration: 'Saappaadu suvaiyaaga irundhadhu', meaning: 'The food was tasty', difficulty: 'intermediate' },
          ]},
          { title: 'Auto / Taxi — ஆட்டோ / டாக்ஸி', type: 'scenario', duration: 360, vocab: [
            { tamil: 'ஸ்டேஷனுக்கு போங்கள்', transliteration: 'Station-ku pongal', meaning: 'Please go to the station', difficulty: 'beginner' },
            { tamil: 'எவ்வளவு ஆகும்?', transliteration: 'Evvalavu aagum?', meaning: 'How much will it cost?', difficulty: 'beginner' },
            { tamil: 'மீட்டர் போடுங்கள்', transliteration: 'Meter podungal', meaning: 'Please use the meter', difficulty: 'beginner' },
          ]},
          { title: 'Hotel Check-in — விடுதி', type: 'scenario', duration: 360, vocab: [
            { tamil: 'எனக்கு ஒரு அறை வேண்டும்', transliteration: 'Enakku oru arai vendum', meaning: 'I need a room', difficulty: 'beginner' },
            { tamil: 'திறவுச்சொல் என்ன?', transliteration: 'Thiravu-sol enna?', meaning: 'What is the Wi-Fi password?', difficulty: 'intermediate' },
          ]},
          { title: 'Railway Station — ரயில் நிலையம்', type: 'scenario', duration: 360, vocab: [
            { tamil: 'டிக்கெட் எங்கே கிடைக்கும்?', transliteration: 'Ticket engae kidaikkum?', meaning: 'Where can I get a ticket?', difficulty: 'beginner' },
            { tamil: 'சென்னை செல்லும் ரயில் எது?', transliteration: 'Chennai sellum rail edhu?', meaning: 'Which train goes to Chennai?', difficulty: 'intermediate' },
          ]},
        ]},
      ]
    },
    {
      id: newId('c_'), title: 'Everyday Tamil Conversations', title_ta: 'அன்றாட தமிழ் உரையாடல்',
      description: 'Native-like dialogues: friends, family, office, market.',
      level: 'intermediate', category: 'Conversation', duration: 600, modules: [
        { title: 'Friends & Family', lessons: [
          { title: 'Catching up with a Friend', type: 'scenario', duration: 540, vocab: [
            { tamil: 'எப்படி இருக்கிறாய்?', transliteration: 'Eppadi irukkiraai?', meaning: 'How are you? (informal)', difficulty: 'beginner' },
            { tamil: 'நலமாக இருக்கிறேன்', transliteration: 'Nalamaga irukkiren', meaning: 'I am well', difficulty: 'beginner' },
            { tamil: 'வீட்டில் எல்லோரும் நலமா?', transliteration: 'Veetil ellorum nalama?', meaning: 'Is everyone at home well?', difficulty: 'intermediate' },
          ]}
        ]}
      ]
    },
    {
      id: newId('c_'), title: 'Tamil Reading & Writing', title_ta: 'தமிழ் வாசிப்பும் எழுத்தும்',
      description: 'Read signs, write notes, and recognize compound letters (uyirmey).',
      level: 'intermediate', category: 'Literacy', duration: 480, modules: [
        { title: 'Compound Letters', lessons: [
          { title: 'UYIRMEY — உயிர்மெய்', type: 'reading', duration: 600, vocab: [
            { tamil: 'க', transliteration: 'ka', meaning: 'க் + அ', difficulty: 'beginner' },
            { tamil: 'கா', transliteration: 'kaa', meaning: 'க் + ஆ', difficulty: 'beginner' },
            { tamil: 'கி', transliteration: 'ki', meaning: 'க் + இ', difficulty: 'beginner' },
            { tamil: 'கீ', transliteration: 'kii', meaning: 'க் + ஈ', difficulty: 'beginner' },
          ]}
        ]}
      ]
    },
  ];

  for (const c of courses) {
    db.prepare(`INSERT INTO courses (id,title,title_ta,description,level,explanation_language,instructor_id,category,duration_minutes,published,enrollment_count)
                VALUES (?,?,?,?,?,?,?,?,?,1,?)`).run(
      c.id, c.title, c.title_ta, c.description, c.level, 'en', instructorId, c.category, c.duration,
      Math.floor(Math.random() * 200) + 50
    );
    let order = 0;
    for (const m of c.modules) {
      const mid = newId('m_');
      db.prepare('INSERT INTO course_modules (id,course_id,title,sort_order) VALUES (?,?,?,?)').run(mid, c.id, m.title, order++);
      let lOrder = 0;
      for (const l of m.lessons) {
        const lid = newId('l_');
        db.prepare(`INSERT INTO lessons (id,module_id,course_id,title,type,duration_seconds,sort_order,published,content_json,video_url)
                    VALUES (?,?,?,?,?,?,?,1,?,?)`).run(
          lid, mid, c.id, l.title, l.type, l.duration, lOrder++,
          (l as any).content ? JSON.stringify((l as any).content) : null,
          'https://www.w3schools.com/html/mov_bbb.mp4' // sample public MP4 for playback tests
        );
        // Add quiz for the first lesson of each course
        if (lOrder === 1) {
          const qid = newId('qz_');
          db.prepare('INSERT INTO quizzes (id,lesson_id,title) VALUES (?,?,?)').run(qid, lid, `Quiz: ${l.title}`);
          const questions = [
            { question: '"வணக்கம்" means:', options: ['Goodbye', 'Hello/Greetings', 'Sorry', 'Thank you'], correct_index: 1, explanation: 'வணக்கம் is the standard Tamil greeting.' },
            { question: 'How many உயிரெழுத்து (vowels) are there?', options: ['10', '12', '18', '216'], correct_index: 1, explanation: 'Tamil has 12 உயிரெழுத்து (vowels).' },
            { question: '"நன்றி" means:', options: ['Please', 'Sorry', 'Thank you', 'Yes'], correct_index: 2, explanation: 'நன்றி = Thank you.' },
          ];
          for (const q of questions) {
            const qqid = newId('qq_');
            db.prepare('INSERT INTO quiz_questions (id,quiz_id,question,options,correct_index,explanation) VALUES (?,?,?,?,?,?)')
              .run(qqid, qid, q.question, JSON.stringify(q.options), q.correct_index, q.explanation);
          }
        }
        if (l.vocab) {
          for (const v of l.vocab) {
            const vid = newId('v_');
            db.prepare(`INSERT INTO vocabularies (id,lesson_id,category,tamil,transliteration,meaning,meaning_lang,difficulty,example)
                        VALUES (?,?,?,?,?,?,?,?,?)`).run(
              vid, lid, l.type, v.tamil, v.transliteration, v.meaning, 'en', v.difficulty || l.duration ? 'beginner' : 'beginner', (v as any).example || null
            );
          }
        }
      }
    }
  }
}

function createWorkshops(orgId: string) {
  const workshops = [
    { title: 'Speak Tamil in 7 Days — Intensive Bootcamp', description: 'A live 7-day workshop to get you speaking conversational Tamil fast. Includes daily practice sessions and Q&A.', cap: 50, startOffsetHrs: 24 * 3, durMin: 60 },
    { title: 'Tamil Conversation Practice Circle', description: 'Weekly open conversation practice with instructor moderation and real-time correction.', cap: 30, startOffsetHrs: 48, durMin: 75 },
    { title: 'Tamil for Travelers: Weekend Crash Course', description: 'Everything you need for your trip to Tamil Nadu in one weekend.', cap: 100, startOffsetHrs: 24 * 7, durMin: 120 },
  ];
  for (const w of workshops) {
    const id = newId('w_');
    db.prepare(`INSERT INTO workshops (id,title,description,instructor_id,organizer_id,meeting_url,capacity,is_paid,price,published)
                VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      id, w.title, w.description, orgId, orgId, 'https://meet.google.com/sample-aurex-tamil-meet', w.cap, 0, 0, 1
    );
    const start = new Date(Date.now() + w.startOffsetHrs * 3600000);
    const end = new Date(start.getTime() + w.durMin * 60000);
    const sid = newId('ws_');
    db.prepare('INSERT INTO workshop_sessions (id,workshop_id,start_time,end_time,duration_minutes,required_minutes) VALUES (?,?,?,?,?,?)')
      .run(sid, id, start.toISOString(), end.toISOString(), w.durMin, Math.ceil(w.durMin * 0.9));
    // Past session already finished (for certificate demo)
    const pastStart = new Date(Date.now() - 48 * 3600000);
    const pastEnd = new Date(pastStart.getTime() + w.durMin * 60000);
    const pastSid = newId('ws_');
    db.prepare('INSERT INTO workshop_sessions (id,workshop_id,start_time,end_time,duration_minutes,required_minutes) VALUES (?,?,?,?,?,?)')
      .run(pastSid, id, pastStart.toISOString(), pastEnd.toISOString(), w.durMin, Math.ceil(w.durMin * 0.9));
  }
}

function createCommunities(orgId: string) {
  const comms = [
    { name: 'Tamil Beginners Circle', description: 'A friendly place to ask basic questions and practice.' },
    { name: 'Spoken Tamil Practice', description: 'Daily conversation prompts.' },
    { name: 'Travel Tamil', description: 'Tips, stories, and survival phrases for Tamil Nadu travelers.' },
  ];
  for (const c of comms) {
    const id = newId('cm_');
    db.prepare('INSERT INTO communities (id,name,description,created_by) VALUES (?,?,?,?)').run(id, c.name, c.description, orgId);
    db.prepare('INSERT INTO community_members (community_id,user_id,role) VALUES (?,?,?)').run(id, orgId, 'moderator');
    const pid = newId('p_');
    db.prepare('INSERT INTO posts (id,community_id,author_id,title,body) VALUES (?,?,?,?,?)')
      .run(pid, id, orgId, 'Welcome! Introduce yourself 👋', 'Hi everyone! Please introduce yourself and share why you\'re learning Tamil. Let\'s practice together — வணக்கம்!');
  }
}

function createAnnouncements(orgId: string) {
  db.prepare('INSERT INTO announcements (id,author_id,scope,title,body) VALUES (?,?,?,?,?)')
    .run(newId('an_'), orgId, 'global', 'Welcome to Aurex Tamil Learning!', 'Start with "Tamil from Zero" and join our live workshops — 90% attendance earns a verifiable certificate.');
}

if (require.main === module) {
  (async () => {
    await maybeSeed();
  // Generate a demo certificate for learner in first workshop (with full attendance)
  const learner = db.prepare("SELECT id FROM users WHERE email='learner@aurex.local'").get() as any;
  const w = db.prepare('SELECT id, title FROM workshops ORDER BY created_at LIMIT 1').get() as any;
  if (learner && w) {
    const existing = db.prepare('SELECT id FROM registrations WHERE user_id=? AND workshop_id=?').get(learner.id, w.id);
    if (!existing) db.prepare('INSERT INTO registrations (id,user_id,workshop_id,payment_status,checked_in) VALUES (?,?,?,?,1)').run(newId('reg_'), learner.id, w.id, 'free');
    const allSessions = db.prepare("SELECT id FROM workshop_sessions WHERE workshop_id=? ORDER BY start_time ASC").all(w.id) as any[];
    for (const ps of allSessions) {
      const sess = db.prepare('SELECT * FROM workshop_sessions WHERE id=?').get(ps.id) as any;
      const attId = newId('att_');
      db.prepare('INSERT OR IGNORE INTO attendance (id,user_id,session_id,workshop_id,join_time,leave_time,duration_minutes,status) VALUES (?,?,?,?,?,?,?,?)')
        .run(attId, learner.id, ps.id, w.id, sess.start_time, sess.end_time, sess.duration_minutes, 'present');
    }
    // Compute pct and issue if >= 90
    const sessions = db.prepare('SELECT id, duration_minutes, required_minutes FROM workshop_sessions WHERE workshop_id=?').all(w.id) as any[];
    let required = 0, attended = 0;
    for (const s of sessions) { required += s.required_minutes; const a = db.prepare('SELECT duration_minutes FROM attendance WHERE user_id=? AND session_id=?').get(learner.id, s.id) as any; if (a) attended += Math.min(a.duration_minutes, s.duration_minutes); }
    const pct = Math.min(100, Math.round((attended / Math.max(required, 1)) * 1000) / 10);
    if (pct >= 90) {
      const certExists = db.prepare('SELECT id FROM certificates WHERE user_id=? AND workshop_id=?').get(learner.id, w.id);
      if (!certExists) {
        const cn = certNumber();
        db.prepare('INSERT INTO certificates (id,cert_number,user_id,workshop_id,title,issuer,attendance_percent,qr_data) VALUES (?,?,?,?,?,?,?,?)')
          .run(newId('cert_'), cn, learner.id, w.id, w.title, 'Aurex Academy', pct, JSON.stringify({ cert: cn, user: 'Alex Johnson', workshop: w.title, pct }));
        console.log(`[seed] Demo certificate issued: ${cn} (${pct}%)`);
      }
    } else {
      console.log(`[seed] Demo learner attendance ${pct}% — certificate requires 90%. (This is expected if future session has no attendance.)`);
    }
  }
  console.log('[seed] CLI seed complete.');
  })();
}
