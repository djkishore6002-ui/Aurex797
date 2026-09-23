-- ═══════════════════════════════════════════════════════════════
-- SOLAI — Tamil Learning + Workshop + LMS platform
-- SQLite schema (portable ANSI SQL — see README for Postgres notes)
-- ═══════════════════════════════════════════════════════════════
PRAGMA foreign_keys = ON;

-- ── Users / Auth ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('super_admin','organizer','teacher','learner')),
  name TEXT NOT NULL,
  avatar_url TEXT,
  native_language TEXT DEFAULT 'en',
  tamil_level TEXT DEFAULT 'beginner',
  learning_goal TEXT,
  bio TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  email_verified INTEGER NOT NULL DEFAULT 0,
  privacy_public INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS organizer_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  bio TEXT,
  permissions TEXT NOT NULL DEFAULT '[]', -- JSON array of extra permission keys
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── CMS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL -- JSON-encoded
);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'generic',
  title TEXT,
  subtitle TEXT,
  body_json TEXT NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS static_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_json TEXT NOT NULL DEFAULT '[]', -- array of content blocks
  is_published INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faq_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS navigation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location TEXT NOT NULL DEFAULT 'header' CHECK (location IN ('header','footer','mobile')),
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS footer_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  column_label TEXT NOT NULL DEFAULT 'Explore',
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS banners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  link_url TEXT,
  link_label TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ── Courses / Lessons ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  thumbnail_url TEXT,
  difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner','intermediate','advanced')),
  language TEXT NOT NULL DEFAULT 'en', -- language of instruction
  audience TEXT,
  instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  duration_hours REAL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  level_tag TEXT, -- e.g. "Level 1 — Absolute Beginner"
  is_published INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  certificate_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published, is_archived);

CREATE TABLE IF NOT EXISTS course_modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_modules_course ON course_modules(course_id);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content_json TEXT NOT NULL DEFAULT '[]', -- array of content blocks
  video_url TEXT,
  video_duration_seconds INTEGER DEFAULT 0,
  audio_url TEXT,
  pdf_url TEXT,
  transcript_text TEXT,
  chapters_json TEXT, -- [{title, seconds}]
  is_published INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  required_watch_percent INTEGER NOT NULL DEFAULT 90,
  xp INTEGER NOT NULL DEFAULT 20,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);

CREATE TABLE IF NOT EXISTS lesson_prerequisites (
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  prerequisite_lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, prerequisite_lesson_id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  started_at TEXT,
  last_position REAL NOT NULL DEFAULT 0,
  watched_seconds REAL NOT NULL DEFAULT 0,
  completion_percentage REAL NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);

CREATE TABLE IF NOT EXISTS lesson_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  position_seconds REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_user_lesson ON lesson_notes(user_id, lesson_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  position_seconds REAL DEFAULT 0,
  label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lesson_id, position_seconds)
);

-- ── Vocabulary ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  tamil TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  meaning TEXT NOT NULL,
  meaning_language TEXT NOT NULL DEFAULT 'en',
  part_of_speech TEXT,
  example_tamil TEXT,
  example_meaning TEXT,
  audio_url TEXT,
  level TEXT DEFAULT 'beginner',
  tags TEXT,
  is_published INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_vocab_lesson ON vocabulary(lesson_id);
CREATE INDEX IF NOT EXISTS idx_vocab_course ON vocabulary(course_id);

CREATE TABLE IF NOT EXISTS vocabulary_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vocabulary_id INTEGER NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'learning' CHECK (status IN ('learning','known')),
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TEXT,
  UNIQUE (user_id, vocabulary_id)
);

-- ── Quizzes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pass_score INTEGER NOT NULL DEFAULT 70, -- percent
  is_published INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mcq','multi','truefalse','fillblank','match','translation','ordering','listening')),
  prompt TEXT NOT NULL,
  prompt_data TEXT NOT NULL DEFAULT '{}', -- options/pairs/items/audio/expected
  explanation TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score REAL NOT NULL DEFAULT 0,
  max_score REAL NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON quiz_attempts(user_id);

CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_data TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  points REAL NOT NULL DEFAULT 0
);

-- ── Workshops ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workshops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  organizer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER NOT NULL DEFAULT 100,
  meeting_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  registration_deadline TEXT,
  certificate_enabled INTEGER NOT NULL DEFAULT 1,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS workshop_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workshop_id INTEGER NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  required_minutes INTEGER NOT NULL DEFAULT 54 -- 90% of 60
);
CREATE INDEX IF NOT EXISTS idx_wsessions_workshop ON workshop_sessions(workshop_id);

CREATE TABLE IF NOT EXISTS workshop_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workshop_id INTEGER NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING','CONFIRMED','PAID','FAILED','CANCELLED','REFUNDED')),
  payment_ref TEXT,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, workshop_id)
);
CREATE INDEX IF NOT EXISTS idx_wreg_workshop ON workshop_registrations(workshop_id);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workshop_session_id INTEGER NOT NULL REFERENCES workshop_sessions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  join_time TEXT,
  leave_time TEXT,
  attended_minutes REAL NOT NULL DEFAULT 0,
  required_minutes REAL NOT NULL DEFAULT 54,
  attendance_percentage REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present','partial','absent','excused')),
  source TEXT NOT NULL DEFAULT 'organizer' CHECK (source IN ('heartbeat','qr','organizer','manual')),
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (workshop_session_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);

-- ── Certificates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificate_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  title_text TEXT NOT NULL DEFAULT 'Certificate of Completion',
  body_text TEXT,
  signature_text TEXT,
  background_style TEXT NOT NULL DEFAULT 'classic',
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id TEXT NOT NULL UNIQUE, -- e.g. TN-2026-000123
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('course','workshop')),
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  workshop_id INTEGER REFERENCES workshops(id) ON DELETE SET NULL,
  template_id INTEGER REFERENCES certificate_templates(id) ON DELETE SET NULL,
  participant_name TEXT NOT NULL,
  title_text TEXT NOT NULL,
  organizer_text TEXT,
  duration_text TEXT,
  attendance_percentage REAL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  revoked_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_certs_user ON certificates(user_id);

CREATE TABLE IF NOT EXISTS certificate_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id INTEGER NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  verified_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip TEXT
);

-- ── Announcements / Notifications ─────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global','course','workshop','community','user')),
  target_id INTEGER,
  is_published INTEGER NOT NULL DEFAULT 0,
  publish_at TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('learning','workshop','teacher','certificate','community','system')),
  title TEXT NOT NULL,
  body TEXT,
  link_url TEXT,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ── Communities ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_private INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS community_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','moderator')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (community_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  hidden_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);

CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'like' CHECK (type IN ('like','helpful','celebrate')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, post_id, comment_id, type)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment','user')),
  target_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','actioned','dismissed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- ── Learner questions / Teacher answers ───────────────────────
CREATE TABLE IF NOT EXISTS learner_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_url TEXT,
  ai_answer TEXT,
  ai_answered_at TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered','resolved')),
  assigned_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lq_status ON learner_questions(status);

CREATE TABLE IF NOT EXISTS teacher_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES learner_questions(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  audio_url TEXT,
  attachment_url TEXT,
  ai_answer_used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT
);

-- ── AI ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  context_type TEXT, -- lesson|workshop|vocabulary|page|general
  context_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aiconv_user ON ai_conversations(user_id);

CREATE TABLE IF NOT EXISTS ai_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  model TEXT,
  provider TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_aimsg_conv ON ai_messages(conversation_id);

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT,
  purpose TEXT NOT NULL DEFAULT 'tutor',
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_estimate_micro_usd INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ai_usage_day ON ai_usage(created_at);

CREATE TABLE IF NOT EXISTS ai_provider_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  provider TEXT NOT NULL DEFAULT 'openrouter',
  model_default TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  model_strong TEXT,
  system_prompt TEXT,
  response_style TEXT NOT NULL DEFAULT 'encouraging',
    supported_languages TEXT NOT NULL DEFAULT '["ta","en","zh","hi","es","fr","ar","bn","ru","pt","id","te","ml","kn"]',
  byoai_enabled INTEGER NOT NULL DEFAULT 1,
  daily_request_limit INTEGER NOT NULL DEFAULT 200,
  per_user_daily_limit INTEGER NOT NULL DEFAULT 50,
  general_questions_allowed INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_ai_keys (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  key_hint TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL CHECK (source_type IN ('course','lesson','faq','page','workshop','announcement','vocabulary','scenario','help','resource','culture','district')),
  source_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current','stale')),
  indexed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES ai_knowledge_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding BLOB, -- reserved for vector upgrade (see README)
  tokens INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON ai_knowledge_chunks(document_id);

-- ── Scenarios (real-life practice) ────────────────────────────
CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  level TEXT DEFAULT 'beginner',
  icon TEXT DEFAULT '🍽️',
  situation_tamil TEXT,
  situation_translit TEXT,
  situation_meaning TEXT,
  starter_prompt TEXT, -- assistant opening line
  expected_phrases TEXT NOT NULL DEFAULT '[]', -- JSON: [{tamil, translit, meaning}]
  success_hint TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ── Gamification ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- lesson_complete|quiz_pass|vocab_learned|workshop_attend|post|question
  amount INTEGER NOT NULL DEFAULT 0,
  ref_type TEXT,
  ref_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_xp_user ON xp_events(user_id, created_at);

-- ── Versions / Audit ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  data TEXT NOT NULL, -- JSON snapshot
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_versions ON content_versions(entity, entity_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL, -- e.g. ADMIN_CREATED_COURSE
  entity TEXT,
  entity_id INTEGER,
  prev_value TEXT, -- JSON
  new_value TEXT,  -- JSON
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

/* ── Learning resources (NPTEL / YouTube / Alison / notes / books / guides) ── */
CREATE TABLE IF NOT EXISTS learning_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_tamil TEXT,
  type TEXT NOT NULL CHECK (type IN ('video','note','book','guide','article','playlist','course')),
  provider TEXT NOT NULL DEFAULT 'external' CHECK (provider IN ('npel','youtube','alison','pdf','website','other')),
  url TEXT NOT NULL,
  youtube_id TEXT,
  description TEXT,
  description_tamil TEXT,
  language TEXT NOT NULL DEFAULT 'ta',
  level TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_resources_course ON learning_resources(course_id);
CREATE INDEX IF NOT EXISTS idx_resources_lesson ON learning_resources(lesson_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON learning_resources(type);

/* ── Culture explorer (temples, heritage, inscriptions, food, festivals, dance, music, dress, regions) ── */
CREATE TABLE IF NOT EXISTS culture_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('temple','heritage','inscription','food','festival','dance','music','dress','region','object','craft')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  title_tamil TEXT NOT NULL,
  subtitle TEXT,
  subtitle_tamil TEXT,
  meaning TEXT,
  meaning_tamil TEXT,
  description TEXT,
  description_tamil TEXT,
  region TEXT,
  era TEXT,
  image_url TEXT,
  media_url TEXT,
  facts_json TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_culture_category ON culture_items(category);
CREATE INDEX IF NOT EXISTS idx_culture_slug ON culture_items(slug);

/* ── Tamil Nadu district explorer (virtual map) ── */
CREATE TABLE IF NOT EXISTS tn_districts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_tamil TEXT NOT NULL,
  zone TEXT NOT NULL DEFAULT 'south' CHECK (zone IN ('north','central','south','coast','west')),
  famous_for TEXT,
  culture TEXT,
  language_note TEXT,
  food TEXT,
  temple TEXT,
  festival TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
