import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BoldOutlined, ItalicOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { useEffect } from 'react';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

function toEditorContent(text: string): string {
  if (!text) return '';
  if (/<[a-z]/i.test(text)) return text;
  return text.split('\n').map((line) => `<p>${line || '<br>'}</p>`).join('');
}

export function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: toEditorContent(value),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const current = editor.getHTML();
      const next = toEditorContent(value);
      if (current !== next) editor.commands.setContent(next, false as never);
    }
  }, [value, editor]);

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', gap: 4 }}>
        <Space size={4}>
          <Button
            size="small"
            type={editor?.isActive('bold') ? 'primary' : 'default'}
            icon={<BoldOutlined />}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
          />
          <Button
            size="small"
            type={editor?.isActive('italic') ? 'primary' : 'default'}
            icon={<ItalicOutlined />}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
          />
          <div style={{ width: 1, height: 20, background: '#e8e8e8', margin: '0 4px' }} />
          <Button
            size="small"
            type={editor?.isActive('paragraph') ? 'primary' : 'default'}
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setParagraph().run(); }}
            style={{ fontSize: 11, padding: '0 6px' }}
          >
            §
          </Button>
        </Space>
      </div>
      <EditorContent
        editor={editor}
        style={{ padding: '8px 12px', minHeight: 140, cursor: 'text' }}
      />
    </div>
  );
}
