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
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center gap-2 mr-4">
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

        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggle />
          <NotificationPreferencesDialog>
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </NotificationPreferencesDialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                {user?.username || "User"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(isAdmin || isSuperAdmin) && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/users">Manage Users</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <UptimeLogDialog />
                  </DropdownMenuItem>
                  <DropdownMenuItem>
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
      </div>
    </nav>
  );
}
