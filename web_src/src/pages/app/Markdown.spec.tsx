import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownContent } from "./Markdown";

// Stub Monaco editor (used inside CodeBlockWidget, pulled in transitively).
vi.mock("@monaco-editor/react", () => ({
  default: ({ value }: { value?: string }) => <pre data-testid="monaco-stub">{value}</pre>,
  Editor: ({ value }: { value?: string }) => <pre data-testid="monaco-stub">{value}</pre>,
}));

// Stub mermaid so diagram rendering works synchronously in jsdom.
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>',
    }),
  },
}));

// Dialog / Radix portals need a document.body to mount into; jsdom provides that.
// ResizeObserver is already stubbed in test/setup.ts.

describe("MarkdownContent", () => {
  it("wraps output in .markdown-viewer for the smoke-assertion selector", () => {
    const { container } = render(<MarkdownContent content="# Hello" />);
    expect(container.querySelector(".markdown-viewer")).not.toBeNull();
  });

  it("renders h1 elements inside .markdown-viewer", () => {
    const { container } = render(<MarkdownContent content="# Heading One" />);
    const h1 = container.querySelector(".markdown-viewer h1");
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe("Heading One");
  });

  it("renders h2 elements inside .markdown-viewer", () => {
    const { container } = render(<MarkdownContent content="## Heading Two" />);
    const h2 = container.querySelector(".markdown-viewer h2");
    expect(h2).not.toBeNull();
    expect(h2?.textContent).toBe("Heading Two");
  });

  it("renders a table inside .markdown-viewer", () => {
    const md = ["| A | B |", "|---|---|", "| 1 | 2 |"].join("\n");
    const { container } = render(<MarkdownContent content={md} />);
    expect(container.querySelector(".markdown-viewer table")).not.toBeNull();
  });

  it("renders bold and italic text", () => {
    const { container } = render(<MarkdownContent content="**bold** and _italic_" />);
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
  });

  it("renders blockquote elements", () => {
    const { container } = render(<MarkdownContent content="> A quote" />);
    expect(container.querySelector("blockquote")).not.toBeNull();
  });

  it("renders ordered and unordered lists", () => {
    const { container } = render(<MarkdownContent content={"- item\n\n1. first"} />);
    expect(container.querySelector("ul")).not.toBeNull();
    expect(container.querySelector("ol")).not.toBeNull();
  });

  it("renders inline code with monospace styling", () => {
    const { container } = render(<MarkdownContent content="use `code` here" />);
    expect(container.querySelector("code")).not.toBeNull();
  });

  it("renders fenced code blocks with a pre element", () => {
    const md = "```js\nconsole.log('hi');\n```";
    const { container } = render(<MarkdownContent content={md} />);
    expect(container.querySelector("pre")).not.toBeNull();
    expect(container.querySelector("pre code")?.textContent).toContain("console.log");
  });

  it("renders mermaid fenced blocks as .mermaid svg inside .markdown-viewer", async () => {
    const md = "```mermaid\ngraph TD\n  A --> B\n```";
    const { container } = render(<MarkdownContent content={md} />);

    // mermaid.render is async; wait for SVG to appear.
    await waitFor(() => {
      expect(container.querySelector(".markdown-viewer .mermaid svg")).not.toBeNull();
    });
  });

  it("returns null for whitespace-only content", () => {
    const { container } = render(<MarkdownContent content="   " />);
    expect(container.firstChild).toBeNull();
  });
});
