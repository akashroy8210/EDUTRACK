interface DataPoint {
  day: string;
  done: number;
  pct: number;
}

export default function TodoBarChart({ data }: { data: DataPoint[] }) {
  const w = 700;
  const h = 200;
  const pad = { t: 20, r: 24, b: 38, l: 36 };
  const aw = w - pad.l - pad.r;
  const ah = h - pad.t - pad.b;

  const maxVal = Math.max(...data.map(d => d.done), 1);
  const gap = aw / Math.max(data.length, 1);
  const barW = Math.min(gap * 0.55, 24);

  const color = (pct: number) => (pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#6366f1');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full block" style={{ height: 200, overflow: 'visible' }}>
        {[0, Math.ceil(maxVal * 0.5), maxVal].map(v => {
          const y = pad.t + ah - (v / maxVal) * ah;
          return (
            <g key={v}>
              <line
                x1={pad.l}
                y1={y}
                x2={pad.l + aw}
                y2={y}
                stroke="#2d3748"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={pad.l - 8}
                y={y + 4}
                textAnchor="end"
                fill="#64748b"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                {v}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = pad.l + i * gap + gap / 2;
          const barH = (d.done / maxVal) * ah;
          const x = cx - barW / 2;
          const y = pad.t + ah - barH;

          return (
            <g key={i} className="cursor-pointer group">
              <rect
                x={x}
                y={pad.t}
                width={barW}
                height={ah}
                fill="#1c2230"
                rx="4"
                opacity="0.5"
              />
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 0)}
                fill={color(d.pct)}
                rx="4"
              />
              {d.done > 0 && (
                <text
                  x={cx}
                  y={y - 6}
                  textAnchor="middle"
                  fill="#e2e8f0"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {d.done}
                </text>
              )}
              <text
                x={cx}
                y={h - 12}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {d.day}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
