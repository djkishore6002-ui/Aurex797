import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';
import { downloadLesson, removeDownloadedLesson, getDownloadedLessons } from '@/lib/offline';

export default function LessonView() {
  const { courseId, lessonId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<any>(null);
  const [pct, setPct] = useState(0);
  const [tab, setTab] = useState<'video'|'vocab'|'quiz'|'transcript'>('video');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [qSubmitting, setQSubmitting] = useState(false);
  const [qResponse, setQResponse] = useState<any>(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    (async () => {
      const d = await api<any>(`/courses/lessons/${lessonId}`);
      setData(d);
      setPct(d.progress?.completion_percent || 0);
      setQuizAnswers({}); setQuizResult(null); setQResponse(null);
      const dl = getDownloadedLessons() as any[];
      setDownloaded(dl.some(x => x.lesson.id === lessonId));
    })();
  }, [lessonId]);

  if (!data) return <div className="p-8 text-center text-stone-500">Loading…</div>;
  const { lesson, course, vocab, quiz } = data;

  const nextLesson = async () => {
    const mod = await api<any>(`/courses/${courseId}`);
    const all: any[] = [];
    mod.modules.forEach((m: any) => m.lessons.forEach((l: any) => all.push(l)));
    const idx = all.findIndex(l => l.id === lessonId);
    if (idx >= 0 && idx < all.length - 1) nav(`/learn/${courseId}/lessons/${all[idx+1].id}`);
    else nav(`/courses/${courseId}`);
  };

  const submitQuiz = async () => {
    const key = 'quiz_' + lessonId + '_' + Date.now();
    const answers = quiz.questions.map((_: any, i: number) => quizAnswers[i] ?? -1);
    const res = await api(`/courses/lessons/${lessonId}/quiz/submit`, { method: 'POST', json: { answers, idempotency_key: key } });
    setQuizResult(res);
  };

  const askQuestion = async () => {
    if (!question.trim()) return;
    setQSubmitting(true);
    try {
      const res = await api('/questions', { method: 'POST', json: { body: question, lesson_id: lessonId, course_id: courseId } });
      setQResponse(res);
      setQuestion('');
    } catch (e: any) { alert(e.message); }
    setQSubmitting(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-stone-500">
        <Link to={`/courses/${courseId}`} className="hover:text-brand-600">← {course.title}</Link>
      </div>

      <h1 className="text-2xl md:text-3xl font-extrabold mt-3">{lesson.title}</h1>
      {lesson.title_ta && <div className="font-tamil text-brand-700 dark:text-brand-300 mt-1">{lesson.title_ta}</div>}

      <div className="mt-4 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {(lesson.type === 'video' || lesson.video_url) && tab === 'video' && (
            <VideoPlayer src={lesson.video_url || ''} lessonId={lesson.id} courseId={courseId!} startAt={data.progress?.last_position_seconds || 0} onProgress={setPct} />
          )}
          {lesson.type === 'reading' && tab === 'video' && (
            <div className="card p-8 min-h-[320px] bg-gradient-to-br from-brand-50 to-white dark:from-slate-900 dark:to-slate-950">
              <div className="font-tamil text-5xl leading-tight text-center text-brand-700 dark:text-brand-300 tracking-widest">
                {lesson.content_json?.alphabet === 'uyir' ? (
                  'அ ஆ இ ஈ உ ஊ எ ஏ ஐ ஒ ஓ ஔ'
                ) : 'க் ச் ட் த் ப் ம் ய் ர் ல் வ் ழ் ள் ற் ன்'}
              </div>
              <p className="text-center mt-6 text-stone-600 dark:text-stone-400 text-sm">Trace the letters with your finger. Click on a letter to hear it (coming soon). Practice writing each one 5 times.</p>
            </div>
          )}
          {lesson.type === 'scenario' && tab === 'video' && (
            <div className="card p-6 min-h-[320px]">
              <div className="text-sm uppercase tracking-wide text-brand-600 font-bold">Scenario</div>
              <div className="font-tamil text-3xl mt-2">உணவகம் — Restaurant</div>
              <div className="mt-4 space-y-2 text-stone-700 dark:text-stone-300">
                <div><span className="font-tamil text-brand-700">Waiter:</span> வணக்கம் சார், என்ன வேணும்?</div>
                <div className="text-stone-500 text-sm">Vanakkam sir, what would you like?</div>
                <div><span className="font-tamil text-brand-700">You:</span> ஒரு இட்லி மற்றும் காபி கொடுங்கள்.</div>
                <div className="text-stone-500 text-sm">One idli and a coffee please.</div>
              </div>
            </div>
          )}
          {lesson.type === 'grammar' && tab === 'video' && (
            <div className="card p-6 min-h-[320px]">
              <div className="text-sm uppercase tracking-wide text-brand-600 font-bold">Grammar</div>
              <h3 className="text-xl font-bold mt-1">Pronouns & Simple Sentences</h3>
              <p className="mt-3 text-stone-700 dark:text-stone-300">Tamil pronouns change based on formality. Use <span className="font-tamil">நீங்கள்</span> (neengal) for elders/strangers, <span className="font-tamil">நீ</span> (nee) for close friends.</p>
              <div className="mt-3 font-mono bg-stone-100 dark:bg-slate-800 p-3 rounded-lg text-sm">
                நான் தமிழ் கற்கிறேன் — "I am learning Tamil."
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 progress-track"><div className="progress-fill" style={{ width: `${pct}%` }}></div></div>
            <span className="text-sm font-semibold tabular-nums">{pct}%</span>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            <TabBtn active={tab==='video'} onClick={()=>setTab('video')} icon="🎬">{lesson.type === 'video' ? 'Video' : 'Lesson'}</TabBtn>
            <TabBtn active={tab==='vocab'} onClick={()=>setTab('vocab')} icon="📖">{`Vocab (${vocab.length})`}</TabBtn>
            {quiz && <TabBtn active={tab==='quiz'} onClick={()=>setTab('quiz')} icon="📝">Quiz</TabBtn>}
            {lesson.transcript && <TabBtn active={tab==='transcript'} onClick={()=>setTab('transcript')} icon="📄">Transcript</TabBtn>}
          </div>

          {tab === 'vocab' && (
            <div className="grid sm:grid-cols-2 gap-3">
              {vocab.length === 0 && <div className="text-stone-500">No vocabulary added yet for this lesson.</div>}
              {vocab.map((v: any) => (
                <div key={v.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-tamil text-2xl text-brand-700 dark:text-brand-300">{v.tamil}</div>
                      <div className="text-sm italic text-stone-500">{v.transliteration}</div>
                    </div>
                    <button className="text-xl" title="Pronunciation">🔊</button>
                  </div>
                  <div className="mt-2 text-sm font-medium">{v.meaning}</div>
                  {v.example && <div className="mt-1 text-xs text-stone-500 font-tamil">{v.example}</div>}
                </div>
              ))}
            </div>
          )}

          {tab === 'quiz' && quiz && (
            <div className="card p-6">
              <h3 className="font-bold text-lg">{quiz.title}</h3>
              {quizResult ? (
                <div className="mt-4">
                  <div className="text-2xl font-extrabold">{quizResult.score} / {quizResult.total}</div>
                  <div className="text-sm text-stone-500">+{quizResult.xpAwarded} XP</div>
                  <div className="mt-4 space-y-3">
                    {quiz.questions.map((q: any, i: number) => (
                      <div key={q.id} className="p-3 rounded-xl bg-stone-50 dark:bg-slate-800">
                        <div className="font-semibold">{i+1}. {q.question}</div>
                        {q.question_ta && <div className="font-tamil text-sm text-brand-700">{q.question_ta}</div>}
                        <div className={`mt-2 text-sm ${quizAnswers[i] === q.correct_index ? 'text-green-600' : 'text-red-600'}`}>
                          Your answer: {q.options[quizAnswers[i]] ?? '—'} {quizAnswers[i] === q.correct_index ? '✓' : '✗'}
                        </div>
                        {quizAnswers[i] !== q.correct_index && (
                          <div className="text-sm text-green-700">Correct: {q.options[q.correct_index]}</div>
                        )}
                        {q.explanation && <div className="text-xs text-stone-500 mt-1">💡 {q.explanation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-5">
                  {quiz.questions.map((q: any, i: number) => (
                    <div key={q.id}>
                      <div className="font-semibold">{i+1}. {q.question}</div>
                      {q.question_ta && <div className="font-tamil text-sm text-brand-700">{q.question_ta}</div>}
                      <div className="mt-2 space-y-2">
                        {q.options.map((opt: string, oi: number) => (
                          <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${quizAnswers[i]===oi ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-stone-200 dark:border-slate-800 hover:bg-stone-50 dark:hover:bg-slate-800'}`}>
                            <input type="radio" name={`q_${i}`} checked={quizAnswers[i]===oi} onChange={()=>setQuizAnswers({...quizAnswers, [i]:oi})} />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={submitQuiz} disabled={Object.keys(quizAnswers).length !== quiz.questions.length} className="btn-primary">Submit quiz</button>
                </div>
              )}
            </div>
          )}

          {tab === 'transcript' && (
            <div className="card p-6 text-stone-700 dark:text-stone-300 whitespace-pre-wrap">{lesson.transcript || 'No transcript available for this lesson.'}</div>
          )}

          <div className="flex items-center justify-between mt-4">
            <button onClick={() => downloadLesson(lesson, course)} hidden={downloaded} className="btn-secondary">⬇ Download for offline</button>
            <button onClick={() => { removeDownloadedLesson(lesson.id); setDownloaded(false); }} hidden={!downloaded} className="btn-secondary">✓ Downloaded (remove)</button>
            <button onClick={nextLesson} className="btn-primary">Next lesson →</button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold mb-2">❓ Ask a question</h3>
            <p className="text-xs text-stone-500 mb-3">Stuck? The AI will answer instantly. A teacher can review and respond too.</p>
            <textarea className="input h-24 resize-none" placeholder="e.g. When do I use நீ vs நீங்கள்?" value={question} onChange={e=>setQuestion(e.target.value)} />
            <button onClick={askQuestion} disabled={qSubmitting || !question.trim()} className="btn-primary w-full mt-2">{qSubmitting?'Asking…':'Ask'}</button>
            {qResponse && (
              <div className="mt-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-sm">
                <div className="font-semibold text-xs text-brand-700 mb-1">AI Tutor</div>
                <div>{qResponse.ai_answer || 'Your question was sent. A reply will appear in your questions tab.'}</div>
              </div>
            )}
          </div>
          <div className="card p-5">
            <h3 className="font-bold mb-2">📚 About this lesson</h3>
            <div className="text-sm text-stone-600 dark:text-stone-400 space-y-1">
              <div>Type: <span className="capitalize">{lesson.type}</span></div>
              <div>Duration: {Math.floor(lesson.duration_seconds/60)}:{(lesson.duration_seconds%60).toString().padStart(2,'0')}</div>
              <div>Level: <span className="capitalize">{course.level.replace('_',' ')}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, children }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${active ? 'bg-brand-500 text-white' : 'bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-slate-800'}`}>
      <span className="mr-1.5">{icon}</span>{children}
    </button>
  );
}
