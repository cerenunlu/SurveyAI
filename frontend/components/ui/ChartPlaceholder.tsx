type ChartPlaceholderProps = {
  title: string;
  subtitle: string;
  values?: number[];
  labels?: string[];
};

const fallbackValues = [38, 52, 41, 68, 74, 57, 83, 62, 78, 88, 71, 92];
const fallbackLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ChartPlaceholder({
  title,
  subtitle,
  values = fallbackValues,
  labels = fallbackLabels,
}: ChartPlaceholderProps) {
  return (
    <div className="chart-placeholder">
      <div className="section-copy">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="chart-canvas">
        {values.map((value, index) => (
          <div key={`${title}-${index}`} className="chart-bar" style={{ height: `${value}%` }} />
        ))}
      </div>
      <div className="chart-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
