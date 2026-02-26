/**
 * Profile Editor – centralised state via useReducer.
 *
 * All layer mutations flow through the reducer so the canvas and panels
 * always stay in sync with a single source of truth.
 */

import { useReducer, useCallback } from 'react';
import {
  DEFAULT_CANVAS_CONFIG,
  DEFAULT_IMAGE_ADJUSTMENTS,
  generateLayerId,
  type EditorState,
  type EditorAction,
  type EditorLayer,
  type CanvasConfig,
  type LayerType,
  createDefaultLayer,
} from '../utils/editor-types';

// ─── Initial state ───────────────────────────────────────
const initialState: EditorState = {
  layers: [],
  selectedLayerId: null,
  canvasConfig: { ...DEFAULT_CANVAS_CONFIG },
  profileName: 'Untitled Profile',
};

// ─── Reducer ─────────────────────────────────────────────
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_LAYER':
      return {
        ...state,
        layers: [...state.layers, action.layer],
        selectedLayerId: action.layer.id,
      };

    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, ...action.changes } : l,
        ),
      };

    case 'DELETE_LAYER': {
      const next = state.layers.filter((l) => l.id !== action.id);
      return {
        ...state,
        layers: next,
        selectedLayerId:
          state.selectedLayerId === action.id ? null : state.selectedLayerId,
      };
    }

    case 'DUPLICATE_LAYER': {
      const src = state.layers.find((l) => l.id === action.id);
      if (!src) return state;
      const copy: EditorLayer = {
        ...src,
        id: generateLayerId(),
        name: `${src.name} copy`,
        x: src.x + 10,
        y: src.y + 10,
        // Deep-copy adjustments so the duplicate is independent
        ...(src.adjustments ? { adjustments: { ...src.adjustments } } : {}),
      };
      const idx = state.layers.findIndex((l) => l.id === action.id);
      const newLayers = [...state.layers];
      newLayers.splice(idx + 1, 0, copy);
      return { ...state, layers: newLayers, selectedLayerId: copy.id };
    }

    case 'REORDER_LAYERS': {
      const arr = [...state.layers];
      const [moved] = arr.splice(action.fromIndex, 1);
      arr.splice(action.toIndex, 0, moved);
      return { ...state, layers: arr };
    }

    case 'SELECT_LAYER':
      return { ...state, selectedLayerId: action.id };

    case 'TOGGLE_VISIBILITY':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, visible: !l.visible } : l,
        ),
      };

    case 'TOGGLE_LOCK':
      return {
        ...state,
        layers: state.layers.map((l) =>
          l.id === action.id ? { ...l, locked: !l.locked } : l,
        ),
      };

    case 'UPDATE_CANVAS_CONFIG':
      return {
        ...state,
        canvasConfig: { ...state.canvasConfig, ...action.changes },
      };

    case 'SET_PROFILE_NAME':
      return { ...state, profileName: action.name };

    case 'LOAD_STATE':
      return { ...action.state };

    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────
export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  // Convenience wrappers -------------------------------------------------
  const addLayer = useCallback(
    (type: LayerType) => {
      const layer = createDefaultLayer(type, state.canvasConfig);
      dispatch({ type: 'ADD_LAYER', layer });
      return layer;
    },
    [state.canvasConfig],
  );

  const addImageLayer = useCallback(
    (src: string, imgWidth: number, imgHeight: number) => {
      const cc = state.canvasConfig;
      // Fit image within 60% of canvas, preserving aspect
      const maxW = cc.width * 0.6;
      const maxH = cc.height * 0.6;
      const scale = Math.min(maxW / imgWidth, maxH / imgHeight, 1);
      const w = Math.round(imgWidth * scale);
      const h = Math.round(imgHeight * scale);
      const layer: EditorLayer = {
        id: generateLayerId(),
        type: 'image',
        name: 'Image',
        x: Math.round((cc.width - w) / 2),
        y: Math.round((cc.height - h) / 2),
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        src,
        adjustments: DEFAULT_IMAGE_ADJUSTMENTS,
      };
      dispatch({ type: 'ADD_LAYER', layer });
      return layer;
    },
    [state.canvasConfig],
  );

  const updateLayer = useCallback(
    (id: string, changes: Partial<EditorLayer>) =>
      dispatch({ type: 'UPDATE_LAYER', id, changes }),
    [],
  );

  const deleteLayer = useCallback(
    (id: string) => dispatch({ type: 'DELETE_LAYER', id }),
    [],
  );

  const duplicateLayer = useCallback(
    (id: string) => dispatch({ type: 'DUPLICATE_LAYER', id }),
    [],
  );

  const selectLayer = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT_LAYER', id }),
    [],
  );

  const toggleVisibility = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_VISIBILITY', id }),
    [],
  );

  const toggleLock = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_LOCK', id }),
    [],
  );

  const reorderLayers = useCallback(
    (from: number, to: number) =>
      dispatch({ type: 'REORDER_LAYERS', fromIndex: from, toIndex: to }),
    [],
  );

  const updateCanvasConfig = useCallback(
    (changes: Partial<CanvasConfig>) =>
      dispatch({ type: 'UPDATE_CANVAS_CONFIG', changes }),
    [],
  );

  const setProfileName = useCallback(
    (name: string) => dispatch({ type: 'SET_PROFILE_NAME', name }),
    [],
  );

  const selectedLayer = state.layers.find(
    (l) => l.id === state.selectedLayerId,
  ) ?? null;

  return {
    state,
    dispatch,
    selectedLayer,
    addLayer,
    addImageLayer,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    selectLayer,
    toggleVisibility,
    toggleLock,
    reorderLayers,
    updateCanvasConfig,
    setProfileName,
  };
}

export type EditorActions = ReturnType<typeof useEditorState>;