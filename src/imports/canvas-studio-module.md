Tech Stack
Canvas Studio must reuse the existing Tech Tribune technology stack.
Use:
* React
* TypeScript
* Fabric.js v6
* Tailwind CSS (existing config)
* shadcn/ui components (if already used)
* Lucide Icons
* Existing project state manager (Zustand / Redux / Context depending on current app)
Do NOT introduce a new router or app framework.
Canvas Studio must integrate directly with the existing project architecture.

Integration Rules
Canvas Studio is not a standalone application.
It must integrate inside the existing layout.
Example structure:

Tech Tribune App
 ├ Dashboard
 ├ Articles
 ├ Newsletter Builder
 └ Canvas Studio   ← new module

Canvas Studio should render inside the app layout container.
Example:

<TechTribuneLayout>
   <CanvasStudio />
</TechTribuneLayout>

The canvas must adapt to the available container space instead of taking the full browser viewport.
Example height rule:

height: calc(100vh - headerHeight)


Feature Module Structure
Create Canvas Studio as a modular feature inside the project.

src
 ├ features
 │   └ canvas-studio
 │        ├ components
 │        │     ├ canvas
 │        │     │     CanvasCore.tsx
 │        │     │     CanvasEvents.tsx
 │        │     │     InfiniteCanvas.tsx
 │        │     │     MiniMap.tsx
 │        │
 │        │     ├ toolbar
 │        │     │     TopToolbar.tsx
 │        │     │     ToolPalette.tsx
 │        │     │     ZoomControls.tsx
 │        │
 │        │     ├ panels
 │        │     │     RightPanel.tsx
 │        │     │     LayersPanel.tsx
 │        │
 │        │     ├ dialogs
 │        │     │     ExportDialog.tsx
 │        │     │     SaveDialog.tsx
 │        │     │     AIGeneratorDialog.tsx
 │        │
 │        ├ hooks
 │        │     useCanvas.ts
 │        │     useCanvasEvents.ts
 │        │     useCanvasTools.ts
 │        │     useCanvasHistory.ts
 │        │
 │        ├ store
 │        │     canvasStudioStore.ts
 │        │
 │        ├ utils
 │        │     canvasHelpers.ts
 │        │     exportUtils.ts
 │        │     logger.ts
 │        │
 │        ├ types
 │        │     canvasTypes.ts
 │        │
 │        └ CanvasStudio.tsx

The entire feature must remain self-contained but modular.

Canvas Initialization
Use Fabric.js v6 to create the canvas.
Configuration:

preserveObjectStacking: true
selection: true
perPixelTargetFind: true
targetFindTolerance: 8

Enable:

objectCaching: true

Canvas should handle 2000 objects smoothly.

Infinite Canvas Navigation
Support modern canvas navigation.
Pan
* Space + drag
* Middle mouse drag
* Hand tool
Zoom
* Ctrl/Cmd + mouse wheel
* Zoom buttons
* Zoom presets
* Fit to screen
Zoom range:

0.1 → 5

Maintain viewport state:

{
 zoom
 panX
 panY
}


Performance Guidelines
Canvas must remain responsive with large projects.
Rules:
• throttle mouse move events • use requestAnimationFrame for drag updates • avoid unnecessary canvas.renderAll() calls • batch canvas updates • enable object caching • avoid full JSON serialization on every action

Canvas Object Metadata
Each Fabric object must include metadata.

meta: {
 id: string
 type: string
 createdAt: timestamp
 createdBy: "user"
 locked: boolean
 groupId?: string
 isTemplate?: boolean
}

This prepares the system for:
* collaboration
* comments
* version history
* plugins

Tools System
Cursor Tools
Select Hand

Shape Tools
Rectangle Circle Triangle Line Arrow Star Polygon

Drawing Tools
Pen Brush Eraser

Content Tools
Text Sticky Note Image Upload

Flowchart Shapes
Provide built-in flowchart shapes:
Start / End Process Decision
Each shape is a group of background shape + text.

Smart Alignment
Implement snapping and alignment features.
Support:
* snap to grid
* snap to object edges
* snap to center
* smart alignment guides
Snap threshold:

10px

Show temporary guide lines during drag.

Layer Management
Objects must exist in a layer stack.
Provide operations:
Bring forward Send backward Bring to front Send to back
Keyboard:

Ctrl + ]
Ctrl + [

Optional Layers panel in the right sidebar.

Selection System
Support advanced selection.
Features:
* drag selection box
* shift-click multi select
* group
* ungroup
* bounding transform handles
* rotate
* scale

Sticky Notes
Sticky notes are Fabric Groups:

Rect background
+
Editable IText

Support:
* preset colors
* dynamic height
* double click to edit

Properties Panel
Right collapsible panel.
Sections:
Transform
Rotate Flip Position X/Y
Style
Fill color Stroke color Stroke width Opacity
Object Controls
Lock / Unlock Delete Duplicate

Grid System
Optional grid overlay.
Grid sizes:

20px
40px
80px

Enable snap to grid.

MiniMap
Add a minimap navigation panel.
Shows:
* entire canvas
* viewport rectangle
* drag viewport to navigate
Position: bottom-right.

Export System
Allow exporting as:
PNG JPEG SVG PDF JSON
Export options:
* background toggle
* quality slider
* custom size

Save System
Use project-scoped storage.
Key:

tech-tribune-canvas-projects

Project format:

id
name
canvas JSON
thumbnail
createdAt
updatedAt

Max stored projects:

50

If backend API exists, support saving to server.
Fallback to localStorage.

Undo / Redo
Maintain history stack.
Max history:

50 states

Use Fabric JSON serialization.

AI Features
AI Text Generator
User enters prompt.
Tone options:
Professional Casual Concise Detailed
Output is inserted into a sticky note.
Fallback to template generation if no API key exists.

Templates
Allow users to save objects as templates.
Templates stored in:

localStorage

Users can insert templates anywhere on canvas.

Autosave
Autosave every:

30 seconds

Recover unsaved work if browser crashes.

Keyboard Shortcuts

V select
H hand
R rectangle
C circle
L line
A arrow
S star
T text
N sticky note
B brush
X eraser
G AI generate

Delete delete object

Ctrl Z undo
Ctrl Y redo
Ctrl Scroll zoom


UI Design
Canvas Studio must follow the existing Tech Tribune design system.
Do NOT redefine:
* Tailwind theme
* typography
* spacing scale
* colors
Floating UI elements should match the platform style.

Logging
Create Logger utility.
Levels:

DEBUG
INFO
WARN
ERROR

Max logs stored:

1000

Console output only in development.

Error Handling
Wrap Canvas Studio module with an error boundary.
Use toast notifications for:
* errors
* saves
* exports
* tool changes

Safety Limits

max objects: 2000
max image size: 10MB
undo history: 50


Future Ready Architecture
Emit canvas events:

objectAdded
objectUpdated
objectRemoved
viewportChanged

These will allow future real-time collaboration.

Implementation Instructions
Build this module step-by-step.
1. Create base Fabric canvas system
2. Implement navigation (zoom + pan)
3. Implement tools
4. Implement properties panel
5. Implement snapping & layers
6. Implement export and save
7. Add AI tools
Do not generate everything in a single file.
Focus on clean architecture, performance, and modularity.