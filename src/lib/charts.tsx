'use client';

import { useEffect, useRef, useState } from 'react';

// ── Color Palette ─────────────────────────────────────────────────────────────

export const CHART_COLORS = [
  '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6',
  '#14b8a6', '#f97316', '#ef4444', '#06b6d4', '#84cc16',
];

// ── PerformanceChart Component ────────────────────────────────────────────────

export interface PerformanceChartProps {
  data: { label: string; values: Record<string, number> }[];
  players: string[];
  type: 'line' | 'bar';
  height?: number;
  width?: number;
  cumulative?: boolean;
}

export function PerformanceChart({
  data,
  players,
  type,
  height = 250,
  width = 600,
  cumulative = false,
}: PerformanceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [animated, setAnimated] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    player: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const margin = { top: 20, right: 120, bottom: 40, left: 50 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Compute processed data (cumulative or raw)
  const processedData = data.map((d, idx) => {
    if (!cumulative) return d;
    const cumulativeValues: Record<string, number> = {};
    for (const player of players) {
      let sum = 0;
      for (let i = 0; i <= idx; i++) {
        sum += data[i].values[player] || 0;
      }
      cumulativeValues[player] = sum;
    }
    return { ...d, values: cumulativeValues };
  });

  // Compute scales
  const allValues = processedData.flatMap((d) =>
    players.flatMap((p) => d.values[p] ?? 0)
  );
  const maxVal = Math.max(...allValues, 1);
  const yMax = Math.ceil(maxVal * 1.15) || 5;

  const xScale = (i: number) =>
    margin.left + (i / Math.max(processedData.length - 1, 1)) * innerW;
  const yScale = (v: number) =>
    margin.top + innerH - (v / yMax) * innerH;

  // Y-axis ticks
  const yTicks = [];
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round((yMax / tickCount) * i));
  }

  // Trigger animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Generate line path
  const linePath = (playerIdx: number) => {
    const pts = processedData.map((d, i) => ({
      x: xScale(i),
      y: yScale(d.values[players[playerIdx]] ?? 0),
    }));
    if (pts.length === 0) return '';
    if (pts.length === 1) {
      return `M ${pts[0].x} ${yScale(0)} L ${pts[0].x} ${pts[0].y}`;
    }
    // Smooth curve via cubic bezier
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
      path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  // Bar positions
  const barGroupWidth =
    processedData.length > 0
      ? (innerW / processedData.length) * 0.7
      : 0;
  const barWidth = players.length > 0 ? barGroupWidth / players.length : 0;

  const colorForPlayer = (idx: number) => CHART_COLORS[idx % CHART_COLORS.length];

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <defs>
          {/* Grid pattern for subtle lines */}
          <pattern id="grid" width="100%" height={innerH / tickCount} patternUnits="userSpaceOnUse">
            <line
              x1={margin.left}
              y1={innerH / tickCount}
              x2={margin.left + innerW}
              y2={innerH / tickCount}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
            />
          </pattern>

          {/* Gradients for areas */}
          {players.map((_, i) => (
            <linearGradient key={`grad-${i}`} id={`areaGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorForPlayer(i)} stopOpacity={0.2} />
              <stop offset="100%" stopColor={colorForPlayer(i)} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>

        {/* Background fill */}
        <rect width={width} height={height} fill="transparent" />

        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={`ytick-${tick}`}>
            <line
              x1={margin.left}
              y1={yScale(tick)}
              x2={margin.left + innerW}
              y2={yScale(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <text
              x={margin.left - 8}
              y={yScale(tick) + 4}
              textAnchor="end"
              fill="rgba(255,255,255,0.35)"
              fontSize={11}
              fontFamily="monospace"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {processedData.map((d, i) => (
          <text
            key={`xlabel-${i}`}
            x={xScale(i)}
            y={height - margin.bottom + 20}
            textAnchor="middle"
            fill="rgba(255,255,255,0.35)"
            fontSize={10}
            fontFamily="monospace"
          >
            {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
          </text>
        ))}

        {/* Render based on type */}
        {type === 'line' && (
          <>
            {/* Area fills (behind lines) */}
            {players.map((_, pi) => {
              const pts = processedData.map((d, i) => ({
                x: xScale(i),
                y: yScale(d.values[players[pi]] ?? 0),
              }));
              if (pts.length < 2) return null;
              const baseY = yScale(0);
              let areaPath = `M ${pts[0].x} ${baseY}`;
              // forward path (along data points)
              for (const p of pts) areaPath += ` L ${p.x} ${p.y}`;
              // back to base
              areaPath += ` L ${pts[pts.length - 1].x} ${baseY} Z`;
              return (
                <path
                  key={`area-${pi}`}
                  d={areaPath}
                  fill={`url(#areaGrad-${pi})`}
                  opacity={0.6}
                />
              );
            })}

            {/* Lines */}
            {players.map((_, pi) => {
              const path = linePath(pi);
              if (!path) return null;
              const len = path.length;
              return (
                <path
                  key={`line-${pi}`}
                  d={path}
                  fill="none"
                  stroke={colorForPlayer(pi)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: animated ? 'none' : `${len}`,
                    strokeDashoffset: animated ? '0' : `${len}`,
                    transition: 'stroke-dashoffset 1s ease-in-out',
                  }}
                />
              );
            })}

            {/* Points (circles) */}
            {processedData.map((d, di) =>
              players.map((p, pi) => {
                const val = d.values[p] ?? 0;
                const cx = xScale(di);
                const cy = yScale(val);
                return (
                  <circle
                    key={`dot-${di}-${pi}`}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={colorForPlayer(pi)}
                    stroke="#1e293b"
                    strokeWidth={2}
                    style={{
                      opacity: animated ? 1 : 0,
                      transition: `opacity 0.3s ease ${di * 0.1}s`,
                    }}
                    className="cursor-pointer hover:r-6"
                    onMouseEnter={(e) => {
                      const rect = (e.target as SVGElement).closest('svg')?.getBoundingClientRect();
                      if (rect) {
                        setHoveredPoint({
                          label: d.label,
                          player: p,
                          value: val,
                          x: cx + 10,
                          y: cy - 10,
                        });
                      }
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })
            )}
          </>
        )}

        {type === 'bar' && (
          <>
            {processedData.map((d, di) =>
              players.map((p, pi) => {
                const val = d.values[p] ?? 0;
                const x =
                  margin.left +
                  (di / processedData.length) * innerW +
                  (innerW / processedData.length - barGroupWidth) / 2 +
                  pi * barWidth;
                const barH = (val / yMax) * innerH;
                const y = margin.top + innerH - barH;
                return (
                  <rect
                    key={`bar-${di}-${pi}`}
                    x={x}
                    y={y}
                    width={Math.max(barWidth - 2, 2)}
                    height={barH}
                    rx={3}
                    fill={colorForPlayer(pi)}
                    opacity={0.8}
                    style={{
                      transform: animated ? 'scaleY(1)' : 'scaleY(0)',
                      transformOrigin: `${x + barWidth / 2}px ${margin.top + innerH}px`,
                      transition: `transform 0.5s ease ${di * 0.08}s, opacity 0.5s ease ${di * 0.08}s`,
                    }}
                    onMouseEnter={() => {
                      setHoveredPoint({
                        label: d.label,
                        player: p,
                        value: val,
                        x: x + barWidth / 2,
                        y: y,
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })
            )}
          </>
        )}

        {/* Legend */}
        {players.map((p, pi) => {
          const legendY = margin.top + 6 + pi * 18;
          return (
            <g key={`legend-${pi}`}>
              <rect x={margin.left + innerW + 10} y={legendY - 6} width={10} height={10} rx={2} fill={colorForPlayer(pi)} />
              <text
                x={margin.left + innerW + 24}
                y={legendY + 1}
                fill="rgba(255,255,255,0.7)"
                fontSize={11}
                fontFamily="sans-serif"
              >
                {p.length > 14 ? p.slice(0, 14) + '…' : p}
              </text>
            </g>
          );
        })}

        {/* Bottom axis line */}
        <line
          x1={margin.left}
          y1={margin.top + innerH}
          x2={margin.left + innerW}
          y2={margin.top + innerH}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-gray-800/95 border border-gray-700 px-2.5 py-1.5 text-xs shadow-xl"
          style={{
            left: Math.min(hoveredPoint.x, width - 140),
            top: Math.max(hoveredPoint.y - 40, 0),
          }}
        >
          <div className="text-gray-400 font-medium">{hoveredPoint.label}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor:
                  CHART_COLORS[players.indexOf(hoveredPoint.player) % CHART_COLORS.length],
              }}
            />
            <span className="text-gray-200">{hoveredPoint.player}</span>
            <span className="text-amber-400 font-bold ml-1">{hoveredPoint.value} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}
