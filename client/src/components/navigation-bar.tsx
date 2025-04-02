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
import { useEffect, useState } from "react"

interface NavigationBarProps {
  settings?: Settings;
  pageTitle?: string;
}

export function NavigationBar({ settings, pageTitle }: NavigationBarProps) {
  const { user, logoutMutation } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show navbar when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out ${
      isVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4">
        <nav className="w-full flex items-center justify-between rounded-full border bg-background/95 px-4 md:px-8 py-3 md:py-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Site Logo"
                  className="h-7 w-7 md:h-9 md:w-9 object-contain fixed-logo"
                />
              ) : (
                <ServerCog className="h-7 w-7 md:h-9 md:w-9 text-primary" />
              )}
              <span className="font-bold text-foreground text-xs md:text-base max-w-[120px] md:max-w-none truncate">
                {settings?.site_title || "Homelab Dashboard"}
              </span>
            </div>

            {pageTitle && (
              <>
                <Separator orientation="vertical" className="h-5 md:h-7 mx-1 md:mx-2" />
                <span className="font-medium text-foreground text-sm md:text-base">{pageTitle}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 md:gap-4">
            <ThemeToggle />
            <NotificationPreferencesDialog />

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-1 md:gap-2 px-2 py-2 md:py-2.5 rounded-md hover:bg-accent cursor-pointer">
                  <span className="max-w-[60px] md:max-w-[100px] truncate text-sm md:text-base text-foreground">{user?.username || "User"}</span>
                  <ChevronDown className="h-3 w-3 md:h-4 md:w-4" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 overflow-y-auto">
                {(isAdmin || isSuperAdmin) && (
                  <>
                    <Link href="/users">
                      <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                        <Users className="h-4 w-4" />
                        <span>Manage Users</span>
                      </DropdownMenuItem>
                    </Link>

                    <Link href="/settings">
                      <DropdownMenuItem className="flex items-center gap-2 cursor-pointer text-foreground">
                        <SettingsIcon className="h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </Link>
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