import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { MarkdownViewer } from "./MarkdownViewer";

// Stub Monaco — heavy and irrelevant to markdown rendering assertions.
vi.mock("@monaco-editor/react", () => ({
  default: ({ value }: { value?: string }) => <pre data-testid="monaco-stub">{value}</pre>,
  Editor: ({ value }: { value?: string }) => <pre data-testid="monaco-stub">{value}</pre>,
}));

// Stub mermaid — diagram rendering is async and browser-specific.
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg><text>diagram</text></svg>" }),
  },
}));

// Stub useCanvasData to avoid the generated api-client import.
vi.mock("@/hooks/useCanvasData", () => ({
  useCanvas: () => ({ data: undefined }),
}));

describe("MarkdownViewer", () => {
  it("renders headings as HTML heading elements", () => {
    render(<MarkdownViewer content={"# Heading One\n\n## Heading Two\n\n### Heading Three"} />);

    const viewer = screen.getByTestId("markdown-viewer");
    expect(viewer.querySelector("h1")).toBeInTheDocument();
    expect(viewer.querySelector("h2")).toBeInTheDocument();
    expect(viewer.querySelector("h3")).toBeInTheDocument();
    expect(viewer.querySelector("h1")?.textContent).toBe("Heading One");
    expect(viewer.querySelector("h2")?.textContent).toBe("Heading Two");
  });

  it("has data-testid='markdown-viewer' on the wrapper", () => {
    render(<MarkdownViewer content="# Hello" />);
    expect(screen.getByTestId("markdown-viewer")).toBeInTheDocument();
  });

  it("has markdown-body CSS class on the wrapper", () => {
    render(<MarkdownViewer content="# Hello" />);
    expect(screen.getByTestId("markdown-viewer")).toHaveClass("markdown-body");
  });

  it("renders bold and italic text", () => {
    render(<MarkdownViewer content="**bold text** and *italic text*" />);

    const viewer = screen.getByTestId("markdown-viewer");
    expect(viewer.querySelector("strong")).toBeInTheDocument();
    expect(viewer.querySelector("em")).toBeInTheDocument();
    expect(viewer.querySelector("strong")?.textContent).toContain("bold text");
    expect(viewer.querySelector("em")?.textContent).toContain("italic text");
  });

  it("renders ordered and unordered lists as proper HTML list elements", () => {
    render(<MarkdownViewer content={"- item one\n- item two\n\n1. first\n2. second"} />);

    const viewer = screen.getByTestId("markdown-viewer");
    expect(viewer.querySelector("ul")).toBeInTheDocument();
    expect(viewer.querySelector("ol")).toBeInTheDocument();
    expect(viewer.querySelectorAll("li")).toHaveLength(4);
  });

  it("renders tables as HTML table elements", () => {
    render(
      <MarkdownViewer
        content={"| Name | Value |\n| --- | --- |\n| alpha | 1 |\n| beta | 2 |"}
      />,
    );

    const viewer = screen.getByTestId("markdown-viewer");
    const table = viewer.querySelector("table");
    expect(table).toBeInTheDocument();
    const headers = table!.querySelectorAll("th");
    expect(headers).toHaveLength(2);
    expect(headers[0]?.textContent).toBe("Name");
    expect(headers[1]?.textContent).toBe("Value");
  });

  it("renders fenced code blocks as syntax-highlighted widgets (not raw text)", () => {
    render(<MarkdownViewer content={"```typescript\nconst x = 1;\n```"} />);

    const viewer = screen.getByTestId("markdown-viewer");
    // CodeBlockWidget renders via Monaco stub — the stub renders a <pre>
    const stub = viewer.querySelector("[data-testid='monaco-stub']");
    expect(stub).toBeInTheDocument();
    expect(stub?.textContent).toContain("const x = 1");
  });

  it("renders links as anchor elements", () => {
    render(<MarkdownViewer content="[example](https://example.com)" />);

    const viewer = screen.getByTestId("markdown-viewer");
    const anchor = viewer.querySelector("a");
    expect(anchor).toBeInTheDocument();
    expect(anchor?.getAttribute("href")).toBe("https://example.com");
  });

  it("renders images as img elements", () => {
    render(<MarkdownViewer content="![alt text](https://example.com/img.png)" />);

    const viewer = screen.getByTestId("markdown-viewer");
    const img = viewer.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute("src")).toBe("https://example.com/img.png");
    expect(img?.getAttribute("alt")).toBe("alt text");
  });

  it("renders node mention chips when canvasId and organizationId are provided", () => {
    render(
      <MemoryRouter>
        <MarkdownViewer
          content="See [my-node](node:node-abc-123def)"
          canvasId="canvas-1"
          organizationId="org-1"
        />
      </MemoryRouter>,
    );

    // NodeChip renders as a button (the label falls back to the nodeId when no canvas data)
    const chip = screen.getByRole("button");
    expect(chip).toBeInTheDocument();
  });

  it("renders node links as plain anchors when canvasId/organizationId are absent", () => {
    render(<MarkdownViewer content="See [my-node](node:node-abc-123def)" />);

    // Without canvas context, falls back to a plain <a>
    const viewer = screen.getByTestId("markdown-viewer");
    const anchor = viewer.querySelector("a");
    expect(anchor).toBeInTheDocument();
    expect(anchor?.textContent).toBe("my-node");
  });

  it("returns null for empty or whitespace-only content", () => {
    const { container } = render(<MarkdownViewer content="   " />);
    expect(container.firstChild).toBeNull();
  });

  it("does not produce horizontal overflow from long lines", () => {
    render(<MarkdownViewer content={"# Title\n\nSome content."} />);

    const viewer = screen.getByTestId("markdown-viewer");
    // max-w-none ensures no fixed width constraints cause overflow
    expect(viewer.className).toContain("max-w-none");
  });
});
