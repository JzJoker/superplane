import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { MermaidWidget } from "@/components/AgentSidebar/widgets/MermaidWidget";
import { NodeChipFromLink } from "@/components/AgentSidebar/widgets/NodeChip";

const VIEWER_CLASSES =
  "max-w-none text-sm text-slate-800 " +
  "[&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1:first-child]:mt-0 " +
  "[&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:leading-tight [&_h3:first-child]:mt-0 " +
  "[&_h4]:mb-1 [&_h4]:mt-3 [&_h4]:text-base [&_h4]:font-medium [&_h4]:leading-tight [&_h4:first-child]:mt-0 " +
  "[&_h5]:mb-1 [&_h5]:mt-2 [&_h5]:text-sm [&_h5]:font-medium [&_h5:first-child]:mt-0 " +
  "[&_h6]:mb-1 [&_h6]:mt-2 [&_h6]:text-sm [&_h6]:font-medium [&_h6]:text-slate-600 [&_h6:first-child]:mt-0 " +
  "[&_p]:mb-3 [&_p]:leading-relaxed " +
  "[&_strong]:font-semibold [&_b]:font-semibold " +
  "[&_em]:italic [&_i]:italic " +
  "[&_hr]:my-6 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-slate-200 " +
  "[&_ol]:mb-3 [&_ol]:ml-6 [&_ol]:list-decimal " +
  "[&_ul]:mb-3 [&_ul]:ml-6 [&_ul]:list-disc [&_li]:mb-1 " +
  "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_blockquote]:text-slate-600 " +
  "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono " +
  "[&_pre]:my-3 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-4 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-current " +
  "[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded " +
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm " +
  "[&_thead]:bg-slate-50 " +
  "[&_th]:border [&_th]:border-slate-200 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 " +
  "[&_tbody_tr:nth-child(even)]:bg-slate-50/60 " +
  "[&_details]:my-3 [&_details]:rounded-md [&_details]:border [&_details]:border-slate-200 [&_details]:bg-slate-50/60 [&_details]:p-3 " +
  "[&_details>summary]:cursor-pointer [&_details>summary]:select-none [&_details>summary]:font-semibold";

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "details", "summary"],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
  },
  // Allow node: links through so the custom `a` renderer can convert them to chips
  protocols: {
    ...(defaultSchema.protocols ?? {}),
    href: [...(defaultSchema.protocols?.href ?? ["http", "https", "mailto"]), "node"],
  },
};

function isNodeLink(url: string): boolean {
  return url.startsWith("node:");
}

interface MarkdownCodeProps {
  className?: string;
  children?: ReactNode;
}

function MarkdownCodeBlock({ className, children }: MarkdownCodeProps) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match?.[1];
  const code = String(children).replace(/\n$/, "");
  const isBlock = className !== undefined; // fenced code block has a className; inline code does not

  if (language === "mermaid") {
    return <MermaidWidget content={code} />;
  }

  if (isBlock) {
    // Fenced code block: render pre > code ourselves so the `pre` override
    // can safely strip the wrapper for the mermaid case without affecting
    // normal code blocks.
    return (
      <pre>
        <code className={className}>{children}</code>
      </pre>
    );
  }

  return <code className={className}>{children}</code>;
}

interface MarkdownViewerProps {
  content: string;
  className?: string;
  canvasId?: string;
  organizationId?: string;
}

/**
 * Renders a markdown file as fully formatted HTML in view mode.
 * Supports mermaid diagrams, node-mention chips, tables, code blocks,
 * images, blockquotes, and all standard GFM elements.
 */
export function MarkdownViewer({ content, className, canvasId, organizationId }: MarkdownViewerProps) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return null;

  return (
    <div className={cn(VIEWER_CLASSES, className)} data-testid="markdown-viewer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
        urlTransform={(url) => (isNodeLink(url) ? url : defaultUrlTransform(url))}
        components={{
          code: MarkdownCodeBlock,
          // Strip the outer <pre> so MarkdownCodeBlock can decide whether to
          // wrap with <pre> (non-mermaid) or render a diagram widget directly.
          pre: ({ children }) => <>{children}</>,
          a: ({ children, href }: ComponentProps<"a">) => {
            const nodeMatch = href?.match(/^node:(.+)$/);
            if (nodeMatch && canvasId && organizationId) {
              const nodeId = nodeMatch[1];
              const label = typeof children === "string" ? children : undefined;
              return (
                <NodeChipFromLink
                  nodeId={nodeId}
                  rawLabel={label}
                  canvasId={canvasId}
                  organizationId={organizationId}
                />
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          table: ({ children, ...props }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
