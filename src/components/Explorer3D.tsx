'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A working 3D stage: drag to rotate (pitch + yaw), scroll or buttons to
 * zoom. Pure CSS 3D transforms — smooth on any device, no WebGL needed.
 */
export function Explorer3D({
  children,
  label,
  minZoom = 0.55,
  maxZoom = 2.1,
}: {
  children: ReactNode;
  label: string;
  minZoom?: number;
  maxZoom?: number;
}) {
  const [rot, setRot] = useState({ x: -8, y: 14 });
  const [zoom, setZoom] = useState(1);
  const [auto, setAuto] = useState(true);
  const drag = useRef<{ on: boolean; x: number; y: number }>({ on: false, x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => setRot((r) => ({ ...r, y: r.y + 0.35 })), 40);
    return () => window.clearInterval(id);
  }, [auto]);

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { on: true, x: e.clientX, y: e.clientY };
    setAuto(false);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.on) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { on: true, x: e.clientX, y: e.clientY };
    setRot((r) => ({ x: Math.max(-45, Math.min(45, r.x - dy * 0.3)), y: r.y + dx * 0.45 }));
  }
  function onPointerUp() {
    drag.current.on = false;
  }
  function onWheel(e: React.WheelEvent) {
    setZoom((z) => Math.max(minZoom, Math.min(maxZoom, z - Math.sign(e.deltaY) * 0.12)));
  }

  return (
    <div className="select-none">
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        aria-label={`3D view: ${label}. Drag to rotate, scroll to zoom.`}
        className="relative mx-auto h-[420px] w-full max-w-lg cursor-grab touch-none overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.18),rgba(6,9,19,0.6)_70%)] active:cursor-grabbing sm:h-[460px]"
        style={{ perspective: '1100px' }}
      >
        {/* floating glow rings for depth */}
        <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-72 w-72 rounded-full border border-brand-400/20" style={{ transform: 'rotateX(75deg)' }} />
        </div>
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            transformStyle: 'preserve-3d',
            transform: `scale(${zoom}) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
            transition: drag.current.on ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          {children}
        </div>
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-ink-500">
          🖐 drag to rotate · scroll to zoom
        </p>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(minZoom, z - 0.15))}
          className="btn-ghost h-9 w-9 !p-0 text-base"
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(maxZoom, z + 0.15))}
          className="btn-ghost h-9 w-9 !p-0 text-base"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            setRot({ x: -8, y: 14 });
            setZoom(1);
          }}
          className="btn-ghost px-4 text-xs"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setAuto((a) => !a)}
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            auto ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white' : 'border border-white/10 bg-white/5 text-ink-400'
          }`}
        >
          {auto ? '⏸ Auto-spin' : '▶ Auto-spin'}
        </button>
      </div>
    </div>
  );
}
