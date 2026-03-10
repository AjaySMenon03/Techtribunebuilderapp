import { useEffect, useRef, useCallback } from 'react';
import type * as fabric from 'fabric';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';

interface MiniMapProps {
  getCanvas: () => fabric.Canvas | null;
}

export default function MiniMap({ getCanvas }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport, setViewport, minimapOpen } = useCanvasStudioStore();
  const rafRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = getCanvas();
    const ctx = canvasRef.current?.getContext('2d');
    if (!canvas || !ctx) return;

    const miniW = 200;
    const miniH = 140;
    ctx.clearRect(0, 0, miniW, miniH);

    // Background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, miniW, miniH);

    // Get bounding box of all objects
    const objects = canvas.getObjects().filter((o: any) => !o._isGuide);
    if (objects.length === 0) {
      // Just draw viewport rect
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, miniW - 20, miniH - 20);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const obj of objects) {
      const b = obj.getBoundingRect();
      minX = Math.min(minX, b.left);
      minY = Math.min(minY, b.top);
      maxX = Math.max(maxX, b.left + b.width);
      maxY = Math.max(maxY, b.top + b.height);
    }

    const margin = 80;
    const worldW = maxX - minX + margin * 2;
    const worldH = maxY - minY + margin * 2;
    const scale = Math.min(miniW / worldW, miniH / worldH);
    const offsetX = (miniW - worldW * scale) / 2 - (minX - margin) * scale;
    const offsetY = (miniH - worldH * scale) / 2 - (minY - margin) * scale;

    // Draw objects as small rectangles
    ctx.fillStyle = '#64748b';
    for (const obj of objects) {
      const b = obj.getBoundingRect();
      ctx.fillRect(
        b.left * scale + offsetX,
        b.top * scale + offsetY,
        Math.max(b.width * scale, 2),
        Math.max(b.height * scale, 2),
      );
    }

    // Draw viewport rect
    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform!;
    const vpLeft = -vpt[4] / zoom;
    const vpTop = -vpt[5] / zoom;
    const vpWidth = canvas.getWidth() / zoom;
    const vpHeight = canvas.getHeight() / zoom;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      vpLeft * scale + offsetX,
      vpTop * scale + offsetY,
      vpWidth * scale,
      vpHeight * scale,
    );
  }, [getCanvas]);

  useEffect(() => {
    if (!minimapOpen) return;
    const interval = setInterval(render, 500);
    render();
    return () => clearInterval(interval);
  }, [minimapOpen, viewport, render]);

  if (!minimapOpen) return null;

  return (
    <div className="absolute bottom-14 right-4 z-20 rounded-xl overflow-hidden border border-white/20 dark:border-white/10 shadow-lg bg-slate-900/90 backdrop-blur-xl">
      <canvas ref={canvasRef} width={200} height={140} className="block" />
    </div>
  );
}