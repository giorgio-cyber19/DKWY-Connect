import {
  LayoutDashboard,
  BookOpen,
  BookMarked,
  MessagesSquare,
  Users,
  Image as ImageIcon,
  FileText,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Settings,
  ShieldCheck,
  Sparkles,
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
  { href: "/ai-chat", label: "layout.navAiChat", icon: Sparkles },
  { href: "/bible", label: "layout.navBible", icon: BookMarked },
  { href: "/lessons", label: "layout.navLessons", icon: BookOpen },
  { href: "/updates", label: "layout.navUpdates", icon: MessagesSquare },
  { href: "/children", label: "layout.navChildren", icon: Users },
  { href: "/media", label: "layout.navMedia", icon: ImageIcon },
  { href: "/documents", label: "layout.navDocuments", icon: FileText },
  { href: "/calendar", label: "layout.navCalendar", icon: CalendarDays },
  { href: "/roster", label: "layout.navRoster", icon: ClipboardList },
  { href: "/my-class", label: "layout.navMyClass", icon: GraduationCap },
  { href: "/settings", label: "layout.navSettings", icon: Settings },
  { href: "/admin", label: "layout.navAdmin", icon: ShieldCheck, adminOnly: true },
];
