type AvatarStackProps = {
  names: string[];
};

export function AvatarStack({ names }: AvatarStackProps) {
  return (
    <div className="avatar-stack">
      {names.map((name) => (
        <div key={name} className="avatar" aria-label={name} title={name}>
          {name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)}
        </div>
      ))}
    </div>
  );
}
