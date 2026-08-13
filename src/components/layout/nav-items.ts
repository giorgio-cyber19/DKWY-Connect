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
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lessons", label: "Lesson Plans", icon: BookOpen },
  { href: "/updates", label: "Teacher Updates", icon: MessagesSquare },
  { href: "/children", label: "Children Portfolios", icon: Users },
  { href: "/media", label: "Media Library", icon: ImageIcon },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/prayer", label: "Prayer & Encouragement", icon: HeartHandshake },
  { href: "/my-class", label: "My Class", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
];
