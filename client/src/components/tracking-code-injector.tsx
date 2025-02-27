import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Settings } from "@shared/schema";

export function TrackingCodeInjector() {
  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    // Remove any existing tracking script
    const existingScript = document.querySelector('script[data-tracking-script]');
    if (existingScript) {
      existingScript.remove();
    }

    // If there's a tracking code in settings, inject it
    if (settings?.tracking_code) {
      // Create a new script element
      const script = document.createElement('div');
      script.innerHTML = settings.tracking_code;
      
      // Get the actual script element from the div
      const trackingScript = script.querySelector('script');
      if (trackingScript) {
        // Mark it as our tracking script
        trackingScript.setAttribute('data-tracking-script', 'true');
        // Add it to the head
        document.head.appendChild(trackingScript);
      }
    }
  }, [settings?.tracking_code]);

  return null;
}
