import { AnalyticsIcon, CallingOpsIcon, CampaignIcon, ContactIcon, DashboardIcon, SurveyIcon } from "@/components/ui/Icons";
import { NavItem } from "@/lib/types";

export const navigationItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "Operations overview",
    icon: <DashboardIcon className="nav-icon" />,
  },
  {
    href: "/surveys",
    label: "Surveys",
    description: "Drafts and live studies",
    icon: <SurveyIcon className="nav-icon" />,
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    description: "Launch and pacing",
    icon: <CampaignIcon className="nav-icon" />,
  },
  {
    href: "/contacts",
    label: "Contacts",
    description: "Uploads and validation",
    icon: <ContactIcon className="nav-icon" />,
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Performance and trends",
    icon: <AnalyticsIcon className="nav-icon" />,
  },
  {
    href: "/calling-ops",
    label: "Calling Ops",
    description: "Queues and call jobs",
    icon: <CallingOpsIcon className="nav-icon" />,
  },
];
