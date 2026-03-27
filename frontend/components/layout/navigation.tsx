import { CampaignIcon, ContactIcon, DashboardIcon, SurveyIcon } from "@/components/ui/Icons";
import { NavItem } from "@/lib/types";

export const navigationItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    description: "Command overview",
    icon: <DashboardIcon className="nav-icon" />,
  },
  {
    href: "/surveys",
    label: "Surveys",
    description: "Question flows",
    icon: <SurveyIcon className="nav-icon" />,
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    description: "Delivery engine",
    icon: <CampaignIcon className="nav-icon" />,
  },
  {
    href: "/contacts",
    label: "Contacts",
    description: "Audience layer",
    icon: <ContactIcon className="nav-icon" />,
  },
];
