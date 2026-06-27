import { lazy, Suspense } from "react";

import { getFileMonacoLanguage } from "./lib/monaco-language";
import { MarkdownViewer } from "./MarkdownViewer";

const FileMonacoEditor = lazy(() =>
  import("./FileMonacoEditor").then((module) => ({ default: module.FileMonacoEditor })),
);

export function FileEditor({
  path,
  content,
  deleted,
  language,
  loading,
  errorMessage,
  disabled,
  canvasId,
  organizationId,
  onChange,
}: {
  path: string | null;
  content: string;
  deleted: boolean;
  language?: string;
  loading: boolean;
  errorMessage?: string;
  disabled: boolean;
  canvasId?: string;
  organizationId?: string;
  onChange: (value: string) => void;
}) {
  if (!path) {
    return <div className="min-h-0 flex-1 bg-white" />;
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-500">Loading file...</div>
    );
  }

  if (errorMessage) {
    return <div className="p-4 text-sm text-red-600">{errorMessage}</div>;
  }

  if (deleted) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-500">
        File marked for deletion
      </div>
    );
  }

  const resolvedLanguage = language ?? getFileMonacoLanguage(path);
  const isMarkdown = resolvedLanguage === "markdown";

  if (disabled && isMarkdown) {
    return (
      <div className="min-h-0 flex-1 overflow-auto bg-white p-6">
        <MarkdownViewer content={content} canvasId={canvasId} organizationId={organizationId} />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-500">Loading editor...</div>
      }
    >
      <FileMonacoEditor path={path} content={content} language={language} readOnly={disabled} onChange={onChange} />
    </Suspense>
  );
}
