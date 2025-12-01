"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { Sidebar } from "@/components/sidebar";
import { PageCanvas } from "@/components/page-canvas";
import { Onboarding } from "@/components/onboarding";
import { SummaryDrawer } from "@/components/summary-drawer";
import { SettingsDialog } from "@/components/settings-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Wallet, FileText } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const {
    user,
    currentPage,
    fetchUser,
    fetchPage,
    setCurrentPage,
    isLoadingUser,
    isLoadingCurrentPage,
  } = useStore();

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch user on mount
  useEffect(() => {
    if (session?.user) {
      fetchUser();
    }
  }, [session, fetchUser]);

  // Check onboarding status
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [user]);

  // Fetch page when selected
  useEffect(() => {
    if (selectedPageId) {
      fetchPage(selectedPageId);
    } else {
      setCurrentPage(null);
    }
  }, [selectedPageId, fetchPage, setCurrentPage]);

  // Loading state
  if (status === "loading" || isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!session) {
    return null;
  }

  // Show onboarding
  if (showOnboarding) {
    return (
      <Onboarding
        onComplete={() => {
          setShowOnboarding(false);
          fetchUser();
        }}
      />
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-black">
      {/* Sidebar */}
      <Sidebar
        onPageSelect={setSelectedPageId}
        onSettingsOpen={() => setSettingsOpen(true)}
        selectedPageId={selectedPageId}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {isLoadingCurrentPage ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : currentPage ? (
          <PageCanvas page={currentPage} />
        ) : (
          <EmptyState />
        )}
      </main>

      {/* Summary Drawer */}
      <SummaryDrawer />

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-6">
        <FileText className="h-10 w-10 text-neutral-400" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-black dark:text-white">
        No page selected
      </h2>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
        Select a page from the sidebar or create a new one to start tracking
        your finances.
      </p>
    </div>
  );
}
