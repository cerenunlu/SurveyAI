import { ReactNode } from "react";

type HeroPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  chips?: string[];
};

export function HeroPanel({ eyebrow, title, description, actions, chips }: HeroPanelProps) {
  return (
    <section className="hero-card">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="hero-title">{title}</h2>
      <p className="hero-text">{description}</p>
      {actions ? <div className="hero-actions" style={{ marginTop: "24px" }}>{actions}</div> : null}
      {chips?.length ? (
        <div className="chip-row" style={{ marginTop: "24px" }}>
          {chips.map((chip) => (
            <span className="chip" key={chip}>
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
