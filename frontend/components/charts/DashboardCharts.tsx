"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DataPoint = { label: string; value: number };

const TOOLTIP_STYLE = {
  backgroundColor: "#0f1b2a",
  border: "1px solid rgba(138, 164, 196, 0.2)",
  borderRadius: 10,
  color: "#edf3fb",
  fontSize: 12,
  padding: "6px 10px",
};

const AXIS_TICK = { fill: "#718196", fontSize: 11 };

export function ResponseTrendChart({
  points,
  percentLabel,
}: {
  points: DataPoint[];
  percentLabel: string;
}) {
  return (
    <div className="ops-dashboard-line-chart">
      <div className="ops-dashboard-line-meta">
        <span>100</span>
        <strong>{percentLabel}</strong>
      </div>
      <ResponsiveContainer width="100%" height={84}>
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,164,196,0.10)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [`%${v ?? 0}`, "Yanıt"]}
            cursor={{ stroke: "rgba(138,180,230,0.2)", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8ab4e6"
            strokeWidth={2}
            dot={{ r: 3, fill: "#8ab4e6", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#b9d7fb", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="ops-dashboard-line-labels">
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}

export function CallVolumeChart({ points }: { points: DataPoint[] }) {
  return (
    <div className="ops-dashboard-volume-chart recharts-volume">
      <ResponsiveContainer width="100%" height={80}>
        <BarChart data={points} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,164,196,0.08)" vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [v ?? 0, "Arama"]}
            cursor={{ fill: "rgba(138,180,230,0.07)" }}
          />
          <Bar dataKey="value" fill="#5aa7ff" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
