import { useEffect, useRef, useState } from 'react';

interface Props {
  src: string;
  lessonId: string;
  courseId: string;
  startAt?: number;
  onProgress?: (pct: number) => void;
}

export default function VideoPlayer({ src, lessonId, courseId, startAt = 0, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [vol, setVol] = useState(1);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [showRate, setShowRate] = useState(false);
  const lastReport = useRef(0);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    if (startAt) v.currentTime = Math.max(0, startAt);
  }, [startAt]);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const onTime = () => {
      setPos(v.currentTime);
      const now = Date.now();
      if (now - lastReport.current > 5000) {
        lastReport.current = now;
        reportProgress(v.currentTime, v.duration || 0);
      }
    };
    const onLoaded = () => setDur(v.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => { setPlaying(false); reportProgress(v.currentTime, v.duration || 0); };
    const onEnded = () => { setPlaying(false); reportProgress(v.duration || v.currentTime, v.duration || v.currentTime); };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
    };
    // eslint-disable-next-line
  }, [lessonId]);

  async function reportProgress(position: number, duration: number) {
    try {
      const res = await fetch('/api/courses/lessons/' + lessonId + '/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('aurex_token')||''}` },
        body: JSON.stringify({ last_position_seconds: position, watched_seconds: position, duration_seconds: duration }),
      });
      const data = await res.json();
      if (data.success && onProgress) onProgress(data.data.completion_percent);
    } catch {}
  }

  const toggle = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play(); else v.pause(); };
  const seek = (e: React.ChangeEvent<HTMLInputElement>) => { const v=videoRef.current; if(!v)return; v.currentTime = parseFloat(e.target.value); };
  const setPlaybackRate = (r: number) => { setRate(r); if(videoRef.current) videoRef.current.playbackRate = r; setShowRate(false); };
  const toggleFullscreen = () => { const v=videoRef.current?.parentElement; if(!v)return; if(document.fullscreenElement) document.exitFullscreen(); else v.requestFullscreen(); };
  const toggleMute = () => { const v=videoRef.current; if(!v)return; v.muted = !v.muted; setVol(v.muted?0:1); };

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden group">
      <video ref={videoRef} src={src} className="w-full aspect-video bg-black" onClick={toggle} playsInline preload="metadata" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition pointer-events-none">
        {!playing && <button onClick={toggle} className="w-20 h-20 rounded-full bg-white/90 text-3xl pointer-events-auto shadow-xl">▶</button>}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition">
        <input type="range" min={0} max={dur||0} step={0.1} value={pos} onChange={seek} className="w-full accent-brand-500" />
        <div className="flex items-center gap-3 text-white text-sm mt-1">
          <button onClick={toggle} className="hover:text-brand-400 text-lg">{playing ? '⏸' : '▶'}</button>
          <span className="tabular-nums">{fmt(pos)} / {fmt(dur)}</span>
          <div className="flex-1"></div>
          <div className="relative">
            <button onClick={() => setShowRate(s=>!s)} className="hover:text-brand-400 px-2">{rate}×</button>
            {showRate && (
              <div className="absolute bottom-full right-0 bg-black/90 rounded-lg overflow-hidden mb-1">
                {[0.5,0.75,1,1.25,1.5,2].map(r => (
                  <button key={r} onClick={() => setPlaybackRate(r)} className={`block w-full px-3 py-1 text-left text-xs hover:bg-white/10 ${r===rate?'text-brand-400':''}`}>{r}×</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={toggleMute} className="hover:text-brand-400">{vol ? '🔊' : '🔇'}</button>
          <input type="range" min={0} max={1} step={0.01} value={vol} onChange={e=>{setVol(parseFloat(e.target.value)); if(videoRef.current){videoRef.current.volume=parseFloat(e.target.value);videoRef.current.muted=parseFloat(e.target.value)===0;}}} className="w-20 accent-brand-500 hidden sm:block" />
          <button onClick={toggleFullscreen} className="hover:text-brand-400">⛶</button>
        </div>
      </div>
    </div>
  );
}
