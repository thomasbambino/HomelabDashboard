import { Bell, ChevronDown, ServerCog, Users, Activity, Settings as SettingsIcon, LogOut } from "lucide-react"
import { Link } from "wouter"
import { Settings } from "@shared/schema"
import { NavIconButton } from "@/components/ui/nav-icon-button"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NotificationPreferencesDialog } from "@/components/notification-preferences-dialog"
import { UptimeLogDialog } from "@/components/uptime-log-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { useAuth } from "@/hooks/use-auth"

interface NavigationBarProps {
  settings?: Settings;
}

export function NavigationBar({ settings }: NavigationBarProps) {
  const { user, logoutMutation } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-2 sm:px-4 py-4 sm:py-8">
      <nav className="w-full flex items-center justify-between rounded-full border bg-background/95 px-3 sm:px-10 py-4 sm:py-8 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 sm:gap-4 pl-1 sm:pl-3">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt="Site Logo"
              className="h-8 w-8 sm:h-20 sm:w-20 object-contain fixed-logo"
            />
          ) : (
            <ServerCog className="h-8 w-8 sm:h-20 sm:w-20 text-primary" />
          )}
          <span className="font-bold text-lg sm:text-3xl text-foreground truncate">
            {settings?.site_title || "Homelab Dashboard"}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-6 pr-1 sm:pr-3">
          <ThemeToggle />
          <NotificationPreferencesDialog />

          <DropdownMenu>
            <DropdownMenuTrigger>
              <NavIconButton className="gap-1 sm:gap-2 px-1 sm:px-3 w-auto">
                <span className="max-w-[60px] sm:max-w-[120px] truncate text-foreground text-lg sm:text-2xl">
                  {user?.username || "User"}
                </span>
                <ChevronDown className="h-4 w-4 sm:h-8 sm:w-8" />
              </NavIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {(isAdmin || isSuperAdmin) && (
                <>
                  <Link href="/users">
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                      <Users className="h-5 w-5" />
                      <span>Manage Users</span>
                    </DropdownMenuItem>
                  </Link>

                  <UptimeLogDialog>
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                      <Activity className="h-5 w-5" />
                      <span>Uptime Log</span>
                    </DropdownMenuItem>
                  </UptimeLogDialog>

                  <SettingsDialog>
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                      <SettingsIcon className="h-5 w-5" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </SettingsDialog>
                </>
              )}

              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer text-foreground"
                onSelect={() => logoutMutation.mutate()}
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}