// SVG state machine: OPEN → IN_PROGRESS ⇄ HELP_NEEDED, IN_PROGRESS → IN_REVIEW → DONE
// viewBox 820×250, node w=130 h=36

const NODES = [
  { id: 'OPEN',        label: 'OPEN',        cx: 75,  cy: 100, color: '#94a3b8' },
  { id: 'IN_PROGRESS', label: 'IN_PROGRESS', cx: 268, cy: 100, color: '#f59e0b' },
  { id: 'HELP_NEEDED', label: 'HELP_NEEDED', cx: 268, cy: 208, color: '#ef4444' },
  { id: 'IN_REVIEW',   label: 'IN_REVIEW',   cx: 468, cy: 100, color: '#3b82f6' },
  { id: 'DONE',        label: 'DONE',        cx: 660, cy: 100, color: '#10b981' },
];

const NW = 130; // node width
const NH = 36;  // node height

// Arrow descriptor: [x1,y1,x2,y2, labelX, labelY, labelAnchor]
const ARROWS = [
  // OPEN → IN_PROGRESS  (claim)
  [140, 100, 203, 100,  171, 91, 'middle', 'claim'],
  // IN_PROGRESS → IN_REVIEW  (review)
  [333, 100, 403, 100,  368, 91, 'middle', 'review'],
  // IN_REVIEW → DONE  (done)
  [533, 100, 595, 100,  564, 91, 'middle', 'done'],
  // IN_PROGRESS ↓ HELP_NEEDED  (help) — left side
  [257, 119, 257, 190,  225, 157, 'end',   'help'],
  // HELP_NEEDED ↑ IN_PROGRESS  (helping) — right side
  [279, 190, 279, 119,  311, 157, 'start', 'helping'],
];

export default function StateMachineDiagram() {
  return (
    <div className="my-6 overflow-x-auto">
      <svg
        viewBox="0 0 820 250"
        className="w-full max-w-full"
        style={{ minWidth: 560 }}
        aria-label="TaskMaster state machine diagram"
      >
        <defs>
          <marker
            id="arr"
            markerWidth="8" markerHeight="6"
            refX="8" refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6Z" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Arrows */}
        {ARROWS.map(([x1, y1, x2, y2, lx, ly, anchor, verb], i) => (
          <g key={i}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#94a3b8" strokeWidth={1.5}
              markerEnd="url(#arr)"
            />
            <text
              x={lx} y={ly}
              textAnchor={anchor}
              fontFamily="ui-monospace,monospace"
              fontSize={10}
              fill="#64748b"
            >
              {verb}
            </text>
          </g>
        ))}

        {/* State nodes */}
        {NODES.map(({ id, label, cx, cy, color }) => (
          <g key={id}>
            <rect
              x={cx - NW / 2} y={cy - NH / 2}
              width={NW} height={NH}
              rx={8}
              fill={color} fillOpacity={0.1}
              stroke={color} strokeWidth={1.5}
            />
            <text
              x={cx} y={cy + 4}
              textAnchor="middle"
              fontFamily="ui-monospace,monospace"
              fontSize={10}
              fontWeight={600}
              fill={color}
            >
              {label}
            </text>
          </g>
        ))}

        {/* Footer note */}
        <text
          x={410} y={238}
          textAnchor="middle"
          fontFamily="ui-sans-serif,system-ui,sans-serif"
          fontSize={11}
          fill="#94a3b8"
        >
          * `done` works from any state when pushed by the assignee
        </text>
      </svg>
    </div>
  );
}
