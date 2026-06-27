/**
 * NodeMentionChip – a lightweight inline chip for @node-name tokens that
 * appear in markdown file content.  Unlike the full NodeChip used in the
 * agent sidebar it does not require a canvas / organization context and does
 * not navigate on click; it simply renders a styled pill that identifies the
 * mentioned node.
 */
export function NodeMentionChip({ name }: { name: string }) {
  return (
    <span
      data-testid="node-mention-chip"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 align-middle whitespace-nowrap"
    >
      <span className="size-2 rounded-full bg-blue-500 shrink-0" />@{name}
    </span>
  );
}
