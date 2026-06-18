"use client";

import Editor from "@monaco-editor/react";

type CodeEditorProps = {
  language: string;
  value: string;
};

export default function CodeEditor({ language, value }: CodeEditorProps) {
  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      theme="vs-dark"
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        lineHeight: 22,
        scrollBeyondLastLine: false,
        wordWrap: "on",
        padding: {
          top: 18,
          bottom: 18,
        },
      }}
    />
  );
}
