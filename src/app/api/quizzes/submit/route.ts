import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, rateLimit, clientIp, readJson, route } from '@/lib/api';
import { awardXp } from '@/lib/gamify';
import { notify } from '@/lib/notifications';

/**
 * Quiz submission — scoring is fully server-side (never trust client scores).
 * Supported types: mcq, multi, truefalse, fillblank, translation, ordering, match.
 */
export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const rl = rateLimit(`quiz:${user.id}`, 20, 60_000);
    if (!rl.ok) throw new ApiError(429, 'Too many submissions — take a breath.');
    const body = (await readJson(req)) as unknown as { quiz_id: number; answers: Record<string, unknown>; duration_seconds?: number };
    z.number().int().positive().parse(body.quiz_id);

    const db = getDb();
    const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND is_published = 1').get(body.quiz_id) as unknown as { id: number; title: string; pass_score: number } | undefined;
    if (!quiz) throw new ApiError(404, 'Quiz not found');

    const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order').all(quiz.id) as unknown as { id: number; type: string; prompt_data: string }[];
    let score = 0;
    const answers: { question_id: number; answer_data: string; is_correct: 0 | 1 }[] = [];

    for (const q of questions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: Record<string, any>;
      try {
        data = JSON.parse(q.prompt_data);
      } catch {
        data = {};
      }
      const userAnswer = body.answers?.[String(q.id)];
      let correct = false;
      switch (q.type) {
        case 'mcq':
          correct = userAnswer === data.correct?.[0];
          break;
        case 'multi': {
          const chosen = Array.isArray(userAnswer) ? [...(userAnswer as unknown[])].map(String).sort() : [];
          const want = Array.isArray(data.correct) ? [...(data.correct as number[])].map(String).sort() : [];
          correct = chosen.length === want.length && chosen.every((c, i) => c === want[i]);
          break;
        }
        case 'truefalse':
          correct = userAnswer === data.answer;
          break;
        case 'fillblank': {
          const norm = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, '').toLowerCase();
          correct = norm(userAnswer) === norm(data.answer);
          break;
        }
        case 'translation':
        case 'ordering': {
          const norm = (s: unknown) => String(s ?? '').trim().replace(/\s+/g, '').toLowerCase().replace(/[?!।.]/g, '');
          if (q.type === 'translation') {
            correct = norm(userAnswer) === norm(data.answer);
          } else {
            const seq = Array.isArray(userAnswer) ? userAnswer.map((x) => norm(x)).join('|') : '';
            correct = seq === norm(data.answer);
          }
          break;
        }
        case 'match': {
          // userAnswer: { keyId: valueId } — compare to data.pairs
          const pairs = (data.pairs as [unknown, unknown][]) ?? [];
          if (!userAnswer || typeof userAnswer !== 'object') break;
          const ua = userAnswer as Record<string, unknown>;
          let all = true;
          let any = false;
          for (const [k, v] of pairs) {
            if (String(ua[String(k)]) === String(v)) {
              any = true;
            } else {
              all = false;
            }
          }
          correct = all && any;
          break;
        }
        case 'listening':
          correct = userAnswer === data.correct?.[0];
          break;
        default:
          correct = false;
      }
      if (correct) score++;
      answers.push({ question_id: q.id, answer_data: JSON.stringify(userAnswer ?? null), is_correct: correct ? 1 : 0 });
    }

    const maxScore = questions.length || 1;
    const percent = Math.round((score / maxScore) * 1000) / 10;
    const passed = percent >= quiz.pass_score;

    const attemptRes = db
      .prepare('INSERT INTO quiz_attempts (quiz_id, user_id, score, max_score, passed, duration_seconds) VALUES (?,?,?,?,?,?)')
      .run(quiz.id, user.id, score, maxScore, passed ? 1 : 0, Math.round(body.duration_seconds ?? 0));
    const attemptId = Number(attemptRes.lastInsertRowid);
    const insA = db.prepare('INSERT INTO quiz_answers (attempt_id, question_id, answer_data, is_correct, points) VALUES (?,?,?,?,?)');
    for (const a of answers) insA.run(attemptId, a.question_id, a.answer_data, a.is_correct, a.is_correct ? 1 : 0);

    if (passed) {
      awardXp(db, user.id, 'quiz_pass', 50, 'quiz', quiz.id);
      notify(db, user.id, 'learning', `Quiz passed: ${quiz.title}`, `You scored ${score}/${maxScore} (+50 XP).`);
    }

    // Per-question review
    const review = questions.map((q, i) => ({
      id: q.id,
      correct: answers[i].is_correct === 1,
      expected: safeJson(q.prompt_data).correct ?? safeJson(q.prompt_data).answer ?? safeJson(q.prompt_data).pairs ?? null,
    }));

    return json({ ok: true, score, max_score: maxScore, percent, passed, review });
  });
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
