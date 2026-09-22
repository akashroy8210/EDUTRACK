interface Props {
  data: { day: string; pct: number }[];
}

export default function DashboardChart({ data }: Props) {
  const w = 700;
  const h = 220;
  const pad = { t: 28, r: 24, b: 38, l: 44 };
  const aw = w - pad.l - pad.r;
  const ah = h - pad.t - pad.b;
  const max = 100;

  const pts = data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * aw,
    y: pad.t + ah - (d.pct / max) * ah,
    pct: d.pct,
    day: d.day,
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = pts.length > 0
    ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${(pad.t + ah).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.t + ah).toFixed(1)} Z`
    : '';

  return (
    <div className="w-full relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full block" style={{ height: 220, overflow: 'visible' }}>
        <defs>
          <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
            <stop offset="60%" stopColor="#6366f1" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal reference grid lines */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = pad.t + ah - (v / max) * ah;
          const isTarget = v === 75;
          return (
            <g key={v}>
              <line
                x1={pad.l}
                y1={y}
                x2={pad.l + aw}
                y2={y}
                stroke={isTarget ? '#10b98140' : '#2d3748'}
                strokeWidth={isTarget ? '1.5' : '1'}
                strokeDasharray={isTarget ? '5 5' : '3 3'}
              />
              <text
                x={pad.l - 8}
                y={y + 4}
                textAnchor="end"
                fill={isTarget ? '#10b981' : '#64748b'}
                fontSize="11"
                fontWeight={isTarget ? '600' : '400'}
                fontFamily="JetBrains Mono, monospace"
              >
                {v}%
              </text>
            </g>
          );
        })}

        {/* 75% target line indicator */}
        <text
          x={pad.l + aw}
          y={pad.t + ah - (75 / max) * ah - 6}
          textAnchor="end"
          fill="#10b981"
          fontSize="10"
          fontWeight="600"
          fontFamily="JetBrains Mono, monospace"
        >
          Target: 75%
        </text>

        {/* Gradient fill underneath the line */}
        {area && <path d={area} fill="url(#dashGrad)" />}

        {/* Main trend line */}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#glow)"
          />
        )}

        {/* Data points & X axis */}
        {pts.map((p, i) => {
          const isAbove75 = p.pct >= 75;
          return (
            <g key={i} className="cursor-pointer group">
              {/* Outer halo */}
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill="#6366f1"
                fillOpacity="0.25"
              />
              {/* Core point */}
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill={isAbove75 ? '#818cf8' : '#ef4444'}
                stroke="#0d1117"
                strokeWidth="1.5"
              />
              {/* Value pill label */}
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="10"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
              >
                {p.pct}%
              </text>
              {/* X-axis day name */}
              <text
                x={p.x}
                y={h - 12}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="11"
                fontWeight="500"
                fontFamily="JetBrains Mono, monospace"
              >
                {p.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
