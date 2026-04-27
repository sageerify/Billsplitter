import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  BarChart3,
  Shield,
  Settings,
  LogOut,
  Plus,
  Search,
  Bell,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useMyProfile, useMyRoles } from "@/lib/hooks/use-data";
import { authService } from "@/services/auth.service";
import { toast } from "sonner";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useMyProfile();
  const { data: roles } = useMyRoles();
  const [addOpen, setAddOpen] = useState(false);

  const isAdmin = (roles ?? []).includes("admin");

  const navItems = [
    { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { to: "/groups" as const, label: "Groups", icon: Users },
    { to: "/balances" as const, label: "Balances", icon: Wallet },
    { to: "/reports" as const, label: "Reports", icon: BarChart3 },
    ...(isAdmin ? [{ to: "/admin" as const, label: "Admin", icon: Shield }] : []),
    { to: "/settings" as const, label: "Settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    await authService.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">BillSplit Auto</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Smart Ledger</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <button
            onClick={() => setAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add Expense
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-border bg-background/60 px-4 py-3 backdrop-blur md:px-6">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search transactions, groups…"
                className="w-full rounded-full border border-input bg-surface/60 py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationsButton />
            <ProfileButton
              email={user?.email}
              name={profile?.display_name}
              avatar={profile?.avatar_url}
              color={profile?.identity_color}
              onSignOut={handleSignOut}
            />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>

        {/* Mobile bottom nav for Add */}
        <div className="fixed bottom-6 right-6 z-30 lg:hidden">
          <button
            onClick={() => setAddOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary shadow-glow"
            aria-label="Add expense"
          >
            <Plus className="h-6 w-6 text-primary-foreground" />
          </button>
        </div>
      </div>

      <AddExpenseModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: "/dashboard" | "/groups" | "/balances" | "/reports" | "/admin" | "/settings";
  label: string;
  icon: typeof LayoutDashboard;
}) {
  const loc = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-sidebar-accent text-foreground shadow-glow"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {active && <span className="ml-auto h-2 w-2 rounded-full bg-gradient-mint" />}
    </Link>
  );
}

function NotificationsButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface/60 transition hover:bg-surface">
        <Bell className="h-4 w-4" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gradient-mint" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
          You're all caught up 🎉
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProfileButton({
  email,
  name,
  avatar,
  color,
  onSignOut,
}: {
  email?: string;
  name?: string;
  avatar?: string | null;
  color?: string;
  onSignOut: () => void;
}) {
  const initials = (name || email || "U").slice(0, 2).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-surface/60 py-1 pl-1 pr-3 transition hover:bg-surface">
        {avatar ? (
          <img src={avatar} className="h-8 w-8 rounded-full object-cover" alt="" />
        ) : (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
            style={{ background: color ?? "var(--gradient-primary)" }}
          >
            {initials}
          </div>
        )}
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="font-semibold">{name ?? "Account"}</p>
          <p className="text-xs font-normal text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings">
            <Settings className="mr-2 h-4 w-4" /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
