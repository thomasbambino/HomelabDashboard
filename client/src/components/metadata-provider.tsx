import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema.js";
import { useEffect } from "react";

interface MetadataProviderProps {
  children: React.ReactNode;
}

export function LPMetadataProvider({ children }: MetadataProviderProps) {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      // Update document title
      document.title = settings.site_title || "Homelab Dashboard";

      // Update favicon if custom logo is set
      if (settings.logo_url) {
        const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
        link.type = 'image/x-icon';
        link.rel = 'shortcut icon';
        link.href = settings.logo_url;
        document.head.appendChild(link);
      }

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta');
      metaDescription.setAttribute("name", "description");
      metaDescription.setAttribute("content", settings.site_description || "Homelab Dashboard - Monitor and manage your services");
      if (!document.querySelector('meta[name="description"]')) {
        document.head.appendChild(metaDescription);
      }

      // Update meta theme color if present
      if (settings.theme_color) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
        metaThemeColor.setAttribute("name", "theme-color");
        metaThemeColor.setAttribute("content", settings.theme_color);
        if (!document.querySelector('meta[name="theme-color"]')) {
          document.head.appendChild(metaThemeColor);
        }
      }
    }
  }, [settings]);

  return <>{children}</>;
}