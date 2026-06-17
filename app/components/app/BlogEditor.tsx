// app/components/app/BlogEditor.tsx
"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useState, useCallback } from "react";

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const addImage = useCallback(async () => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/blog/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) editor.chain().focus().setImage({ src: data.url }).run();
    };
    input.click();
  }, [editor]);

  if (!editor) return null;
  const btn = "rounded px-2 py-1 text-xs hover:bg-black/5";
  return (
    <div className="mb-2 flex flex-wrap gap-1 border-b border-black/10 pb-2">
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        Quote
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          const url = window.prompt("URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
      >
        Link
      </button>
      <button type="button" className={btn} onClick={addImage}>
        Image
      </button>
    </div>
  );
}

/** One TipTap surface, syncing HTML to a hidden input named `name`. */
export function SingleEditor({
  name,
  initialHTML,
}: {
  name: string;
  initialHTML: string;
}) {
  const [html, setHtml] = useState(initialHTML || "");
  const editor = useEditor({
    extensions: [StarterKit, Image, Link.configure({ openOnClick: false })],
    content: initialHTML || "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });
  return (
    <div className="rounded-lg border border-black/10 p-3">
      <Toolbar editor={editor} />
      {editor && (
        <EditorContent
          editor={editor}
          className="prose prose-sm min-h-[200px] max-w-none focus:outline-none"
        />
      )}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
