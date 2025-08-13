import { Bell, ChevronDown, ServerCog, Users, Activity, Settings as SettingsIcon, LogOut, Menu, AlertTriangle, CheckCircle2, Info, AlertCircle } from "lucide-react"
import { Link, useLocation } from "wouter"
import { Settings } from "@shared/schema"
import { motion } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SettingsDialog } from "@/components/settings-dialog"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "./theme-toggle"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SystemAlert {
  id: string;
  source: string;
  level: string;
  text: string;
  formatted: string;
  datetime: string;
  last_occurrence: string;
  dismissed: boolean;
  category: 'storage' | 'media' | 'network' | 'system';
  // Additional fields for TrueNAS alerts
  klass?: string;
  args?: any;
  node?: string;
  key?: string;
  mail?: any;
  one_shot?: boolean;
}

interface NavigationBarProps {
  settings?: Settings;
  pageTitle?: string;
}

export function NavigationBar({ settings, pageTitle }: NavigationBarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.role === 'admin';
  const isSuperAdmin = user?.role === 'superadmin';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch unified system alerts for the notification bell
  const { data: alerts = [] } = useQuery<SystemAlert[]>({
    queryKey: ["/api/system/alerts"],
    refetchInterval: 30000,
  });

  const unreadAlerts = alerts.filter(alert => !alert.dismissed);
  const criticalAlerts = unreadAlerts.filter(alert => alert.level === 'CRITICAL' || alert.level === 'ERROR');

  const getAlertIcon = (level: string, source?: string) => {
    // Source-specific icons
    if (source === 'Plex') {
      switch (level) {
        case 'CRITICAL':
        case 'ERROR':
          return <AlertTriangle className="h-3 w-3 text-red-500" />;
        case 'WARNING':
          return <AlertCircle className="h-3 w-3 text-yellow-500" />;
        default:
          return <Activity className="h-3 w-3 text-purple-500" />;
      }
    }
    
    // Default icons by level
    switch (level) {
      case 'CRITICAL':
      case 'ERROR':
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      case 'WARNING':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'INFO':
        return <Info className="h-3 w-3 text-blue-500" />;
      default:
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    }
  };

  const getSeverityBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">Critical</Badge>;
      case 'ERROR':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">Error</Badge>;
      case 'WARNING':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs">Warning</Badge>;
      case 'INFO':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs">Info</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 text-xs">Unknown</Badge>;
    }
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pageTitle]);

  // Helper function to create animated nav links
  const NavLink = ({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) => {
    const isActive = location === href;
    
    return (
      <Link href={href}>
        <motion.button 
          className={`relative px-3 py-2 text-sm font-normal transition-all duration-200 rounded-md ${
            isActive 
              ? 'text-foreground bg-foreground/8' 
              : 'text-foreground/70 hover:text-foreground hover:bg-foreground/5'
          } ${className}`}
          style={{ fontWeight: 400 }}
          whileHover={{ y: -1 }}
          whileTap={{ y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          {children}
          {isActive && (
            <motion.div
              className="absolute bottom-1 left-2 right-2 h-0.5 bg-primary rounded-full"
              layoutId="navbar-underline"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ 
                type: "spring", 
                damping: 30, 
                stiffness: 300,
                delay: 0.1 
              }}
            />
          )}
        </motion.button>
      </Link>
    );
  };

  return (
    <nav 
      className="fixed top-0 z-50 w-full max-h-screen"
      style={{
        backdropFilter: 'saturate(180%) brightness(150%) blur(10px)',
        borderColor: 'transparent'
      }}
    >
      {/* Dynamic background based on theme */}
      <div 
        className="absolute inset-0 bg-background/80 dark:bg-black/80"
        style={{
          boxShadow: '0 25px 50px rgb(0 0 0 / 10%), 0 5px 25px rgb(0 0 0 / 20%)'
        }}
      />
      {/* Main Navbar Container */}
      <div className="relative flex justify-center z-10">
        <div 
          className="relative z-10 flex w-full max-w-[1240px] items-center px-5"
          style={{
            height: '65px',
            userSelect: 'none',
            WebkitFontSmoothing: 'antialiased'
          }}
        >
          {/* Left: Logo/Wordmark - Fixed width */}
          <div className="flex items-center w-60">
            <Link href="/" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="h-6 w-auto object-contain"
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="24" className="text-foreground">
                  <path d="M 16 0 L 16 8 L 8 8 L 0 0 Z M 0 8 L 8 8 L 16 16 L 8 16 L 8 24 L 0 16 Z" fill="currentColor"/>
                </svg>
              )}
              <span className="text-foreground font-medium text-base">
                {settings?.site_title || "Homelab"}
              </span>
            </Link>
          </div>

          {/* Center: Navigation Menu - Flex grow and center */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center gap-1">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/game-servers">Game Servers</NavLink>
              <NavLink href="/services">Services</NavLink>
              <NavLink href="/plex">Plex</NavLink>
            </div>
          </div>

          {/* Right: User Actions - Fixed width to match left */}
          <div className="flex items-center gap-3 justify-end w-60">
            {/* System Alerts Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 text-foreground/70 hover:text-foreground transition-colors rounded-md">
                  <Bell className="h-4 w-4" />
                  {unreadAlerts.length > 0 && (
                    <span className={`absolute -top-1 -right-1 h-4 w-4 rounded-full text-xs font-medium flex items-center justify-center ${
                      criticalAlerts.length > 0 ? 'bg-red-500' : 'bg-yellow-500'
                    } text-white`}>
                      {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="p-3 border-b">
                  <h4 className="font-medium text-sm">System Alerts</h4>
                  <p className="text-xs text-muted-foreground">
                    {unreadAlerts.length === 0 ? 'No active alerts' : `${unreadAlerts.length} active alert${unreadAlerts.length === 1 ? '' : 's'}`}
                  </p>
                  {unreadAlerts.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {[...new Set(alerts.map(a => a.source))].map(source => (
                        <Badge key={source} variant="outline" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {unreadAlerts.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>All systems healthy</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {unreadAlerts.slice(0, 10).map((alert) => (
                        <div key={alert.id} className="p-2 rounded-lg bg-muted/50 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {getAlertIcon(alert.level, alert.source)}
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{alert.source}</span>
                                {alert.category && (
                                  <span className="text-xs text-muted-foreground capitalize">{alert.category}</span>
                                )}
                              </div>
                            </div>
                            {getSeverityBadge(alert.level)}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{alert.formatted || alert.text}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.last_occurrence).toLocaleString()}
                          </p>
                        </div>
                      ))}
                      {unreadAlerts.length > 10 && (
                        <p className="text-xs text-center text-muted-foreground p-2">
                          +{unreadAlerts.length - 10} more alerts
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Separator */}
            <div className="w-px h-4 bg-border" />
            
            <Link href="/login" className="hidden md:block">
              <button 
                className="px-3 py-2 text-sm font-normal text-foreground/70 hover:text-foreground transition-colors"
                style={{ fontWeight: 400 }}
              >
                {user?.username || "Login"}
              </button>
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="px-4 py-1.5 text-sm font-normal text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <span className="hidden md:inline">Menu</span>
                  <Menu className="h-4 w-4 md:hidden" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 backdrop-blur-xl border-border"
              >
                {/* Admin menu items always visible */}
                {(isAdmin || isSuperAdmin) && (
                  <>
                    <Link href="/users">
                      <DropdownMenuItem className="cursor-pointer">
                        <Users className="h-4 w-4 mr-2" />
                        Users
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/settings">
                      <DropdownMenuItem className="cursor-pointer">
                        <SettingsIcon className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </Link>
                    <Separator className="my-1" />
                  </>
                )}

                {/* Mobile navigation items */}
                <div className="lg:hidden">
                  <Link href="/">
                    <DropdownMenuItem className="cursor-pointer">
                      Dashboard
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/game-servers">
                    <DropdownMenuItem className="cursor-pointer">
                      Game Servers
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/services">
                    <DropdownMenuItem className="cursor-pointer">
                      Services
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/plex">
                    <DropdownMenuItem className="cursor-pointer">
                      Plex
                    </DropdownMenuItem>
                  </Link>
                  <Separator className="my-1" />
                </div>
                
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => logoutMutation.mutate()}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Trigger */}
            <button 
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <div className="space-y-1">
                <div 
                  className="w-4 h-0.5 bg-foreground transition-transform"
                  style={{ transform: mobileMenuOpen ? 'translateY(2.5px) rotate(45deg)' : 'translateY(-4px)' }}
                />
                <div 
                  className="w-4 h-0.5 bg-foreground transition-transform"
                  style={{ transform: mobileMenuOpen ? 'translateY(-2.5px) rotate(-45deg)' : 'translateY(4px)' }}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <div 
        className="absolute left-0 w-full bg-background dark:bg-black lg:hidden overflow-hidden transition-all"
        style={{
          top: '65px',
          height: mobileMenuOpen ? 'auto' : '0px'
        }}
      >
        <div className="h-full overflow-y-auto">
          <div className="flex w-full flex-col gap-5 p-5">
            <Link href="/">
              <button className="w-full text-left px-3 py-2 text-foreground/70 hover:text-foreground transition-colors">
                Dashboard
              </button>
            </Link>
            
            <Link href="/game-servers">
              <button className="w-full text-left px-3 py-2 text-foreground/70 hover:text-foreground transition-colors">
                Game Servers
              </button>
            </Link>
            
            <Link href="/services">
              <button className="w-full text-left px-3 py-2 text-foreground/70 hover:text-foreground transition-colors">
                Services
              </button>
            </Link>
            
            <Link href="/plex">
              <button className="w-full text-left px-3 py-2 text-foreground/70 hover:text-foreground transition-colors">
                Plex
              </button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}