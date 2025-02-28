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
    <div className="fixed top-0 left-0 right-0 z-50 px-2 sm:px-4 py-2 sm:py-6">
      <nav className="w-full flex items-center justify-between rounded-full border bg-background/95 px-3 sm:px-10 py-2 sm:py-5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 sm:gap-4 pl-1 sm:pl-3">
          {settings?.logo_url ? (
            <img
              src={settings.logo_url}
              alt="Site Logo"
              className="h-6 w-6 sm:h-12 sm:w-12 object-contain fixed-logo"
            />
          ) : (
            <ServerCog className="h-6 w-6 sm:h-12 sm:w-12 text-primary" />
          )}
          <span className="font-bold text-sm sm:text-xl text-foreground truncate">
            {settings?.site_title || "Homelab Dashboard"}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-6 pr-1 sm:pr-3">
          <ThemeToggle />
          <NotificationPreferencesDialog />

          <DropdownMenu>
            <DropdownMenuTrigger>
              <NavIconButton className="gap-1 sm:gap-2 px-1 sm:px-3 w-auto">
                <span className="max-w-[60px] sm:max-w-[120px] truncate text-foreground text-sm sm:text-lg">
                  {user?.username || "User"}
                </span>
                <ChevronDown className="h-3 w-3 sm:h-6 sm:w-6" />
              </NavIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {(isAdmin || isSuperAdmin) && (
                <>
                  <Link href="/users">
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                      <Users className="h-4 w-4" />
                      <span>Manage Users</span>
                    </DropdownMenuItem>
                  </Link>

                  <UptimeLogDialog>
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                      <Activity className="h-4 w-4" />
                      <span>Uptime Log</span>
                    </DropdownMenuItem>
                  </UptimeLogDialog>

                  <SettingsDialog>
                    <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                      <SettingsIcon className="h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                  </SettingsDialog>
                </>
              )}

              <DropdownMenuItem 
                className="flex items-center gap-2 cursor-pointer text-foreground" 
                onSelect={() => logoutMutation.mutate()}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}