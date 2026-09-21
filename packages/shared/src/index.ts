export type UserRole = 'admin' | 'organizer' | 'learner';

export type Difficulty = 'absolute_beginner' | 'beginner' | 'intermediate' | 'advanced';

export type NativeLanguage = 'en' | 'hi' | 'te' | 'ml' | 'kn' | 'ta';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string | null;
  email_verified: boolean;
  banned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  native_language: NativeLanguage | null;
  learning_goal: string | null;
  level: Difficulty;
  xp: number;
  streak_days: number;
  last_active_date: string | null;
  daily_goal_minutes: number;
  bio?: string | null;
}

export interface Course {
  id: string;
  title: string;
  title_ta?: string | null;
  description: string;
  description_ta?: string | null;
  thumbnail_url?: string | null;
  level: Difficulty;
  explanation_language: NativeLanguage;
  instructor_id?: string | null;
  category: string;
  duration_minutes: number;
  published: boolean;
  enrollment_count: number;
  rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  sort_order: number;
}

export type LessonType = 'video' | 'vocabulary' | 'grammar' | 'scenario' | 'reading' | 'quiz';

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  title_ta?: string | null;
  description?: string | null;
  type: LessonType;
  duration_seconds: number;
  sort_order: number;
  video_url?: string | null;
  transcript?: string | null;
  content_json?: string | null;
  published: boolean;
}

export interface Vocabulary {
  id: string;
  lesson_id?: string | null;
  category?: string | null;
  tamil: string;
  transliteration: string;
  meaning: string;
  meaning_lang: NativeLanguage;
  audio_url?: string | null;
  difficulty: Difficulty;
  example?: string | null;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed: boolean;
  progress_percent: number;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  last_position_seconds: number;
  watched_seconds: number;
  completion_percent: number;
  completed: boolean;
  updated_at: string;
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_ta?: string | null;
  options: string; // JSON array
  correct_index: number;
  explanation?: string | null;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  answers: string; // JSON
  created_at: string;
}

export interface Workshop {
  id: string;
  title: string;
  description: string;
  instructor_id: string;
  organizer_id: string;
  meeting_url: string;
  capacity: number;
  is_paid: boolean;
  price: number;
  published: boolean;
  created_at: string;
}

export interface WorkshopSession {
  id: string;
  workshop_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  required_minutes: number;
}

export interface Registration {
  id: string;
  user_id: string;
  workshop_id: string;
  registered_at: string;
  checked_in: boolean;
  payment_status: 'free' | 'pending' | 'paid';
}

export interface Attendance {
  id: string;
  user_id: string;
  session_id: string;
  workshop_id: string;
  join_time: string | null;
  leave_time: string | null;
  duration_minutes: number;
  status: 'present' | 'partial' | 'absent';
}

export interface Certificate {
  id: string;
  cert_number: string;
  user_id: string;
  workshop_id?: string | null;
  course_id?: string | null;
  title: string;
  issuer: string;
  attendance_percent: number;
  issued_at: string;
  qr_data: string;
  revoked: boolean;
}

export interface Question {
  id: string;
  user_id: string;
  lesson_id?: string | null;
  course_id?: string | null;
  workshop_id?: string | null;
  body: string;
  image_url?: string | null;
  audio_url?: string | null;
  status: 'pending' | 'ai_answered' | 'teacher_reviewed' | 'resolved';
  ai_answer?: string | null;
  teacher_answer?: string | null;
  answered_by?: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  author_id: string;
  scope: 'global' | 'course' | 'workshop';
  scope_id?: string | null;
  title: string;
  body: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  created_at: string;
}

export interface Community {
  id: string;
  name: string;
  description?: string | null;
  course_id?: string | null;
  created_by: string;
  created_at: string;
}

export interface CommunityMember {
  community_id: string;
  user_id: string;
  joined_at: string;
  role: 'member' | 'moderator';
}

export interface Post {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  context?: string | null;
  created_at: string;
}

export interface AIProviderSettings {
  user_id: string;
  mode: 'platform' | 'byoai';
  provider: 'openrouter' | 'mock';
  encrypted_key?: string | null;
  model?: string | null;
  updated_at: string;
}

export interface OfflineSyncEvent {
  id: string;
  user_id: string;
  event_type: string;
  payload: string; // JSON
  created_at: string;
  synced: boolean;
  synced_at?: string | null;
  idempotency_key: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface LearningGoal {
  key: string;
  label: string;
  label_ta: string;
}

export const LEARNING_GOALS: LearningGoal[] = [
  { key: 'travel', label: 'Travel', label_ta: 'பயணம்' },
  { key: 'work', label: 'Work', label_ta: 'வேலை' },
  { key: 'education', label: 'Education', label_ta: 'கல்வி' },
  { key: 'family', label: 'Family', label_ta: 'குடும்பம்' },
  { key: 'conversation', label: 'Conversation', label_ta: 'உரையாடல்' },
  { key: 'reading', label: 'Reading', label_ta: 'வாசிப்பு' },
  { key: 'writing', label: 'Writing', label_ta: 'எழுத்து' },
  { key: 'personal', label: 'Personal interest', label_ta: 'தனிப்பட்ட விருப்பம்' },
];

export const NATIVE_LANGUAGES: { code: NativeLanguage; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

export const TAMIL_ALPHABET = {
  uyir: ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ'],
  mei: ['க்', 'ங்', 'ச்', 'ஞ்', 'ட்', 'ண்', 'த்', 'ந்', 'ப்', 'ம்', 'ய்', 'ர்', 'ல்', 'வ்', 'ழ்', 'ள்', 'ற்', 'ன்'],
};

export const SCENARIOS = [
  'Restaurant', 'Shopping', 'Airport', 'Railway Station', 'Bus', 'Auto/Taxi',
  'Hotel', 'Hospital', 'College', 'Office', 'Friends', 'Family',
];
