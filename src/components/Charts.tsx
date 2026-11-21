import { memo, useLayoutEffect, useRef, useState } from 'react';

/** Renders charts at their real pixel width so text never gets stretched. */
function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(200, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Shown in the tooltip / accessible table. */
  title: string;
  highlight?: boolean;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  max?: number;
  target?: number;
  format?: (v: number) => string;
  /** Show every n-th x label to avoid crowding. */
  labelEvery?: number;
  ariaLabel: string;
}

/** Lightweight SVG bar chart. Includes a visually hidden table for screen readers. */
export const BarChart = memo(function BarChart({ data, height = 160, max, target, format = String, labelEvery, ariaLabel }: BarChartProps) {
  const [ref, width] = useWidth<HTMLElement>();
  const padL = 32;
  const padB = 22;
  const padT = 8;
  const innerH = height - padB - padT;
  const innerW = width - padL;
  const top = Math.max(max ?? 0, target ?? 0, ...data.map((d) => d.value), 1);
  const niceTop = niceMax(top);
  const step = innerW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(28, step * 0.62));
  const every = labelEvery ?? Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 44))));
  const y = (v: number) => padT + innerH - (v / niceTop) * innerH;

  return (
    <figure ref={ref} className="chart" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} width={width} height={height}>
        {ticks(niceTop).map((v) => (
          <g key={v}>
            <line className="grid-line" x1={padL} x2={width} y1={y(v)} y2={y(v)} />
            <text className="axis" x={padL - 6} y={y(v) + 3} textAnchor="end">{format(v)}</text>
          </g>
        ))}
        {target !== undefined && target > 0 && <line className="target" x1={padL} x2={width} y1={y(target)} y2={y(target)} />}
        {data.map((d, i) => {
          const x = padL + step * i + (step - barW) / 2;
          const h = Math.max(d.value > 0 ? 2 : 0, padT + innerH - y(d.value));
          return (
            <g key={d.key}>
              <rect className={`bar ${d.value === 0 ? 'muted' : ''}`} x={x} y={padT + innerH - (h || 2)} width={barW} height={h || 2} rx={Math.min(3, barW / 3)} opacity={d.highlight === false ? 0.55 : 1}>
                <title>{d.title}</title>
              </rect>
              {i % every === 0 && (
                <text className="axis" x={x + barW / 2} y={height - 6} textAnchor="middle">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>{data.map((d) => <tr key={d.key}><td>{d.title}</td></tr>)}</tbody>
      </table>
    </figure>
  );
});

interface LineChartProps {
  points: { label: string; value: number; title: string }[];
  target?: number;
  height?: number;
  ariaLabel: string;
  format?: (v: number) => string;
}

export const LineChart = memo(function LineChart({ points, target, height = 140, ariaLabel, format = String }: LineChartProps) {
  const [ref, width] = useWidth<HTMLElement>();
  const padL = 40;
  const padB = 22;
  const padT = 10;
  const innerH = height - padB - padT;
  const innerW = width - padL - 8;
  const values = points.map((p) => p.value);
  const top = niceMax(Math.max(target ?? 0, ...values, 1));
  const bottom = Math.min(0, ...values);
  const span = top - bottom || 1;
  const x = (i: number) => padL + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - bottom) / span) * innerH;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${path} L${x(points.length - 1)},${y(bottom)} L${x(0)},${y(bottom)} Z` : '';
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 60))));

  return (
    <figure ref={ref} className="chart" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} width={width} height={height}>
        {[0, 0.5, 1].map((f) => {
          const v = bottom + span * f;
          return (
            <g key={f}>
              <line className="grid-line" x1={padL} x2={width} y1={y(v)} y2={y(v)} />
              <text className="axis" x={padL - 6} y={y(v) + 3} textAnchor="end">{format(Math.round(v))}</text>
            </g>
          );
        })}
        {target !== undefined && <line className="target" x1={padL} x2={width} y1={y(target)} y2={y(target)} />}
        {area && <path className="area" d={area} />}
        <path className="line" d={path} vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <g key={i}>
            <circle className="dot" cx={x(i)} cy={y(p.value)} r={3}><title>{p.title}</title></circle>
            {i % every === 0 && <text className="axis" x={x(i)} y={height - 6} textAnchor="middle">{p.label}</text>}
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>{points.map((p, i) => <tr key={i}><td>{p.title}</td></tr>)}</tbody>
      </table>
    </figure>
  );
});

/** Gridline values: 0, middle (only when it's a whole number) and top. */
function ticks(top: number): number[] {
  const mid = top / 2;
  return Number.isInteger(mid) && mid > 0 ? [0, mid, top] : [0, top];
}

function niceMax(v: number): number {
  if (v <= 1) return 2;
  if (v <= 5) return Math.ceil(v);
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * mag;
}
