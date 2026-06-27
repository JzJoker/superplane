import type { ComponentProps, ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import { MarkdownCode } from "@/components/AgentSidebar/widgets/MarkdownCode";
import { MermaidWidget } from "@/components/AgentSidebar/widgets/MermaidWidget";
import { NodeChipFromLink } from "@/components/AgentSidebar/widgets/NodeChip";

const VIEWER_CLASSES =
  "max-w-none text-sm text-slate-800 " +
  "[&_h1]:mb-1.5 [&_h1]:mt-1 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1:first-child]:mt-0 " +
  "[&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:leading-tight [&_h2:first-child]:mt-0 " +
  "[&_h3]:mb-0.5 [&_h3]:mt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:leading-tight [&_h3:first-child]:mt-0 " +
  "[&_h4]:mb-0.5 [&_h4]:mt-2 [&_h4]:text-sm [&_h4]:font-medium [&_h4]:leading-tight [&_h4:first-child]:mt-0 " +
  "[&_p]:mb-2 [&_p]:leading-relaxed " +
  "[&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic " +
  "[&_hr]:my-5 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-slate-200 " +
  "[&_ol]:mb-2 [&_ol]:ml-5 [&_ol]:list-decimal " +
  "[&_ul]:mb-2 [&_ul]:ml-5 [&_ul]:list-disc [&_li]:mb-1 " +
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 " +
  "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs " +
  "[&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-slate-100 [&_pre]:p-2 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-current " +
  "[&_img]:max-w-full [&_img]:rounded " +
  "[&_table]:my-2 [&_table]:text-xs [&_table]:border-collapse " +
  "[&_th]:border [&_th]:border-slate-200 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-slate-100 [&_td]:px-2 [&_td]:py-1 " +
  "[&_details]:my-3 [&_details]:rounded-md [&_details]:border [&_details]:border-slate-200 [&_details]:bg-slate-50/60 [&_details]:p-3 " +
  "[&_details>summary]:flex [&_details>summary]:items-center [&_details>summary]:cursor-pointer [&_details>summary]:select-none [&_details>summary]:text-sm [&_details>summary]:font-semibold [&_details>summary]:text-slate-900 [&_details>summary]:list-none [&_details>summary]:marker:hidden [&_details>summary]:hover:text-sky-700 ";

const MARKDOWN_SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "details", "summary"],
  attributes: {
    ...(defaultSchema.attributes ?? {}),
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
  },
  protocols: {
    ...(defaultSchema.protocols ?? {}),
    // Allow node: links so custom chips can be rendered via the `a` component override.
    href: [...(defaultSchema.protocols?.href ?? []), "node"],
  },
};

interface MarkdownViewerProps {
  content: string;
  className?: string;
  canvasId?: string;
  organizationId?: string;
  "data-testid"?: string;
}

/**
 * Renders a markdown file in view mode with full formatting:
 * - Headings, bold/italic, lists, tables, images, links
 * - Syntax-highlighted code blocks (via Monaco)
 * - Mermaid.js diagram blocks
 * - Node mention chips (when canvasId + organizationId are provided)
 */
export function MarkdownViewer({
  content,
  className,
  canvasId,
  organizationId,
  "data-testid": dataTestId = "markdown-viewer",
}: MarkdownViewerProps) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return null;

  return (
    <div className={cn("markdown-body", VIEWER_CLASSES, className)} data-testid={dataTestId}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, MARKDOWN_SANITIZE_SCHEMA]]}
        urlTransform={(url) => (isSpecialLink(url) ? url : defaultUrlTransform(url))}
        components={{
          code: MarkdownCodeWithMermaid,
          pre: ({ children }) => <>{children}</>,
          a: ({ href, children }) => (
            <MarkdownLink href={href} canvasId={canvasId} organizationId={organizationId}>
              {children}
            </MarkdownLink>
          ),
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

function MarkdownCodeWithMermaid({
  className,
  children,
  ...props
}: ComponentProps<"code"> & { children?: ReactNode }) {
  const match = /language-(\w+)/.exec(className || "");
  const code = String(children).replace(/\n$/, "");

  if (match?.[1] === "mermaid") {
    return <MermaidWidget content={code} />;
  }

  return (
    <MarkdownCode className={className} {...props}>
      {children}
    </MarkdownCode>
  );
}

function MarkdownLink({
  href,
  children,
  canvasId,
  organizationId,
}: ComponentProps<"a"> & { canvasId?: string; organizationId?: string }) {
  if (canvasId && organizationId) {
    const nodeMatch = href?.match(/^node:(.+)$/);
    if (nodeMatch) {
      const label = typeof children === "string" ? children : undefined;
      return (
        <NodeChipFromLink
          nodeId={nodeMatch[1]}
          rawLabel={label}
          canvasId={canvasId}
          organizationId={organizationId}
        />
      );
    }
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function isSpecialLink(url: string): boolean {
  return url.startsWith("node:");
}
