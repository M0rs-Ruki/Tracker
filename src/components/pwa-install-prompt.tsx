"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PWAInstallPrompt() {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (isInstalled || !canInstall) {
      return;
    }

    // Check if user previously dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysSinceDismissed =
        (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Show prompt after 2 seconds for better UX
    const timer = setTimeout(() => setShowPrompt(true), 2000);
    return () => clearTimeout(timer);
  }, [canInstall, isInstalled]);

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white dark:bg-black border-2 border-black dark:border-white rounded-lg shadow-lg p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-black dark:bg-white rounded-lg shrink-0">
            <Download className="h-5 w-5 text-white dark:text-black" />
          </div>
          <div>
            <h3 className="font-semibold text-base mb-1">
              Install Finance Tracker
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Add to your home screen for quick access and offline use
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleInstall} className="flex-1" size="sm">
            Install App
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
