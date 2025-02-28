import { Bell, ChevronDown, ServerCog } from "lucide-react"
import { Link } from "wouter"
import { Settings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationPreferencesDialog } from "@/components/notification-preferences-dialog"
import { UptimeLogDialog } from "@/components/uptime-log-dialog"
import { SettingsDialog } from "@/components/ui/settings-dialog"
import { useAuth } from "@/hooks/use-auth"

interface NavigationBarProps {
  settings?: Settings;
}

export function NavigationBar({ settings }: NavigationBarProps) {
  const { user, logoutMutation } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-4">
      <nav className="w-full max-w-7xl flex items-center justify-between rounded-full border bg-background/95 px-6 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt="Site Logo"
              className="h-8 w-8 object-contain"
            />
          ) : (
            <ServerCog className="h-8 w-8 text-primary" />
          )}
          <span className="hidden font-bold sm:inline-block">
            {settings?.site_title || "Homelab Dashboard"}
          </span>
        </div>

        <div className="flex items-center justify-end gap-4">
          <ThemeToggle />
          <NotificationPreferencesDialog>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-5 w-5" />
            </Button>
          </NotificationPreferencesDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-8 px-2">
                <span className="max-w-[100px] truncate">{user?.username || "User"}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {(isAdmin || isSuperAdmin) && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/users">Manage Users</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <UptimeLogDialog />
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <SettingsDialog />
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onSelect={() => logoutMutation.mutate()}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}