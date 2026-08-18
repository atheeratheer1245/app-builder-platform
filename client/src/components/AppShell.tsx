import { BrandMark } from "@/components/BrandMark";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLocale } from "@/contexts/LocaleContext";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Boxes, FolderKanban, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Puzzle, Settings2 } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const navigation = [
  { href: "/app", icon: LayoutDashboard, ar: "الرئيسية", en: "Dashboard" },
  { href: "/projects", icon: FolderKanban, ar: "مشاريعي", en: "My projects" },
  { href: "/templates", icon: Puzzle, ar: "القوالب", en: "Templates" },
  { href: "/exports", icon: Boxes, ar: "التصدير", en: "Exports" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { copy, isArabic } = useLocale();
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const signOut = trpc.localAuth.signOut.useMutation({ onSuccess: () => setLocation("/auth") });

  return (
    <div className={cn("app-shell", collapsed && "app-shell-collapsed", isArabic && "app-shell-rtl")}>
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <BrandMark compact={collapsed} />
          <button onClick={() => setCollapsed(value => !value)} className="icon-control hidden lg:flex" aria-label={copy("طي القائمة", "Collapse sidebar")}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {navigation.map(item => {
            const active = location === item.href || (item.href === "/app" && location.startsWith("/editor"));
            return <Link key={item.href} href={item.href} className={cn("sidebar-link", active && "sidebar-link-active")}>
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{copy(item.ar, item.en)}</span>}
            </Link>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/settings" className="sidebar-link"><Settings2 className="h-[18px] w-[18px]" />{!collapsed && <span>{copy("الإعدادات", "Settings")}</span>}</Link>
          <button type="button" onClick={() => signOut.mutate()} className="sidebar-link sidebar-signout w-full"><LogOut className="h-[18px] w-[18px]" />{!collapsed && <span>{copy("تسجيل الخروج", "Sign out")}</span>}</button>
        </div>
      </aside>
      <section className="app-main">
        <header className="app-topbar">
          <div className="flex items-center gap-3"><span className="status-dot" /> <span className="text-xs font-semibold text-slate-500">{copy("مساحة عملك جاهزة", "Your workspace is ready")}</span></div>
          <div className="flex items-center gap-3"><LanguageToggle /><div className="avatar-badge">AB</div></div>
        </header>
        <main className="app-content">{children}</main>
      </section>
    </div>
  );
}
