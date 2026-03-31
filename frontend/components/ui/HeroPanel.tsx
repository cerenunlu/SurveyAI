import { ReactNode } from "react";

type HeroPanelProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  chips?: string[];
  variant?: "default" | "compact";
};

export function HeroPanel({ eyebrow, title, description, actions, chips, variant = "default" }: HeroPanelProps) {
  return (
    <section className={["hero-card", variant === "compact" ? "is-compact" : ""].filter(Boolean).join(" ")}>
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="hero-title">{title}</h2>
      <p className="hero-text">{description}</p>
      {actions ? <div className="hero-actions">{actions}</div> : null}
      {chips?.length ? (
        <div className="chip-row">
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


