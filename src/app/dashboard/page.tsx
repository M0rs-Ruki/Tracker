"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store";
import { Sidebar } from "@/components/sidebar";
import { PageCanvas } from "@/components/page-canvas";
import { Onboarding } from "@/components/onboarding";
import { SummaryDrawer } from "@/components/summary-drawer";
import { SettingsDialog } from "@/components/settings-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Menu, FileText } from "lucide-react";

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
    sidebarOpen,
    setSidebarOpen,
  } = useStore();

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Derive onboarding state from user data (no useEffect needed)
  const showOnboarding = useMemo(() => {
    return user && !user.onboardingCompleted;
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch user on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchUser();
    }
  }, [status, fetchUser]);

  // Fetch page when selected
  useEffect(() => {
    const currentPageId = currentPage?._id.toString();
    if (currentPageId) {
      // Page is already loaded in store
      return;
    }
  }, [currentPage]);

  // Handle page selection and close sidebar on mobile
  const handlePageSelect = (pageId: string) => {
    // Fetch the selected page
    fetchPage(pageId);

    // Close sidebar on mobile after selecting a page
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

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
    return <Onboarding onComplete={fetchUser} />;
  }

  // Wait for user to be fully loaded
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-black overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-black dark:text-white truncate max-w-[200px]">
          {currentPage?.title || "Money Tracker"}
        </h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Sidebar */}
      <Sidebar
        onPageSelect={handlePageSelect}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {isLoadingCurrentPage ? (
          <div className="flex items-center justify-center h-full">
            <Spinner size="lg" />
          </div>
        ) : currentPage ? (
          <PageCanvas page={currentPage} />
        ) : (
          <EmptyState onOpenSidebar={() => setSidebarOpen(true)} />
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

interface EmptyStateProps {
  onOpenSidebar: () => void;
}

function EmptyState({ onOpenSidebar }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 md:p-8">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-neutral-100 dark:bg-neutral-900 rounded-full flex items-center justify-center mb-4 md:mb-6">
        <FileText className="h-8 w-8 md:h-10 md:w-10 text-neutral-400" />
      </div>
      <h2 className="text-lg md:text-xl font-semibold mb-2 text-black dark:text-white">
        No page selected
      </h2>
      <p className="text-sm md:text-base text-neutral-500 dark:text-neutral-400 max-w-md mb-4">
        Select a page from the sidebar or create a new one to start tracking
        your finances.
      </p>
      <Button variant="outline" className="md:hidden" onClick={onOpenSidebar}>
        <Menu className="h-4 w-4 mr-2" />
        Open Sidebar
      </Button>
    </div>
  );
}
