/**
 * MarkdownRenderer – rich markdown preview for the file viewer.
 *
 * Features over the base <MarkdownContent> component:
 *  - Fenced code blocks rendered with Monaco syntax highlighting
 *  - Fenced `mermaid` blocks rendered as SVG diagrams
 *  - `@node-name` tokens rendered as inline node-mention chips
 */

import { memo, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { cn } from "@/lib/utils";
import { MermaidWidget } from "@/components/AgentSidebar/widgets/MermaidWidget";
import { MarkdownCode } from "@/components/AgentSidebar/widgets/MarkdownCode";
import { NodeMentionChip } from "./NodeMentionChip";

// ---------------------------------------------------------------------------
// Tailwind prose styles (mirrors the shared MARKDOWN_CONTENT_CLASSES)
// ---------------------------------------------------------------------------
const MARKDOWN_CLASSES =
  "max-w-none text-sm text-slate-800 " +
  "[&_h1]:mb-1.5 [&_h1]:mt-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:leading-tight [&_h1:first-child]:mt-0 " +
  "[&_h2]:mb-1 [&_h2]:mt-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:leading-tight [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-0.5 [&_h3]:mt-1 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:leading-tight [&_h3:first-child]:mt-0 " +
  "[&_h4]:mb-0.5 [&_h4]:mt-1 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:leading-tight [&_h4:first-child]:mt-0 " +
  "[&_p]:mb-2 [&_p]:leading-relaxed " +
  "[&_ol]:mb-2 [&_ol]:ml-5 [&_ol]:list-decimal " +
  "[&_ul]:mb-2 [&_ul]:ml-5 [&_ul]:list-disc [&_li]:mb-1 " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 " +
  "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs " +
  "[&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-slate-100 [&_pre]:p-2 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-current " +
  "[&_table]:my-2 [&_table]:text-xs [&_table]:border-collapse " +
  "[&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1 " +
  "[&_td]:border [&_td]:border-slate-100 [&_td]:px-2 [&_td]:py-1 " +
  "[&_img]:my-2 [&_img]:max-w-full [&_img]:rounded";

// ---------------------------------------------------------------------------
// Sanitize schema – allow <details>/<summary> and data-* attributes
// ---------------------------------------------------------------------------
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "details", "summary"],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
  },
};

// ---------------------------------------------------------------------------
// Code renderer – dispatches mermaid vs. syntax-highlighted blocks
// ---------------------------------------------------------------------------
function CodeRenderer({ className, children, ...props }: ComponentProps<"code"> & { children?: ReactNode }) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match?.[1];
  const code = String(children).replace(/\n$/, "");

  if (language === "mermaid") {
    return <MermaidWidget content={code} />;
  }

  // Delegate to the shared MarkdownCode which handles Monaco highlighting
  return (
    <MarkdownCode className={className} {...props}>
      {children}
    </MarkdownCode>
  );
}

// ---------------------------------------------------------------------------
// Text renderer – converts @node-name tokens to NodeMentionChip
// ---------------------------------------------------------------------------
const NODE_MENTION_RE = /(@[\w-]+)/g;

function renderTextWithMentions(text: string): ReactNode {
  const parts = text.split(NODE_MENTION_RE);
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, idx) => {
        if (NODE_MENTION_RE.test(part)) {
          const name = part.slice(1); // strip leading @
          return <NodeMentionChip key={idx} name={name} />;
        }
        // Reset lastIndex after test()
        NODE_MENTION_RE.lastIndex = 0;
        return part;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface MarkdownRendererProps {
  content: string;
  className?: string;
  "data-testid"?: string;
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  "data-testid": dataTestId = "markdown-preview",
}: MarkdownRendererProps) {
  const normalized = content.replace(/\r\n/g, "\n");

  return (
    <div className={cn(MARKDOWN_CLASSES, className)} data-testid={dataTestId}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
        components={{
          code: CodeRenderer,
          pre: ({ children }) => <>{children}</>,
          table: ({ children, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table {...props}>{children}</table>
            </div>
          ),
          // Render @mentions inside paragraphs
          p: ({ children }) => <p>{processChildren(children)}</p>,
          li: ({ children }) => <li>{processChildren(children)}</li>,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
});

/**
 * Walks over a node's children and replaces plain string nodes that contain
 * @mention patterns with the NodeMentionChip component.
 */
function processChildren(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    return renderTextWithMentions(children);
  }
  if (Array.isArray(children)) {
    return children.map((child, idx) => {
      if (typeof child === "string") {
        return <span key={idx}>{renderTextWithMentions(child)}</span>;
      }
      return child;
    });
  }
  return children;
}
