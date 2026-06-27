import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownViewer } from "./MarkdownViewer";

// MermaidWidget does async rendering; stub it so tests are synchronous and
// deterministic. The stub renders an <svg> element so the smoke-assertion
// selector `[data-testid='markdown-viewer'] svg` still passes.
vi.mock("@/components/AgentSidebar/widgets/MermaidWidget", () => ({
  MermaidWidget: ({ content }: { content: string }) => <svg data-testid="mermaid-stub" aria-label={content} />,
}));

// NodeChip requires a full React-Router + React-Query + canvas API tree.
// Stub it out so we can verify node-link chips render without that overhead.
vi.mock("@/components/AgentSidebar/widgets/NodeChip", () => ({
  NodeChipFromLink: ({ nodeId, rawLabel }: { nodeId: string; rawLabel?: string }) => (
    <span data-testid="node-chip" data-node-id={nodeId}>
      {rawLabel ?? nodeId}
    </span>
  ),
}));

describe("MarkdownViewer", () => {
  it("renders with data-testid='markdown-viewer'", () => {
    render(<MarkdownViewer content="# Hello" />);
    expect(screen.getByTestId("markdown-viewer")).toBeInTheDocument();
  });

  it("renders headings with correct hierarchy (h1–h6)", () => {
    render(
      <MarkdownViewer
        content={[
          "# H1 heading",
          "## H2 heading",
          "### H3 heading",
          "#### H4 heading",
          "##### H5 heading",
          "###### H6 heading",
        ].join("\n\n")}
      />,
    );

    const viewer = screen.getByTestId("markdown-viewer");
    expect(within(viewer).getByRole("heading", { level: 1, name: "H1 heading" })).toBeInTheDocument();
    expect(within(viewer).getByRole("heading", { level: 2, name: "H2 heading" })).toBeInTheDocument();
    expect(within(viewer).getByRole("heading", { level: 3, name: "H3 heading" })).toBeInTheDocument();
    expect(within(viewer).getByRole("heading", { level: 4, name: "H4 heading" })).toBeInTheDocument();
    expect(within(viewer).getByRole("heading", { level: 5, name: "H5 heading" })).toBeInTheDocument();
    expect(within(viewer).getByRole("heading", { level: 6, name: "H6 heading" })).toBeInTheDocument();
  });

  it("renders bold, italic, and inline code", () => {
    render(<MarkdownViewer content="**bold** _italic_ `code`" />);
    const viewer = screen.getByTestId("markdown-viewer");
    expect(within(viewer).getByText("bold").tagName).toBe("STRONG");
    expect(within(viewer).getByText("italic").tagName).toBe("EM");
    expect(within(viewer).getByText("code").tagName).toBe("CODE");
  });

  it("renders ordered and unordered lists", () => {
    render(<MarkdownViewer content={["- apple", "- banana", "", "1. first", "2. second"].join("\n")} />);
    const viewer = screen.getByTestId("markdown-viewer");
    expect(within(viewer).getByText("apple")).toBeInTheDocument();
    expect(within(viewer).getByText("first")).toBeInTheDocument();
    // ul and ol should be present
    expect(viewer.querySelector("ul")).toBeInTheDocument();
    expect(viewer.querySelector("ol")).toBeInTheDocument();
  });

  it("renders a GFM table as an HTML table", () => {
    render(
      <MarkdownViewer content={["| Name | Age |", "| --- | --- |", "| Alice | 30 |", "| Bob | 25 |"].join("\n")} />,
    );
    const viewer = screen.getByTestId("markdown-viewer");
    expect(viewer.querySelector("table")).toBeInTheDocument();
    expect(within(viewer).getByText("Name")).toBeInTheDocument();
    expect(within(viewer).getByText("Alice")).toBeInTheDocument();
  });

  it("renders a blockquote", () => {
    render(<MarkdownViewer content="> This is a quote" />);
    const viewer = screen.getByTestId("markdown-viewer");
    expect(viewer.querySelector("blockquote")).toBeInTheDocument();
    expect(within(viewer).getByText("This is a quote")).toBeInTheDocument();
  });

  it("renders images as <img> elements", () => {
    render(<MarkdownViewer content="![alt text](https://example.com/image.png)" />);
    const viewer = screen.getByTestId("markdown-viewer");
    const img = viewer.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/image.png");
    expect(img).toHaveAttribute("alt", "alt text");
  });

  it("renders a fenced mermaid code block as a MermaidWidget (SVG)", () => {
    const diagram = "graph TD\n  A --> B";
    render(<MarkdownViewer content={"```mermaid\n" + diagram + "\n```"} />);
    const viewer = screen.getByTestId("markdown-viewer");
    // The stub renders an <svg> element
    expect(viewer.querySelector("svg")).toBeInTheDocument();
    const stub = within(viewer).getByTestId("mermaid-stub");
    expect(stub).toHaveAttribute("aria-label", diagram);
  });

  it("renders non-mermaid code blocks as <code> inside <pre>", () => {
    render(<MarkdownViewer content={"```python\nprint('hello')\n```"} />);
    const viewer = screen.getByTestId("markdown-viewer");
    expect(viewer.querySelector("pre")).toBeInTheDocument();
    expect(viewer.querySelector("code")).toBeInTheDocument();
  });

  it("renders node:// links as NodeChipFromLink chips when canvasId and organizationId are provided", () => {
    render(
      <MarkdownViewer
        content="See [my-node](node:node-abc-123) for details."
        canvasId="canvas-1"
        organizationId="org-1"
      />,
    );
    const viewer = screen.getByTestId("markdown-viewer");
    const chip = within(viewer).getByTestId("node-chip");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute("data-node-id", "node-abc-123");
    expect(chip).toHaveTextContent("my-node");
  });

  it("renders node:// links as regular anchor tags when canvasId/organizationId are not provided", () => {
    render(<MarkdownViewer content="See [my-node](node:node-abc-123) for details." />);
    const viewer = screen.getByTestId("markdown-viewer");
    expect(viewer.querySelector("a")).toBeInTheDocument();
    expect(screen.queryByTestId("node-chip")).not.toBeInTheDocument();
  });

  it("returns null for empty or whitespace-only content", () => {
    const { container } = render(<MarkdownViewer content="   " />);
    expect(container.firstChild).toBeNull();
  });

  it("smoke assertion: viewer contains h1, h2, table, and svg elements", () => {
    const content = [
      "# Main Title",
      "## Subtitle",
      "| Col A | Col B |",
      "| --- | --- |",
      "| val1 | val2 |",
      "```mermaid",
      "graph TD",
      "  A --> B",
      "```",
    ].join("\n");

    render(<MarkdownViewer content={content} />);

    const viewer = screen.getByTestId("markdown-viewer");
    expect(viewer.querySelector("h1")).toBeInTheDocument();
    expect(viewer.querySelector("h2")).toBeInTheDocument();
    expect(viewer.querySelector("table")).toBeInTheDocument();
    expect(viewer.querySelector("svg")).toBeInTheDocument();
  });
});
