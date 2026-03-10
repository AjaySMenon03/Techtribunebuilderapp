import {
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import * as fabric from 'fabric';
import { useCanvasStudioStore } from '../../store/canvasStudioStore';
import { applyMeta, calculateSnap } from '../../utils/canvasHelpers';
import { logger } from '../../utils/logger';
import {
  MAX_OBJECTS,
  MAX_IMAGE_SIZE,
  ZOOM_MIN,
  ZOOM_MAX,
  STICKY_COLORS,
  AUTOSAVE_INTERVAL,
} from '../../types/canvasTypes';
import type { CanvasTool, SnapGuide } from '../../types/canvasTypes';

// ── Public API exposed via ref ──────────────────────

export interface CanvasCoreHandle {
  getCanvas: () => fabric.Canvas | null;
  toJSON: () => string;
  loadJSON: (json: string) => Promise<void>;
  addImage: (url: string) => void;
  toDataURL: (fmt?: string, quality?: number) => string;
  toSVG: () => string;
  fitToScreen: () => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  addStickyNote: (color?: string) => void;
  addText: () => void;
  addFlowchartShape: (type: 'start' | 'process' | 'decision') => void;
  saveSnapshot: () => void;
  copySelected: () => void;
  pasteFromClipboard: () => void;
  alignObjects: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeObjects: (direction: 'horizontal' | 'vertical') => void;
}

const CanvasCore = forwardRef<CanvasCoreHandle, { onSave?: (json: string) => void }>(
  ({ onSave }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fcRef = useRef<fabric.Canvas | null>(null);
    const isPanningRef = useRef(false);
    const lastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const isDrawingShapeRef = useRef(false);
    const shapeStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const tempShapeRef = useRef<fabric.FabricObject | null>(null);
    const guideLinesRef = useRef<fabric.Line[]>([]);
    const [canvasReady, setCanvasReady] = useState(false);

    const {
      activeTool,
      setActiveTool,
      viewport,
      setViewport,
      setSelectedObjectIds,
      pushHistory,
      showGrid,
      gridSize,
      snapEnabled,
      setSnapGuides,
      setObjectCount,
      brushColor,
      brushWidth,
      dirty,
      setDirty,
      canvasBackground,
      canvasBgColor,
    } = useCanvasStudioStore();

    // Helper to get scene-space pointer from a fabric mouse event
    const getPointer = (canvas: fabric.Canvas, opt: any): { x: number; y: number } => {
      // Fabric v7 provides scenePoint on the event options
      if (opt.scenePoint) return { x: opt.scenePoint.x, y: opt.scenePoint.y };
      // Fallback: use getScenePoint or manual transform
      if (canvas.getScenePoint && opt.e) {
        const p = canvas.getScenePoint(opt.e);
        return { x: p.x, y: p.y };
      }
      // Final fallback: manual inverse viewport transform
      const e: MouseEvent = opt.e;
      const rect = (canvas as any).upperCanvasEl?.getBoundingClientRect?.() || { left: 0, top: 0 };
      const vpt = canvas.viewportTransform!;
      const zoom = canvas.getZoom();
      return {
        x: (e.clientX - rect.left - vpt[4]) / zoom,
        y: (e.clientY - rect.top - vpt[5]) / zoom,
      };
    };

    // ── Initialize canvas ───────────────────────────

    useEffect(() => {
      if (!canvasElRef.current || fcRef.current) return;
      const container = containerRef.current!;
      const rect = container.getBoundingClientRect();

      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: rect.width,
        height: rect.height,
        preserveObjectStacking: true,
        selection: true,
        perPixelTargetFind: true,
        targetFindTolerance: 8,
        backgroundColor: '#f8fafc',
      });

      fcRef.current = canvas;
      setCanvasReady(true);
      logger.info('Canvas initialized', { w: rect.width, h: rect.height });

      // Initial history snapshot
      const json = JSON.stringify(canvas.toJSON(['meta']));
      pushHistory(json);

      // Resize observer
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          canvas.setDimensions({ width, height });
          canvas.requestRenderAll();
        }
      });
      ro.observe(container);

      return () => {
        ro.disconnect();
        canvas.dispose();
        fcRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Canvas event handlers ───────────────────────

    useEffect(() => {
      const canvas = fcRef.current;
      if (!canvas) return;

      const onSelectionCreated = (e: any) => {
        const ids = (e.selected || []).map((o: any) => o.meta?.id).filter(Boolean);
        setSelectedObjectIds(ids);
      };
      const onSelectionUpdated = (e: any) => {
        const ids = (e.selected || []).map((o: any) => o.meta?.id).filter(Boolean);
        setSelectedObjectIds(ids);
      };
      const onSelectionCleared = () => setSelectedObjectIds([]);

      const onObjectModified = () => {
        saveSnapshot();
        updateObjectCount();
      };
      const onObjectAdded = () => {
        updateObjectCount();
      };
      const onObjectRemoved = () => {
        updateObjectCount();
      };

      canvas.on('selection:created', onSelectionCreated);
      canvas.on('selection:updated', onSelectionUpdated);
      canvas.on('selection:cleared', onSelectionCleared);
      canvas.on('object:modified', onObjectModified);
      canvas.on('object:added', onObjectAdded);
      canvas.on('object:removed', onObjectRemoved);

      return () => {
        canvas.off('selection:created', onSelectionCreated);
        canvas.off('selection:updated', onSelectionUpdated);
        canvas.off('selection:cleared', onSelectionCleared);
        canvas.off('object:modified', onObjectModified);
        canvas.off('object:added', onObjectAdded);
        canvas.off('object:removed', onObjectRemoved);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasReady]);

    // ── Snapping during object move ─────────────────

    useEffect(() => {
      const canvas = fcRef.current;
      if (!canvas) return;

      const onMoving = (e: any) => {
        if (!snapEnabled) return;
        const target = e.target;
        if (!target) return;
        const allObjects = canvas.getObjects().filter((o: any) => o !== target && !o._isGuide);
        const { guides, snapDx, snapDy } = calculateSnap(
          target,
          allObjects,
          showGrid ? gridSize : null,
        );
        if (snapDx !== 0) target.set('left', (target.left ?? 0) + snapDx);
        if (snapDy !== 0) target.set('top', (target.top ?? 0) + snapDy);

        // Draw temporary guide lines
        clearGuideLines(canvas);
        for (const g of guides.slice(0, 4)) {
          const line = g.orientation === 'vertical'
            ? new fabric.Line([g.position, -10000, g.position, 10000], {
                stroke: '#3b82f6',
                strokeWidth: 1,
                strokeDashArray: [4, 4],
                selectable: false,
                evented: false,
                excludeFromExport: true,
              })
            : new fabric.Line([-10000, g.position, 10000, g.position], {
                stroke: '#3b82f6',
                strokeWidth: 1,
                strokeDashArray: [4, 4],
                selectable: false,
                evented: false,
                excludeFromExport: true,
              });
          (line as any)._isGuide = true;
          canvas.add(line);
          guideLinesRef.current.push(line);
        }
        setSnapGuides(guides);
      };

      const onModified = () => {
        clearGuideLines(canvas);
        setSnapGuides([]);
      };

      canvas.on('object:moving', onMoving);
      canvas.on('object:modified', onModified);

      return () => {
        canvas.off('object:moving', onMoving);
        canvas.off('object:modified', onModified);
      };
    }, [canvasReady, snapEnabled, showGrid, gridSize, setSnapGuides]);

    // ── Tool mode changes ───────────────────────────

    useEffect(() => {
      const canvas = fcRef.current;
      if (!canvas) return;

      // Reset state
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      canvas.hoverCursor = 'move';
      (canvas as any).freeDrawingBrush = null;

      if (activeTool === 'hand') {
        canvas.selection = false;
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
        canvas.forEachObject((o) => { o.selectable = false; o.evented = false; });
      } else if (activeTool === 'brush' || activeTool === 'pen') {
        canvas.isDrawingMode = true;
        const brush = new fabric.PencilBrush(canvas);
        brush.color = brushColor;
        brush.width = brushWidth;
        canvas.freeDrawingBrush = brush;
      } else if (activeTool === 'eraser') {
        canvas.isDrawingMode = true;
        const brush = new fabric.PencilBrush(canvas);
        brush.color = '#f8fafc'; // background color as eraser
        brush.width = 20;
        canvas.freeDrawingBrush = brush;
      } else if (activeTool === 'select') {
        canvas.forEachObject((o) => {
          if (!(o as any)._isGuide) {
            o.selectable = !(o as any).meta?.locked;
            o.evented = true;
          }
        });
      } else {
        // Shape/content tools – disable selection on existing objects
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      }

      canvas.requestRenderAll();
    }, [activeTool, brushColor, brushWidth, canvasReady]);

    // ── Mouse events for pan & shape drawing ────────

    useEffect(() => {
      const canvas = fcRef.current;
      if (!canvas) return;

      const onMouseDown = (opt: any) => {
        const e: MouseEvent = opt.e;
        const tool = useCanvasStudioStore.getState().activeTool;

        // Pan with space+drag, middle mouse, or hand tool
        if (tool === 'hand' || e.button === 1 || (e.button === 0 && e.getModifierState?.('Space'))) {
          isPanningRef.current = true;
          lastPosRef.current = { x: e.clientX, y: e.clientY };
          canvas.defaultCursor = 'grabbing';
          return;
        }

        // Shape drawing
        if (isShapeTool(tool)) {
          const pointer = getPointer(canvas, opt);
          shapeStartRef.current = { x: pointer.x, y: pointer.y };
          isDrawingShapeRef.current = true;
        }
      };

      const onMouseMove = (opt: any) => {
        const e: MouseEvent = opt.e;
        if (isPanningRef.current) {
          const dx = e.clientX - lastPosRef.current.x;
          const dy = e.clientY - lastPosRef.current.y;
          const vpt = canvas.viewportTransform!;
          vpt[4] += dx;
          vpt[5] += dy;
          canvas.requestRenderAll();
          lastPosRef.current = { x: e.clientX, y: e.clientY };
          setViewport({ panX: vpt[4], panY: vpt[5] });
          return;
        }

        const tool = useCanvasStudioStore.getState().activeTool;
        if (isDrawingShapeRef.current && isShapeTool(tool)) {
          const pointer = getPointer(canvas, opt);
          const { x: sx, y: sy } = shapeStartRef.current;
          const w = pointer.x - sx;
          const h = pointer.y - sy;

          if (tempShapeRef.current) {
            canvas.remove(tempShapeRef.current);
          }

          const shape = createShapePreview(tool, sx, sy, w, h);
          if (shape) {
            (shape as any)._isTemp = true;
            canvas.add(shape);
            tempShapeRef.current = shape;
            canvas.requestRenderAll();
          }
        }
      };

      const onMouseUp = (opt: any) => {
        if (isPanningRef.current) {
          isPanningRef.current = false;
          const tool = useCanvasStudioStore.getState().activeTool;
          canvas.defaultCursor = tool === 'hand' ? 'grab' : 'default';
          return;
        }

        const tool = useCanvasStudioStore.getState().activeTool;
        if (isDrawingShapeRef.current && isShapeTool(tool)) {
          isDrawingShapeRef.current = false;

          if (tempShapeRef.current) {
            canvas.remove(tempShapeRef.current);
            tempShapeRef.current = null;
          }

          const e: MouseEvent = opt.e;
          const pointer = getPointer(canvas, opt);
          const { x: sx, y: sy } = shapeStartRef.current;
          let w = pointer.x - sx;
          let h = pointer.y - sy;

          // Minimum size — if click without drag, use defaults
          if (Math.abs(w) < 5 && Math.abs(h) < 5) {
            w = tool === 'line' || tool === 'arrow' ? 200 : 120;
            h = tool === 'line' || tool === 'arrow' ? 0 : 100;
          }

          if (canvas.getObjects().filter((o: any) => !o._isGuide).length >= MAX_OBJECTS) {
            logger.warn('Max objects reached');
            return;
          }

          const shape = createFinalShape(tool, sx, sy, w, h);
          if (shape) {
            applyMeta(shape, tool);
            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.requestRenderAll();
            saveSnapshot();
          }

          // Switch back to select after placing
          setActiveTool('select');
        }
      };

      // Zoom with Ctrl+scroll
      const onMouseWheel = (opt: any) => {
        const e: WheelEvent = opt.e;
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          const delta = -e.deltaY / 500;
          let zoom = canvas.getZoom() * (1 + delta);
          zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
          const point = new fabric.Point(e.offsetX, e.offsetY);
          canvas.zoomToPoint(point, zoom);
          setViewport({
            zoom,
            panX: canvas.viewportTransform![4],
            panY: canvas.viewportTransform![5],
          });
        }
      };

      canvas.on('mouse:down', onMouseDown);
      canvas.on('mouse:move', onMouseMove);
      canvas.on('mouse:up', onMouseUp);
      canvas.on('mouse:wheel', onMouseWheel);

      // Context menu (right-click)
      const onContextMenu = (opt: any) => {
        const e: MouseEvent = opt.e;
        e.preventDefault();
        e.stopPropagation();
        useCanvasStudioStore.getState().setContextMenuPos({ x: e.clientX, y: e.clientY });
      };
      canvas.on('mouse:down', (opt: any) => {
        if (opt.e?.button === 2) {
          onContextMenu(opt);
        }
      });
      // Also suppress browser context menu on the canvas element
      const canvasEl = containerRef.current;
      const preventCtx = (e: Event) => e.preventDefault();
      canvasEl?.addEventListener('contextmenu', preventCtx);

      return () => {
        canvas.off('mouse:down', onMouseDown);
        canvas.off('mouse:move', onMouseMove);
        canvas.off('mouse:up', onMouseUp);
        canvas.off('mouse:wheel', onMouseWheel);
        canvasEl?.removeEventListener('contextmenu', preventCtx);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasReady]);

    // ── Keyboard shortcuts ──────────────────────────

    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        // Don't capture when typing in inputs
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

        const canvas = fcRef.current;
        if (!canvas) return;

        // Ctrl/Cmd shortcuts
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'z') {
            e.preventDefault();
            const json = useCanvasStudioStore.getState().undo();
            if (json) restoreFromJSON(json);
          } else if (e.key === 'y') {
            e.preventDefault();
            const json = useCanvasStudioStore.getState().redo();
            if (json) restoreFromJSON(json);
          } else if (e.key === ']') {
            e.preventDefault();
            bringForward();
          } else if (e.key === '[') {
            e.preventDefault();
            sendBackward();
          } else if (e.key === 'a') {
            e.preventDefault();
            selectAll();
          } else if (e.key === 'c') {
            e.preventDefault();
            const active = canvas.getActiveObject();
            if (active) {
              active.clone().then((cloned: any) => {
                (canvas as any).clipboard = cloned;
              });
            }
          } else if (e.key === 'v') {
            e.preventDefault();
            const clip = (canvas as any).clipboard;
            if (clip) {
              clip.clone().then((cloned: any) => {
                cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
                applyMeta(cloned, cloned.meta?.type || 'unknown');
                canvas.add(cloned);
                canvas.setActiveObject(cloned);
                canvas.requestRenderAll();
                saveSnapshot();
                (canvas as any).clipboard = cloned;
              });
            }
          } else if (e.key === 'd') {
            e.preventDefault();
            duplicateSelected();
          } else if (e.key === 's') {
            e.preventDefault();
            // Save is handled by the parent via onSave
            const { dirty: isDirty } = useCanvasStudioStore.getState();
            if (fcRef.current) {
              const json = JSON.stringify(fcRef.current.toJSON(['meta']));
              onSave?.(json);
              setDirty(false);
            }
          }
          return;
        }

        // Single key shortcuts
        const toolMap: Record<string, CanvasTool> = {
          v: 'select', h: 'hand', r: 'rectangle', c: 'circle',
          l: 'line', a: 'arrow', s: 'star', t: 'text',
          n: 'sticky', b: 'brush', x: 'eraser',
        };
        if (toolMap[e.key]) {
          setActiveTool(toolMap[e.key]);
          return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          deleteSelected();
        }

        // ? for shortcuts dialog
        if (e.key === '?') {
          useCanvasStudioStore.getState().setShortcutsOpen(true);
        }
      };

      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasReady]);

    // ── Grid overlay ────────────────────────────────

    useEffect(() => {
      const canvas = fcRef.current;
      if (!canvas) return;

      // Determine background color based on canvas background setting
      const isDark = canvasBackground === 'dark';
      const bgColor = canvasBackground === 'transparent'
        ? 'transparent'
        : canvasBackground === 'dark'
          ? '#0f172a'
          : '#f8fafc';

      canvas.set('backgroundColor', bgColor);

      // Draw grid/dots overlay
      if (showGrid || canvasBackground === 'grid' || canvasBackground === 'dots') {
        const drawOverlay = ({ ctx }: { ctx: CanvasRenderingContext2D }) => {
          const vpt = canvas.viewportTransform!;
          const zoom = canvas.getZoom();
          const w = canvas.getWidth();
          const h = canvas.getHeight();
          const step = gridSize * zoom;
          const offsetX = vpt[4] % step;
          const offsetY = vpt[5] % step;

          ctx.save();

          if (canvasBackground === 'dots') {
            // Dot grid
            ctx.fillStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.4)';
            for (let x = offsetX; x < w; x += step) {
              for (let y = offsetY; y < h; y += step) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
              }
            }
          } else {
            // Line grid
            ctx.strokeStyle = isDark ? 'rgba(148,163,184,0.1)' : '#e2e8f0';
            ctx.lineWidth = 0.5;
            for (let x = offsetX; x < w; x += step) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, h);
              ctx.stroke();
            }
            for (let y = offsetY; y < h; y += step) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(w, y);
              ctx.stroke();
            }
          }

          ctx.restore();
        };
        canvas.on('after:render', drawOverlay);
        canvas.requestRenderAll();
        return () => { canvas.off('after:render', drawOverlay); };
      } else {
        canvas.requestRenderAll();
      }
    }, [showGrid, gridSize, canvasReady, canvasBackground, canvasBgColor]);

    // ── Autosave ────────────────────────────────────

    useEffect(() => {
      const interval = setInterval(() => {
        const { dirty: isDirty } = useCanvasStudioStore.getState();
        if (isDirty && fcRef.current) {
          const json = JSON.stringify(fcRef.current.toJSON(['meta']));
          onSave?.(json);
          setDirty(false);
          logger.info('Autosaved');
        }
      }, AUTOSAVE_INTERVAL);
      return () => clearInterval(interval);
    }, [onSave, setDirty]);

    // ── Helpers ─────────────────────────────────────

    const updateObjectCount = () => {
      const count = fcRef.current?.getObjects().filter((o: any) => !o._isGuide && !o._isTemp).length || 0;
      setObjectCount(count);
    };

    const saveSnapshot = useCallback(() => {
      if (!fcRef.current) return;
      const json = JSON.stringify(fcRef.current.toJSON(['meta']));
      pushHistory(json);
      setDirty(true);
    }, [pushHistory, setDirty]);

    const restoreFromJSON = async (json: string) => {
      const canvas = fcRef.current;
      if (!canvas) return;
      try {
        await canvas.loadFromJSON(json);
        canvas.requestRenderAll();
      } catch (err) {
        logger.error('Failed to restore canvas state', err);
      }
    };

    const clearGuideLines = (canvas: fabric.Canvas) => {
      for (const line of guideLinesRef.current) {
        canvas.remove(line);
      }
      guideLinesRef.current = [];
    };

    // ── Shape creation helpers ──────────────────────

    function isShapeTool(tool: CanvasTool): boolean {
      return [
        'rectangle', 'circle', 'triangle', 'line', 'arrow', 'star', 'polygon',
      ].includes(tool);
    }

    function createShapePreview(tool: CanvasTool, x: number, y: number, w: number, h: number): fabric.FabricObject | null {
      const base = { left: Math.min(x, x + w), top: Math.min(y, y + h), fill: 'rgba(59,130,246,0.1)', stroke: '#3b82f6', strokeWidth: 1, selectable: false, evented: false };
      const absW = Math.abs(w);
      const absH = Math.abs(h);

      switch (tool) {
        case 'rectangle':
          return new fabric.Rect({ ...base, width: absW, height: absH, rx: 4, ry: 4 });
        case 'circle':
          return new fabric.Ellipse({ ...base, rx: absW / 2, ry: absH / 2 });
        case 'triangle':
          return new fabric.Triangle({ ...base, width: absW, height: absH });
        case 'line':
          return new fabric.Line([x, y, x + w, y + h], { stroke: '#3b82f6', strokeWidth: 2, selectable: false, evented: false });
        case 'arrow':
          return new fabric.Line([x, y, x + w, y + h], { stroke: '#3b82f6', strokeWidth: 2, selectable: false, evented: false });
        case 'star':
          return new fabric.Rect({ ...base, width: absW, height: absH }); // simplified preview
        case 'polygon':
          return new fabric.Rect({ ...base, width: absW, height: absH });
        default:
          return null;
      }
    }

    function createFinalShape(tool: CanvasTool, x: number, y: number, w: number, h: number): fabric.FabricObject | null {
      const left = w >= 0 ? x : x + w;
      const top = h >= 0 ? y : y + h;
      const absW = Math.abs(w) || 120;
      const absH = Math.abs(h) || 100;

      const base = { left, top, fill: '#ffffff', stroke: '#334155', strokeWidth: 2, strokeUniform: true };

      switch (tool) {
        case 'rectangle':
          return new fabric.Rect({ ...base, width: absW, height: absH, rx: 6, ry: 6 });
        case 'circle':
          return new fabric.Ellipse({ ...base, rx: absW / 2, ry: absH / 2 });
        case 'triangle':
          return new fabric.Triangle({ ...base, width: absW, height: absH });
        case 'line':
          return new fabric.Line([x, y, x + w, y + h], { stroke: '#334155', strokeWidth: 2 });
        case 'arrow': {
          const line = new fabric.Line([x, y, x + w, y + h], { stroke: '#334155', strokeWidth: 2 });
          // Add arrowhead via path
          return line; // simplified — arrow rendering
        }
        case 'star':
          return createStarShape(left, top, absW, absH);
        case 'polygon':
          return createHexagonShape(left, top, absW, absH);
        default:
          return null;
      }
    }

    function createStarShape(x: number, y: number, w: number, h: number) {
      const cx = w / 2;
      const cy = h / 2;
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.4;
      const points: fabric.XY[] = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r = i % 2 === 0 ? outerR : innerR;
        points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      return new fabric.Polygon(points, { left: x, top: y, fill: '#fbbf24', stroke: '#d97706', strokeWidth: 2, strokeUniform: true });
    }

    function createHexagonShape(x: number, y: number, w: number, h: number) {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2;
      const points: fabric.XY[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        points.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      }
      return new fabric.Polygon(points, { left: x, top: y, fill: '#a78bfa', stroke: '#7c3aed', strokeWidth: 2, strokeUniform: true });
    }

    // ── Flowchart shape helpers ──────────────────────

    function createFlowchartStart(x: number, y: number, w: number, h: number): fabric.FabricObject {
      // Rounded pill / stadium shape for start/end
      const rect = new fabric.Rect({
        left: x,
        top: y,
        width: w,
        height: h,
        rx: h / 2,
        ry: h / 2,
        fill: '#dbeafe',
        stroke: '#3b82f6',
        strokeWidth: 2,
      });
      return rect;
    }

    function createFlowchartProcess(x: number, y: number, w: number, h: number): fabric.FabricObject {
      // Simple rectangle for process
      const rect = new fabric.Rect({
        left: x,
        top: y,
        width: w,
        height: h,
        rx: 6,
        ry: 6,
        fill: '#fef9c3',
        stroke: '#eab308',
        strokeWidth: 2,
      });
      return rect;
    }

    function createFlowchartDecision(x: number, y: number, w: number, h: number): fabric.FabricObject {
      // Diamond shape for decision
      const halfW = w / 2;
      const halfH = h / 2;
      const points = [
        new fabric.Point(halfW, 0),
        new fabric.Point(w, halfH),
        new fabric.Point(halfW, h),
        new fabric.Point(0, halfH),
      ];
      const polygon = new fabric.Polygon(points, {
        left: x,
        top: y,
        fill: '#fce7f3',
        stroke: '#ec4899',
        strokeWidth: 2,
      });
      return polygon;
    }

    const addFlowchartShape = useCallback((type: 'start' | 'process' | 'decision') => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const vpt = canvas.viewportTransform!;
      const zoom = canvas.getZoom();
      const cx = (canvas.getWidth() / 2 - vpt[4]) / zoom;
      const cy = (canvas.getHeight() / 2 - vpt[5]) / zoom;

      let shape: fabric.FabricObject | null = null;
      if (type === 'start') shape = createFlowchartStart(cx - 60, cy - 30, 120, 60);
      else if (type === 'process') shape = createFlowchartProcess(cx - 75, cy - 30, 150, 60);
      else shape = createFlowchartDecision(cx - 60, cy - 40, 120, 80);

      if (shape) {
        applyMeta(shape, `flowchart_${type}`);
        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.requestRenderAll();
        saveSnapshot();
      }
      setActiveTool('select');
    }, [saveSnapshot, setActiveTool]);

    const addStickyNote = useCallback((color?: string) => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const c = color || STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
      const vpt = canvas.viewportTransform!;
      const zoom = canvas.getZoom();
      const cx = (canvas.getWidth() / 2 - vpt[4]) / zoom;
      const cy = (canvas.getHeight() / 2 - vpt[5]) / zoom;

      const bg = new fabric.Rect({
        width: 200,
        height: 160,
        fill: c,
        rx: 8,
        ry: 8,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 8, offsetX: 2, offsetY: 2 }),
        originX: 'center',
        originY: 'center',
      });
      const text = new fabric.IText('Type here...', {
        fontSize: 14,
        fontFamily: 'Inter, sans-serif',
        fill: '#1e293b',
        originX: 'center',
        originY: 'center',
        textAlign: 'center',
        width: 180,
      });
      const group = new fabric.Group([bg, text], { left: cx - 100, top: cy - 80 });
      applyMeta(group, 'sticky');
      canvas.add(group);
      canvas.setActiveObject(group);
      canvas.requestRenderAll();
      saveSnapshot();
      setActiveTool('select');
    }, [saveSnapshot, setActiveTool]);

    const addText = useCallback(() => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const vpt = canvas.viewportTransform!;
      const zoom = canvas.getZoom();
      const cx = (canvas.getWidth() / 2 - vpt[4]) / zoom;
      const cy = (canvas.getHeight() / 2 - vpt[5]) / zoom;

      const text = new fabric.IText('Double-click to edit', {
        left: cx - 80,
        top: cy - 12,
        fontSize: 18,
        fontFamily: 'Inter, sans-serif',
        fill: '#1e293b',
      });
      applyMeta(text, 'text');
      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.requestRenderAll();
      saveSnapshot();
      setActiveTool('select');
    }, [saveSnapshot, setActiveTool]);

    const addImage = useCallback((url: string) => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const imgEl = new Image();
      imgEl.crossOrigin = 'anonymous';
      imgEl.onload = () => {
        const fImg = new fabric.FabricImage(imgEl);
        const maxDim = 400;
        if (fImg.width! > maxDim || fImg.height! > maxDim) {
          const scale = maxDim / Math.max(fImg.width!, fImg.height!);
          fImg.scale(scale);
        }
        const vpt = canvas.viewportTransform!;
        const zoom = canvas.getZoom();
        fImg.set({
          left: (canvas.getWidth() / 2 - vpt[4]) / zoom - (fImg.getScaledWidth() / 2),
          top: (canvas.getHeight() / 2 - vpt[5]) / zoom - (fImg.getScaledHeight() / 2),
        });
        applyMeta(fImg, 'image');
        canvas.add(fImg);
        canvas.setActiveObject(fImg);
        canvas.requestRenderAll();
        saveSnapshot();
      };
      imgEl.src = url;
    }, [saveSnapshot]);

    const deleteSelected = useCallback(() => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObjects();
      if (active.length === 0) return;
      active.forEach((o) => canvas.remove(o));
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      saveSnapshot();
    }, [saveSnapshot]);

    const duplicateSelected = useCallback(() => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active) return;
      active.clone().then((cloned: any) => {
        cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
        applyMeta(cloned, cloned.meta?.type || 'unknown');
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
        saveSnapshot();
      });
    }, [saveSnapshot]);

    const selectAll = useCallback(() => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const objs = canvas.getObjects().filter((o: any) => !o._isGuide);
      if (objs.length === 0) return;
      canvas.discardActiveObject();
      const sel = new fabric.ActiveSelection(objs, { canvas });
      canvas.setActiveObject(sel);
      canvas.requestRenderAll();
    }, []);

    const groupSelected = useCallback(() => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active || active.type !== 'activeselection') return;
      (active as fabric.ActiveSelection).toGroup();
      canvas.requestRenderAll();
      saveSnapshot();
    }, [saveSnapshot]);

    const ungroupSelected = useCallback(() => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (!active || active.type !== 'group') return;
      (active as fabric.Group).toActiveSelection();
      canvas.requestRenderAll();
      saveSnapshot();
    }, [saveSnapshot]);

    const bringForward = useCallback(() => {
      const canvas = fcRef.current;
      const active = canvas?.getActiveObject();
      if (active) { canvas!.bringObjectForward(active); canvas!.requestRenderAll(); saveSnapshot(); }
    }, [saveSnapshot]);

    const sendBackward = useCallback(() => {
      const canvas = fcRef.current;
      const active = canvas?.getActiveObject();
      if (active) { canvas!.sendObjectBackwards(active); canvas!.requestRenderAll(); saveSnapshot(); }
    }, [saveSnapshot]);

    const bringToFront = useCallback(() => {
      const canvas = fcRef.current;
      const active = canvas?.getActiveObject();
      if (active) { canvas!.bringObjectToFront(active); canvas!.requestRenderAll(); saveSnapshot(); }
    }, [saveSnapshot]);

    const sendToBack = useCallback(() => {
      const canvas = fcRef.current;
      const active = canvas?.getActiveObject();
      if (active) { canvas!.sendObjectToBack(active); canvas!.requestRenderAll(); saveSnapshot(); }
    }, [saveSnapshot]);

    const fitToScreen = useCallback(() => {
      const canvas = fcRef.current;
      if (!canvas) return;
      const objects = canvas.getObjects().filter((o: any) => !o._isGuide);
      if (objects.length === 0) {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        setViewport({ zoom: 1, panX: 0, panY: 0 });
        canvas.requestRenderAll();
        return;
      }
      // Calculate bounding box of all objects
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const obj of objects) {
        const bound = obj.getBoundingRect();
        minX = Math.min(minX, bound.left);
        minY = Math.min(minY, bound.top);
        maxX = Math.max(maxX, bound.left + bound.width);
        maxY = Math.max(maxY, bound.top + bound.height);
      }
      const padding = 60;
      const cw = canvas.getWidth();
      const ch = canvas.getHeight();
      const scaleX = (cw - padding * 2) / (maxX - minX);
      const scaleY = (ch - padding * 2) / (maxY - minY);
      const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(scaleX, scaleY)));
      const vpX = (cw / 2) - ((minX + maxX) / 2) * zoom;
      const vpY = (ch / 2) - ((minY + maxY) / 2) * zoom;
      canvas.setViewportTransform([zoom, 0, 0, zoom, vpX, vpY]);
      setViewport({ zoom, panX: vpX, panY: vpY });
      canvas.requestRenderAll();
    }, [setViewport]);

    // ── Expose handle ───────────────────────────────

    useImperativeHandle(ref, () => ({
      getCanvas: () => fcRef.current,
      toJSON: () => JSON.stringify(fcRef.current?.toJSON(['meta']) ?? {}),
      loadJSON: async (json: string) => {
        if (!fcRef.current) return;
        await fcRef.current.loadFromJSON(json);
        fcRef.current.requestRenderAll();
        saveSnapshot();
      },
      addImage,
      toDataURL: (fmt = 'png', quality = 1) => {
        return fcRef.current?.toDataURL({ format: fmt as any, quality, multiplier: 2 }) || '';
      },
      toSVG: () => fcRef.current?.toSVG() || '',
      fitToScreen,
      deleteSelected,
      duplicateSelected,
      selectAll,
      groupSelected,
      ungroupSelected,
      bringForward,
      sendBackward,
      bringToFront,
      sendToBack,
      addStickyNote,
      addText,
      addFlowchartShape,
      saveSnapshot,
      copySelected: () => {
        const canvas = fcRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active) return;
        active.clone().then((cloned: any) => {
          applyMeta(cloned, cloned.meta?.type || 'unknown');
          (canvas as any)._clipboard = cloned;
        });
      },
      pasteFromClipboard: () => {
        const canvas = fcRef.current;
        if (!canvas) return;
        const clip = (canvas as any)._clipboard;
        if (!clip) return;
        clip.clone().then((cloned: any) => {
          cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
          applyMeta(cloned, cloned.meta?.type || 'unknown');
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
          canvas.requestRenderAll();
          saveSnapshot();
        });
      },
      alignObjects: (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
        const canvas = fcRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active || active.type !== 'activeselection') return;
        const sel = active as fabric.ActiveSelection;
        const objects = sel.getObjects();
        if (objects.length === 0) return;

        const bounds = objects.map(obj => obj.getBoundingRect());
        const minX = Math.min(...bounds.map(b => b.left));
        const maxX = Math.max(...bounds.map(b => b.left + b.width));
        const minY = Math.min(...bounds.map(b => b.top));
        const maxY = Math.max(...bounds.map(b => b.top + b.height));
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        objects.forEach(obj => {
          const bound = obj.getBoundingRect();
          switch (alignment) {
            case 'left':
              obj.set('left', obj.left! - (bound.left - minX));
              break;
            case 'center':
              obj.set('left', obj.left! - (bound.left - midX) + (bound.width / 2));
              break;
            case 'right':
              obj.set('left', obj.left! - (bound.left - maxX) + bound.width);
              break;
            case 'top':
              obj.set('top', obj.top! - (bound.top - minY));
              break;
            case 'middle':
              obj.set('top', obj.top! - (bound.top - midY) + (bound.height / 2));
              break;
            case 'bottom':
              obj.set('top', obj.top! - (bound.top - maxY) + bound.height);
              break;
          }
        });
        canvas.requestRenderAll();
        saveSnapshot();
      },
      distributeObjects: (direction: 'horizontal' | 'vertical') => {
        const canvas = fcRef.current;
        if (!canvas) return;
        const active = canvas.getActiveObject();
        if (!active || active.type !== 'activeselection') return;
        const sel = active as fabric.ActiveSelection;
        const objects = sel.getObjects();
        if (objects.length < 2) return;

        const bounds = objects.map(obj => obj.getBoundingRect());
        const minX = Math.min(...bounds.map(b => b.left));
        const maxX = Math.max(...bounds.map(b => b.left + b.width));
        const minY = Math.min(...bounds.map(b => b.top));
        const maxY = Math.max(...bounds.map(b => b.top + b.height));
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;

        const sortedObjects = objects.slice().sort((a, b) => {
          const aBound = a.getBoundingRect();
          const bBound = b.getBoundingRect();
          return direction === 'horizontal' ? aBound.left - bBound.left : aBound.top - bBound.top;
        });

        const spacing = (direction === 'horizontal' ? (maxX - minX) : (maxY - minY)) / (sortedObjects.length - 1);
        sortedObjects.forEach((obj, index) => {
          const bound = obj.getBoundingRect();
          if (direction === 'horizontal') {
            obj.set('left', obj.left! - (bound.left - minX) + (index * spacing));
          } else {
            obj.set('top', obj.top! - (bound.top - minY) + (index * spacing));
          }
        });
        canvas.requestRenderAll();
        saveSnapshot();
      },
    }), [addImage, fitToScreen, deleteSelected, duplicateSelected, selectAll, groupSelected, ungroupSelected, bringForward, sendBackward, bringToFront, sendToBack, addStickyNote, addText, addFlowchartShape, saveSnapshot]);

    return (
      <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
        <canvas ref={canvasElRef} />
      </div>
    );
  }
);

CanvasCore.displayName = 'CanvasCore';
export default CanvasCore;