import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useCollabStore, type CollabUser } from '../../lib/collab-store';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  compact?: boolean;
  sectionId?: string;
  fieldName?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  compact,
  sectionId,
  fieldName,
}: RichTextEditorProps) {
  const remoteUsers = useCollabStore((s) => s.remoteUsers);
  const setEditingSection = useCollabStore((s) => s.setEditingSection);

  // Guard: skip useEffect re-sync when the change came from the editor itself
  const isInternalUpdate = useRef(false);

  // Find users editing this section + field
  const editingUsers = useMemo(() => {
    if (!sectionId) return [];
    return remoteUsers.filter(
      (u) => u.editingSectionId === sectionId && (!fieldName || u.editingField === fieldName),
    );
  }, [remoteUsers, sectionId, fieldName]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({ placeholder }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      onChange(editor.getHTML());
    },
    onFocus: () => {
      if (sectionId) {
        setEditingSection(sectionId, fieldName || null);
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[60px] px-3 py-2',
      },
    },
  });

  // Sync external content changes (only if truly external, not from our own onUpdate)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    // Capture the current selection before the prompt steals focus
    const { from, to } = editor.state.selection;
    const existingHref = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', existingHref || 'https://');
    if (url === null) {
      // User cancelled — restore focus without changes
      editor.chain().focus().setTextSelection({ from, to }).run();
      return;
    }
    if (url === '') {
      // Empty string — remove the link
      editor.chain().focus().setTextSelection({ from, to }).unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .setTextSelection({ from, to })
      .setLink({ href: url })
      .run();
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({
    active,
    onClick,
    children,
    title,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {children}
    </button>
  );

  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div className="relative">
      {/* Remote user cursor indicators */}
      {editingUsers.length > 0 && (
        <div className="absolute -top-1 right-1 z-10 flex items-center gap-1">
          {editingUsers.map((user) => (
            <CursorIndicator key={user.userId} user={user} />
          ))}
        </div>
      )}

      <div
        className={`border rounded-lg overflow-hidden bg-background transition-colors ${
          editingUsers.length > 0
            ? 'border-opacity-100'
            : 'border-border'
        }`}
        style={
          editingUsers.length > 0
            ? { borderColor: editingUsers[0].color, borderWidth: '2px' }
            : undefined
        }
      >
        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 flex-wrap">
          <ToolBtn
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold"
          >
            <Bold className={iconSize} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic"
          >
            <Italic className={iconSize} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="Underline"
          >
            <UnderlineIcon className={iconSize} />
          </ToolBtn>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolBtn
            active={editor.isActive('link')}
            onClick={addLink}
            title="Link"
          >
            <LinkIcon className={iconSize} />
          </ToolBtn>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolBtn
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List className={iconSize} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered className={iconSize} />
          </ToolBtn>

          <div className="w-px h-4 bg-border mx-1" />

          <ToolBtn
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="Align Left"
          >
            <AlignLeft className={iconSize} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="Align Center"
          >
            <AlignCenter className={iconSize} />
          </ToolBtn>
          <ToolBtn
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="Align Right"
          >
            <AlignRight className={iconSize} />
          </ToolBtn>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

/** Small cursor badge showing a remote user's name */
function CursorIndicator({ user }: { user: CollabUser }) {
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-white shadow-sm animate-in fade-in duration-300"
      style={{ backgroundColor: user.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
      {user.name.split(' ')[0]}
    </div>
  );
}