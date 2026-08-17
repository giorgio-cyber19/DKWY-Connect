import {
  LayoutDashboard,
  BookOpen,
  MessagesSquare,
  Users,
  Image as ImageIcon,
  FileText,
  CalendarDays,
  HeartHandshake,
  GraduationCap,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  /** A TranslationKey string (e.g. "layout.navDashboard"), not raw display text. */
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "layout.navDashboard", icon: LayoutDashboard },
  { href: "/lessons", label: "layout.navLessons", icon: BookOpen },
  { href: "/updates", label: "layout.navUpdates", icon: MessagesSquare },
  { href: "/children", label: "layout.navChildren", icon: Users },
  { href: "/media", label: "layout.navMedia", icon: ImageIcon },
  { href: "/documents", label: "layout.navDocuments", icon: FileText },
  { href: "/calendar", label: "layout.navCalendar", icon: CalendarDays },
  { href: "/prayer", label: "layout.navPrayer", icon: HeartHandshake },
  { href: "/my-class", label: "layout.navMyClass", icon: GraduationCap },
  { href: "/settings", label: "layout.navSettings", icon: Settings },
  { href: "/admin", label: "layout.navAdmin", icon: ShieldCheck, adminOnly: true },
];
