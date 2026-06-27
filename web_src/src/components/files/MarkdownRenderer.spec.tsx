import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownRenderer } from "./MarkdownRenderer";

// Stub Monaco – not needed for markdown rendering assertions
vi.mock("@monaco-editor/react", () => ({
  default: ({ value }: { value?: string }) => <pre data-testid="monaco-stub">{value}</pre>,
}));

// Stub mermaid – JSDOM can't render SVG diagrams
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg data-testid='mermaid-svg'></svg>" }),
  },
}));

describe("MarkdownRenderer", () => {
  it("renders with the markdown-preview test id by default", () => {
    render(<MarkdownRenderer content="# Hello" />);
    expect(screen.getByTestId("markdown-preview")).toBeTruthy();
  });

  it("renders headings as heading elements (H1)", async () => {
    render(<MarkdownRenderer content={"# Heading One\n\n## Heading Two\n\n### Heading Three"} />);
    expect(screen.getByRole("heading", { level: 1, name: "Heading One" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Heading Two" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Heading Three" })).toBeTruthy();
  });

  it("satisfies the smoke assertion selector – h1/h2/h3 inside markdown-preview", async () => {
    render(<MarkdownRenderer content={"# H1\n\n## H2\n\n### H3"} />);
    const preview = screen.getByTestId("markdown-preview");
    expect(preview.querySelector("h1")).toBeTruthy();
    expect(preview.querySelector("h2")).toBeTruthy();
    expect(preview.querySelector("h3")).toBeTruthy();
  });

  it("renders bold and italic text", () => {
    render(<MarkdownRenderer content="**bold** and *italic*" />);
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
  });

  it("renders unordered lists as <ul>", () => {
    const { container } = render(<MarkdownRenderer content={"- item one\n- item two"} />);
    expect(container.querySelector("ul")).toBeTruthy();
    expect(container.querySelectorAll("li").length).toBe(2);
  });

  it("renders ordered lists as <ol>", () => {
    const { container } = render(<MarkdownRenderer content={"1. first\n2. second"} />);
    expect(container.querySelector("ol")).toBeTruthy();
  });

  it("renders a GFM table with th and td elements", () => {
    const md = ["| Name | Age |", "| ---- | --- |", "| Alice | 30 |"].join("\n");
    const { container } = render(<MarkdownRenderer content={md} />);
    expect(container.querySelector("table")).toBeTruthy();
    expect(container.querySelector("th")).toBeTruthy();
    expect(container.querySelector("td")).toBeTruthy();
  });

  it("renders a blockquote", () => {
    const { container } = render(<MarkdownRenderer content="> a quote" />);
    expect(container.querySelector("blockquote")).toBeTruthy();
  });

  it("renders an image tag for markdown image syntax", () => {
    const { container } = render(<MarkdownRenderer content="![alt text](https://example.com/img.png)" />);
    const img = container.querySelector("img");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("https://example.com/img.png");
  });

  it("renders a fenced code block (non-mermaid) via Monaco stub", () => {
    const md = ["```javascript", "const x = 1;", "```"].join("\n");
    render(<MarkdownRenderer content={md} />);
    // The CodeBlockWidget renders Monaco which is stubbed as a <pre>
    expect(screen.getByTestId("monaco-stub")).toBeTruthy();
  });

  it("renders inline code as <code> element", () => {
    const { container } = render(<MarkdownRenderer content="Use `npm install` to install" />);
    expect(container.querySelector("code")).toBeTruthy();
  });

  it("renders @node-name tokens as NodeMentionChip", () => {
    render(<MarkdownRenderer content="Connect to @my-node and @other-node for data." />);
    const chips = screen.getAllByTestId("node-mention-chip");
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain("@my-node");
    expect(chips[1].textContent).toContain("@other-node");
  });

  it("accepts a custom data-testid", () => {
    render(<MarkdownRenderer content="# Hi" data-testid="custom-preview" />);
    expect(screen.getByTestId("custom-preview")).toBeTruthy();
    expect(screen.queryByTestId("markdown-preview")).toBeNull();
  });

  it("returns an empty container for blank content", () => {
    render(<MarkdownRenderer content="   " />);
    const preview = screen.getByTestId("markdown-preview");
    // Should not crash; content may be empty
    expect(preview).toBeTruthy();
  });
});
