/**
 * Profile Editor – Canvas component.
 *
 * Renders all layers to an HTML5 Canvas and handles mouse interactions
 * for select, drag, resize, and rotate.
 *
 * Uses a ref for "live" position during drag to avoid per-pixel React
 * state updates; commits to state on mouseup.
 */

import { useRef, useEffect, useCallback, memo } from 'react';
import type { EditorLayer, CanvasConfig, HandlePosition, InteractionMode } from '../../utils/editor-types';
import { snapValue } from '../../utils/editor-types';
import {
  renderCanvas,
  hitTestHandles,
  hitTestLayer,
  getCursorForHandle,
} from '../../utils/canvas-renderer';

interface EditorCanvasProps {
  layers: EditorLayer[];
  canvasConfig: CanvasConfig;
  selectedLayerId: string | null;
  getImage: (src: string) => HTMLImageElement | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, changes: Partial<EditorLayer>) => void;
}

export const EditorCanvas = memo(function EditorCanvas({
  layers,
  canvasConfig,
  selectedLayerId,
  getImage,
  onSelectLayer,
  onUpdateLayer,
}: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const interactionRef = useRef<InteractionMode>({ type: 'idle' });
  const liveLayerRef = useRef<Partial<EditorLayer> | null>(null);
  const rafRef = useRef<number>(0);

  // ─── Render loop ─────────────────────────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If we have a live override during drag, apply it temporarily
    let renderLayers = layers;
    if (liveLayerRef.current && interactionRef.current.type !== 'idle') {
      const liveId =
        interactionRef.current.type === 'dragging'
          ? interactionRef.current.layerId
          : interactionRef.current.type === 'resizing'
            ? interactionRef.current.layerId
            : interactionRef.current.type === 'rotating'
              ? interactionRef.current.layerId
              : null;
      if (liveId) {
        renderLayers = layers.map((l) =>
          l.id === liveId ? { ...l, ...liveLayerRef.current } : l,
        );
      }
    }

    renderCanvas(ctx, canvasConfig, renderLayers, selectedLayerId, getImage);
  }, [layers, canvasConfig, selectedLayerId, getImage]);

  // Re-render when state changes
  useEffect(() => {
    render();
  }, [render]);

  // ─── Coordinate helpers ──────────────────────────────
  const canvasToDoc = useCallback(
    (clientX: number, clientY: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const rect = canvas.getBoundingClientRect();
      return [
        (clientX - rect.left) / canvasConfig.zoom,
        (clientY - rect.top) / canvasConfig.zoom,
      ];
    },
    [canvasConfig.zoom],
  );

  // ─── Mouse handlers ─────────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const [px, py] = canvasToDoc(e.clientX, e.clientY);

      // If there's a selected layer, check handles first
      if (selectedLayerId) {
        const sel = layers.find((l) => l.id === selectedLayerId);
        if (sel && sel.visible && !sel.locked) {
          const handle = hitTestHandles(sel, px, py);
          if (handle === 'rotate') {
            const cx = sel.x + sel.width / 2;
            const cy = sel.y + sel.height / 2;
            const startAngle = Math.atan2(py - cy, px - cx) * (180 / Math.PI);
            interactionRef.current = {
              type: 'rotating',
              layerId: sel.id,
              startAngle,
              origRotation: sel.rotation,
            };
            return;
          }
          if (handle) {
            interactionRef.current = {
              type: 'resizing',
              layerId: sel.id,
              handle,
              startX: px,
              startY: py,
              origX: sel.x,
              origY: sel.y,
              origW: sel.width,
              origH: sel.height,
            };
            return;
          }
        }
      }

      // Hit-test layers top → bottom
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible) continue;
        if (hitTestLayer(layer, px, py)) {
          onSelectLayer(layer.id);
          if (!layer.locked) {
            interactionRef.current = {
              type: 'dragging',
              layerId: layer.id,
              startX: px,
              startY: py,
              origX: layer.x,
              origY: layer.y,
            };
          }
          return;
        }
      }

      // Click on empty space → deselect
      onSelectLayer(null);
    },
    [layers, selectedLayerId, canvasToDoc, onSelectLayer],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const [px, py] = canvasToDoc(e.clientX, e.clientY);
      const mode = interactionRef.current;

      // ── Cursor styling ──
      if (mode.type === 'idle') {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (selectedLayerId) {
          const sel = layers.find((l) => l.id === selectedLayerId);
          if (sel && sel.visible && !sel.locked) {
            const h = hitTestHandles(sel, px, py);
            if (h) {
              canvas.style.cursor = getCursorForHandle(h);
              return;
            }
          }
        }
        // Check if hovering a layer
        for (let i = layers.length - 1; i >= 0; i--) {
          if (!layers[i].visible) continue;
          if (hitTestLayer(layers[i], px, py)) {
            canvas.style.cursor = layers[i].locked ? 'not-allowed' : 'move';
            return;
          }
        }
        canvas.style.cursor = 'default';
        return;
      }

      // ── Dragging ──
      if (mode.type === 'dragging') {
        let nx = mode.origX + (px - mode.startX);
        let ny = mode.origY + (py - mode.startY);
        if (canvasConfig.snapToGrid) {
          nx = snapValue(nx, canvasConfig.gridSize);
          ny = snapValue(ny, canvasConfig.gridSize);
        }
        liveLayerRef.current = { x: nx, y: ny };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // ── Resizing ──
      if (mode.type === 'resizing') {
        const dx = px - mode.startX;
        const dy = py - mode.startY;
        let nx = mode.origX;
        let ny = mode.origY;
        let nw = mode.origW;
        let nh = mode.origH;

        const h = mode.handle;
        if (h.includes('e')) nw = Math.max(10, mode.origW + dx);
        if (h.includes('w')) {
          nw = Math.max(10, mode.origW - dx);
          nx = mode.origX + mode.origW - nw;
        }
        if (h.includes('s')) nh = Math.max(10, mode.origH + dy);
        if (h.includes('n')) {
          nh = Math.max(10, mode.origH - dy);
          ny = mode.origY + mode.origH - nh;
        }

        if (canvasConfig.snapToGrid) {
          nx = snapValue(nx, canvasConfig.gridSize);
          ny = snapValue(ny, canvasConfig.gridSize);
          nw = snapValue(nw, canvasConfig.gridSize) || canvasConfig.gridSize;
          nh = snapValue(nh, canvasConfig.gridSize) || canvasConfig.gridSize;
        }

        liveLayerRef.current = { x: nx, y: ny, width: nw, height: nh };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // ── Rotating ──
      if (mode.type === 'rotating') {
        const layer = layers.find((l) => l.id === mode.layerId);
        if (!layer) return;
        const cx = layer.x + layer.width / 2;
        const cy = layer.y + layer.height / 2;
        const angle = Math.atan2(py - cy, px - cx) * (180 / Math.PI);
        let newRotation = mode.origRotation + (angle - mode.startAngle);
        // Snap to 15° increments when near
        if (canvasConfig.snapToGrid) {
          const snapped = Math.round(newRotation / 15) * 15;
          if (Math.abs(newRotation - snapped) < 3) newRotation = snapped;
        }
        liveLayerRef.current = { rotation: newRotation };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(render);
        return;
      }
    },
    [layers, selectedLayerId, canvasConfig, canvasToDoc, render],
  );

  const handleMouseUp = useCallback(() => {
    const mode = interactionRef.current;
    if (mode.type !== 'idle' && liveLayerRef.current) {
      const layerId =
        mode.type === 'dragging'
          ? mode.layerId
          : mode.type === 'resizing'
            ? mode.layerId
            : mode.type === 'rotating'
              ? mode.layerId
              : null;
      if (layerId) {
        onUpdateLayer(layerId, liveLayerRef.current);
      }
    }
    interactionRef.current = { type: 'idle' };
    liveLayerRef.current = null;
  }, [onUpdateLayer]);

  // Clean up on unmount / mouse leave
  const handleMouseLeave = useCallback(() => {
    if (interactionRef.current.type !== 'idle') {
      handleMouseUp();
    }
  }, [handleMouseUp]);

  return (
    <canvas
      ref={canvasRef}
      className="block shadow-md rounded-sm"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
});
