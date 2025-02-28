import { Bell, ChevronDown, ServerCog, Users, Activity, Settings as SettingsIcon, LogOut } from "lucide-react"
import { Link } from "wouter"
import { Settings } from "@shared/schema"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { NotificationPreferencesDialog } from "@/components/notification-preferences-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "./theme-toggle"

interface NavigationBarProps {
  settings?: Settings;
  pageTitle?: string;
}

export function NavigationBar({ settings, pageTitle }: NavigationBarProps) {
  const { user, logoutMutation } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-[1400px] mx-auto px-8 py-4">
        <nav className="w-full flex items-center justify-between rounded-full border bg-background/95 px-8 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Site Logo"
                  className="h-8 w-8 object-contain fixed-logo"
                />
              ) : (
                <ServerCog className="h-8 w-8 text-primary" />
              )}
              <span className="font-bold text-foreground sm:inline-block">
                {settings?.site_title || "Homelab Dashboard"}
              </span>
            </div>

            {pageTitle && (
              <>
                <Separator orientation="vertical" className="h-6 mx-2" />
                <span className="font-medium text-foreground">{pageTitle}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-4 pr-2">
            <ThemeToggle />
            <NotificationPreferencesDialog />

            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent cursor-pointer">
                  <span className="max-w-[100px] truncate text-foreground">{user?.username || "User"}</span>
                  <ChevronDown className="h-4 w-4" />
                </div>
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

                    <Link href="/uptime-log">
                      <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                        <Activity className="h-4 w-4" />
                        <span>Uptime Log</span>
                      </DropdownMenuItem>
                    </Link>

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
    </div>
  );
}