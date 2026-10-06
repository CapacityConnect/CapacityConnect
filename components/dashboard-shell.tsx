"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Megaphone,
  MessageSquare,
  Network,
  Route,
  Settings,
  ShieldCheck,
  Target,
  UserCheck,
  Users,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { NotificationBell } from "@/components/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"
import type { Role } from "@/lib/types"

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const NAV_ITEMS: Record<Role, NavItem[]> = {
  trainee: [
    { href: "/trainee", label: "Dashboard", icon: LayoutDashboard },
    { href: "/trainee/competency-check", label: "Competency Check", icon: Target },
    { href: "/trainee/learning-path", label: "Learning Path", icon: Route },
    { href: "/trainee/courses", label: "Browse Courses", icon: BookOpen },
    { href: "/trainee/my-learning", label: "My Learning", icon: GraduationCap },
    { href: "/trainee/assessments", label: "Assessments", icon: BarChart3 },
    { href: "/trainee/find-trainer", label: "Find a Trainer", icon: Network },
    { href: "/trainee/library", label: "Trainer Library", icon: Library },
    { href: "/trainee/certificates", label: "Certificates", icon: Award },
  ],
  trainer: [
    { href: "/trainer", label: "Dashboard", icon: LayoutDashboard },
    { href: "/trainer/courses", label: "My Courses", icon: BookOpen },
    { href: "/trainer/participation", label: "Participation", icon: BarChart3 },
    { href: "/trainer/library", label: "Resource Library", icon: Library },
    { href: "/trainer/evidence", label: "Evidence Review", icon: BadgeCheck },
    { href: "/trainer/feedback", label: "Feedback", icon: MessageSquare },
  ],
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/user-approval", label: "User Approval", icon: UserCheck },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/trainers", label: "Trainer Management", icon: GraduationCap },
    { href: "/admin/courses", label: "Course Management", icon: BookOpen },
    { href: "/admin/content", label: "Content / Resources", icon: Library },
    { href: "/admin/competencies", label: "Competencies", icon: Network },
    { href: "/admin/reports", label: "Reports & Analytics", icon: BarChart3 },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/notifications", label: "Notifications", icon: Bell },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
}

const ROLE_LABEL: Record<Role, string> = {
  trainee: "Trainee",
  trainer: "Trainer",
  admin: "Administrator",
}

export function DashboardShell({ role, children }: { role: Role; children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { appUser, logout } = useAuth()
  const items = NAV_ITEMS[role]

  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  const initials = appUser?.name
    ? appUser.name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?"

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </div>
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
              <span className="text-sm font-semibold">Capacity Connect</span>
              <span className="text-xs text-muted-foreground">{ROLE_LABEL[role]} Portal</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        tooltip={item.label}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href={`/${role}/profile`} />}
                tooltip="Profile"
                isActive={pathname === `/${role}/profile`}
              >
                <Settings />
                <span>Profile & Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} tooltip="Log out">
                <LogOut />
                <span>Log out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <ThemeToggle />
            <NotificationBell />
            <Link href={`/${role}/profile`} className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{appUser?.name}</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
