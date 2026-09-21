import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '@/lib/api';

export default function CommunityPosts() {
  const { id } = useParams();
  const [posts, setPosts] = useState<any[]>([]);
  const [joined, setJoined] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [active, setActive] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [comment, setComment] = useState('');

  const load = async () => {
    const d = await api<any>(`/community/${id}/posts`);
    setPosts(d.posts);
  };
  useEffect(() => { load(); }, [id]);

  const join = async () => { await api(`/community/${id}/join`, { method: 'POST' }); setJoined(true); };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;
    await api(`/community/${id}/posts`, { method: 'POST', json: { title, body } });
    setTitle(''); setBody(''); load();
  };
  const openPost = async (pid: string) => {
    setActive(pid);
    const d = await api<any>(`/community/posts/${pid}/comments`);
    setComments(d.items);
  };
  const addComment = async () => {
    if (!comment.trim() || !active) return;
    await api(`/community/posts/${active}/comments`, { method: 'POST', json: { body: comment } });
    setComment(''); openPost(active);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <Link to="/community" className="text-sm text-stone-500">← Community</Link>
      <div className="flex items-center justify-between mt-3">
        <h1 className="text-2xl font-extrabold">Group discussions</h1>
        {!joined && <button onClick={join} className="btn-primary">+ Join group</button>}
      </div>

      {joined && (
        <form onSubmit={create} className="card p-5 mt-4 space-y-3">
          <input className="input" placeholder="Post title" value={title} onChange={e=>setTitle(e.target.value)} />
          <textarea className="input h-24 resize-none" placeholder="Share a question, tip, or practice..." value={body} onChange={e=>setBody(e.target.value)} />
          <button className="btn-primary">Post</button>
        </form>
      )}

      <div className="mt-5 space-y-3">
        {posts.map((p: any) => (
          <div key={p.id} className="card p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-tamil-500 flex items-center justify-center text-white font-semibold">{p.author_name[0]}</div>
              <div className="flex-1">
                <button className="font-bold text-left hover:text-brand-600" onClick={()=>openPost(p.id)}>{p.title}</button>
                <div className="text-sm text-stone-500">by {p.author_name} · {p.comments} comments</div>
                <p className="mt-2 text-stone-700 dark:text-stone-300">{p.body}</p>
              </div>
            </div>
            {active === p.id && (
              <div className="mt-4 pl-13 space-y-2">
                <div className="border-t border-stone-200 dark:border-slate-800 pt-3 space-y-2">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-2 text-sm">
                      <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">{c.author_name[0]}</div>
                      <div className="flex-1 bg-stone-50 dark:bg-slate-800 rounded-xl p-2">
                        <div className="font-semibold text-xs">{c.author_name}</div>
                        <div>{c.body}</div>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <div className="text-sm text-stone-500">No comments yet.</div>}
                </div>
                {joined && <div className="flex gap-2">
                  <input className="input flex-1" placeholder="Write a comment..." value={comment} onChange={e=>setComment(e.target.value)} />
                  <button onClick={addComment} className="btn-primary">Send</button>
                </div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
