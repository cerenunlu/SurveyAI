type IconProps = {
  className?: string;
};

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.8,
};

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M4 13.5h6.5V20H4zM13.5 4H20v9h-6.5zM13.5 16h6.5v4h-6.5zM4 4h6.5v6H4z" />
    </svg>
  );
}

export function SurveyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M7 5.5h10M7 10.5h10M7 15.5h5" />
      <path {...strokeProps} d="M4.5 5.5h.01M4.5 10.5h.01M4.5 15.5h.01M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function CampaignIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="m4 15 7-7 4 4 5-5" />
      <path {...strokeProps} d="M18 7h2v2M4 19h16" />
    </svg>
  );
}

export function ContactIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path {...strokeProps} d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function AnalyticsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M4 19.5h16" />
      <path {...strokeProps} d="M7 16V10" />
      <path {...strokeProps} d="M12 16V6" />
      <path {...strokeProps} d="M17 16v-3.5" />
    </svg>
  );
}

export function CallingOpsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M7.5 4.5h2l1.3 4-1.6 1.6a12.8 12.8 0 0 0 4.7 4.7l1.6-1.6 4 1.3v2a1.5 1.5 0 0 1-1.5 1.5A14.5 14.5 0 0 1 5.5 6A1.5 1.5 0 0 1 7 4.5Z" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="m21 21-4.35-4.35" />
      <circle {...strokeProps} cx="11" cy="11" r="6.5" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M6 16.5h12l-1.5-2v-4.25a4.5 4.5 0 1 0-9 0v4.25Z" />
      <path {...strokeProps} d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M5 12h14" />
      <path {...strokeProps} d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function SparkIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="m12 3 1.75 5.25L19 10l-5.25 1.75L12 17l-1.75-5.25L5 10l5.25-1.75Z" />
    </svg>
  );
}

export function CollapseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M9 6 3 12l6 6M15 6l6 6-6 6" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...strokeProps} d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle {...strokeProps} cx="12" cy="12" r="3" />
    </svg>
  );
}

export function GripIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="8" cy="7" r="1.25" fill="currentColor" />
      <circle cx="16" cy="7" r="1.25" fill="currentColor" />
      <circle cx="8" cy="12" r="1.25" fill="currentColor" />
      <circle cx="16" cy="12" r="1.25" fill="currentColor" />
      <circle cx="8" cy="17" r="1.25" fill="currentColor" />
      <circle cx="16" cy="17" r="1.25" fill="currentColor" />
    </svg>
  );
}
