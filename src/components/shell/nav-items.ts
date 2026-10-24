export type NavItemKey =
  | "overview"
  | "feed"
  | "analysis"
  | "notifications"
  | "admin"
  | "settings";

export interface NavItem {
  href: string;
  key: NavItemKey;
  icon: "gauge" | "radio" | "sparkles" | "bell" | "shield" | "sliders";
  exact?: boolean;
}

export interface NavSection {
  titleKey: "sectionMonitor" | "sectionIntel" | "sectionOps";
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: "sectionMonitor",
    items: [
      { href: "/overview", key: "overview", icon: "gauge", exact: true },
      { href: "/feed", key: "feed", icon: "radio" },
    ],
  },
  {
    titleKey: "sectionIntel",
    items: [
      { href: "/analysis", key: "analysis", icon: "sparkles" },
      { href: "/notifications", key: "notifications", icon: "bell" },
    ],
  },
  {
    titleKey: "sectionOps",
    items: [
      { href: "/admin", key: "admin", icon: "shield" },
      { href: "/settings", key: "settings", icon: "sliders" },
    ],
  },
];
