import { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

export type Stat = {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "warning" | "danger";
  detail: string;
};

export type Survey = {
  id: string;
  name: string;
  status: "Live" | "Draft" | "Archived";
  audience: string;
  completions: number;
  responseRate: string;
  updatedAt: string;
  goal: string;
  channels: string[];
  questions: number;
  owner: string;
};

export type Campaign = {
  id: string;
  name: string;
  status: "Active" | "Paused" | "Completed";
  survey: string;
  budget: string;
  reach: string;
  conversion: string;
  updatedAt: string;
  owner: string;
  channels: string[];
  summary: string;
};

export type Contact = {
  id: string;
  name: string;
  company: string;
  role: string;
  status: "Active" | "Paused" | "Completed";
  lastTouch: string;
  score: string;
  region: string;
};

export type TableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};
