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
      try {
        // Create a new script element
        const script = document.createElement('script');

        // Set script attributes from tracking code
        script.defer = true;
        script.src = "http://192.168.0.124:3000/script.js";
        script.setAttribute('data-website-id', '8ad305e2-bee6-4306-a498-f1b8486dc77e');

        // Mark it as our tracking script
        script.setAttribute('data-tracking-script', 'true');

        // Insert the script at the beginning of the head to ensure early loading
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode.insertBefore(script, firstScript);

        console.log('Tracking script injected successfully');
      } catch (error) {
        console.error('Error injecting tracking script:', error);
      }
    }
  }, [settings?.tracking_code]);

  return null;
}