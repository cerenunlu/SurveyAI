type KeyValueListProps = {
  items: Array<{
    label: string;
    value: string;
  }>;
};

export function KeyValueList({ items }: KeyValueListProps) {
  return (
    <div className="stack-list">
      {items.map((item) => (
        <div key={item.label} className="detail-row">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
