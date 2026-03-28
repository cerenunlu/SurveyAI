import { AnalyticsIcon, CallingOpsIcon, OperationIcon, ContactIcon, DashboardIcon, SurveyIcon } from "@/components/ui/Icons";
import type { NavItem } from "@/lib/types";

type Translate = (path: string) => string;

export function getNavigationItems(t: Translate): NavItem[] {
  return [
    {
      href: "/",
      label: t("shell.navigation.dashboard.label"),
      description: t("shell.navigation.dashboard.description"),
      icon: <DashboardIcon className="nav-icon" />,
    },
    {
      href: "/surveys",
      label: t("shell.navigation.surveys.label"),
      description: t("shell.navigation.surveys.description"),
      icon: <SurveyIcon className="nav-icon" />,
    },
    {
      href: "/operations",
      label: t("shell.navigation.operations.label"),
      description: t("shell.navigation.operations.description"),
      icon: <OperationIcon className="nav-icon" />,
    },
    {
      href: "/contacts",
      label: t("shell.navigation.contacts.label"),
      description: t("shell.navigation.contacts.description"),
      icon: <ContactIcon className="nav-icon" />,
    },
    {
      href: "/analytics",
      label: t("shell.navigation.analytics.label"),
      description: t("shell.navigation.analytics.description"),
      icon: <AnalyticsIcon className="nav-icon" />,
    },
    {
      href: "/calling-ops",
      label: t("shell.navigation.callingOps.label"),
      description: t("shell.navigation.callingOps.description"),
      icon: <CallingOpsIcon className="nav-icon" />,
    },
  ];
}
