"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  X,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export function SummaryDrawer() {
  const {
    summaryDrawerOpen,
    setSummaryDrawerOpen,
    dailySummaries,
    weeklySummaries,
    isGeneratingSummary,
    generateDailySummary,
    generateWeeklySummary,
    fetchDailySummaries,
    fetchWeeklySummaries,
    user,
  } = useStore();

  const [selectedProvider, setSelectedProvider] = useState(
    user?.settings?.preferredAIProvider || "openai"
  );

  useEffect(() => {
    if (summaryDrawerOpen) {
      fetchDailySummaries(7);
      fetchWeeklySummaries(4);
    }
  }, [summaryDrawerOpen, fetchDailySummaries, fetchWeeklySummaries]);

  const handleGenerateDaily = async () => {
    await generateDailySummary(selectedProvider);
  };

  const handleGenerateWeekly = async () => {
    await generateWeeklySummary(selectedProvider);
  };

  const currency = user?.settings?.currency || "₹";

  if (!summaryDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setSummaryDrawerOpen(false)}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full md:max-w-md bg-white dark:bg-black shadow-xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-neutral-500" />
              <h2 className="text-lg md:text-xl font-bold">AI Summaries</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSummaryDrawerOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">
              AI Provider
            </label>
            <Select
              value={selectedProvider}
              onValueChange={setSelectedProvider}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="google">Google Gemini</SelectItem>
                <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
                <SelectItem value="huggingface">HuggingFace</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="daily">
            <TabsList className="w-full">
              <TabsTrigger value="daily" className="flex-1">
                Daily
              </TabsTrigger>
              <TabsTrigger value="weekly" className="flex-1">
                Weekly
              </TabsTrigger>
            </TabsList>

            {/* Daily Tab */}
            <TabsContent value="daily" className="mt-4 space-y-4">
              <Button
                onClick={handleGenerateDaily}
                disabled={isGeneratingSummary}
                className="w-full"
              >
                {isGeneratingSummary ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Daily Summary
                  </>
                )}
              </Button>

              {dailySummaries.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No daily summaries yet. Generate your first one!
                </div>
              ) : (
                dailySummaries.map((summary) => (
                  <SummaryCard
                    key={summary._id?.toString()}
                    date={summary.date}
                    type="daily"
                    summary={summary.summary}
                    totalSpent={summary.totalSpent}
                    insights={summary.insights}
                    recommendations={summary.recommendations}
                    currency={currency}
                  />
                ))
              )}
            </TabsContent>

            {/* Weekly Tab */}
            <TabsContent value="weekly" className="mt-4 space-y-4">
              <Button
                onClick={handleGenerateWeekly}
                disabled={isGeneratingSummary}
                className="w-full"
              >
                {isGeneratingSummary ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Weekly Summary
                  </>
                )}
              </Button>

              {weeklySummaries.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No weekly summaries yet. Generate your first one!
                </div>
              ) : (
                weeklySummaries.map((summary) => (
                  <SummaryCard
                    key={summary._id?.toString()}
                    date={summary.date}
                    type="weekly"
                    summary={summary.summary}
                    totalSpent={summary.totalSpent}
                    insights={summary.insights}
                    recommendations={summary.recommendations}
                    currency={currency}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  date: string;
  type: "daily" | "weekly";
  summary: string;
  totalSpent: number;
  insights: string[];
  recommendations: string[];
  currency: string;
}

function SummaryCard({
  date,
  type,
  summary,
  totalSpent,
  insights,
  recommendations,
  currency,
}: SummaryCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-500" />
            {type === "daily" ? "Daily" : "Weekly"} Summary
          </CardTitle>
          <span className="text-xs text-neutral-500">{date}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-100 dark:bg-neutral-900">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            Total Spent
          </span>
          <span className="font-semibold">
            {formatCurrency(totalSpent, currency)}
          </span>
        </div>

        {/* Summary */}
        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          {summary}
        </p>

        {/* Insights */}
        {insights && insights.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-sm font-medium mb-1">
              <TrendingUp className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
              Insights
            </div>
            <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-black dark:text-white">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-sm font-medium mb-1">
              <Lightbulb className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
              Recommendations
            </div>
            <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-black dark:text-white">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
