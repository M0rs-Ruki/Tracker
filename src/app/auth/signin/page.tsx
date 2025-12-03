"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export default function SignInPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
    >
      <div className="w-full max-w-md">
        <div
          className="border rounded-xl p-8"
          style={{
            background: "var(--background)",
            color: "var(--text-primary)",
            borderColor: "var(--border)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--foreground)" }}
            >
              <Wallet
                className="h-8 w-8"
                style={{ color: "var(--background)" }}
              />
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              Finance Tracker
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2">
              Track your finances with a Notion-style interface
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="text-black dark:text-white">✓</span>
              Create folders & pages like Notion
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="text-black dark:text-white">✓</span>
              7-day finance tracking per page
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="text-black dark:text-white">✓</span>
              AI-powered spending insights
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="text-black dark:text-white">✓</span>
              Budget tracking & alerts
            </div>
            <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
              <span className="text-black dark:text-white">✓</span>
              Export to PDF
            </div>
          </div>

          {/* Sign In Button */}
          <Button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full h-12 text-base"
            size="lg"
          >
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>

          {/* Terms */}
          <p className="text-xs text-center text-neutral-500 dark:text-neutral-400 mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
