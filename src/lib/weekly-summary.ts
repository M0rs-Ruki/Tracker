import { IUser } from "@/models/User";
import Page from "@/models/Page";
import { generateAISummary } from "@/lib/ai-providers";

export interface WeeklySummaryData {
  weekTotal: number;
  categoriesBreakdown: Record<string, number>;
  dailyBreakdown: Record<string, number>;
  topSpendingDay: { day: string; amount: number };
  averageDailySpending: number;
}

/**
 * Calculate weekly spending summary for a user
 * Looks at pages updated in the last 7 days
 */
export async function calculateWeeklySummary(
  userId: string
): Promise<WeeklySummaryData> {
  // Get date range for the past week
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Find all pages for the user updated in the last week
  const pages = await Page.find({
    userId,
    updatedAt: { $gte: oneWeekAgo },
  });

  let weekTotal = 0;
  const categoriesBreakdown: Record<string, number> = {};
  const dailyBreakdown: Record<string, number> = {};

  // Aggregate spending data
  for (const page of pages) {
    for (const day of page.days) {
      const dayName = getDayName(day.dayIndex);
      dailyBreakdown[dayName] = dailyBreakdown[dayName] || 0;

      for (const entry of day.entries) {
        weekTotal += entry.amount;

        // Category breakdown
        const category = entry.category || "Uncategorized";
        categoriesBreakdown[category] =
          (categoriesBreakdown[category] || 0) + entry.amount;

        // Daily breakdown
        dailyBreakdown[dayName] += entry.amount;
      }
    }
  }

  // Find top spending day
  let topSpendingDay = { day: "N/A", amount: 0 };
  for (const [day, amount] of Object.entries(dailyBreakdown)) {
    if (amount > topSpendingDay.amount) {
      topSpendingDay = { day, amount };
    }
  }

  const averageDailySpending = weekTotal / 7;

  return {
    weekTotal,
    categoriesBreakdown,
    dailyBreakdown,
    topSpendingDay,
    averageDailySpending,
  };
}

/**
 * Generate AI-powered weekly analysis
 */
export async function generateWeeklyAIAnalysis(
  user: IUser,
  summaryData: WeeklySummaryData
): Promise<string> {
  const fixedExpensesTotal = (user.settings.fixedExpenses || []).reduce(
    (sum, expense) => sum + (expense.amount || 0),
    0
  );
  const realMonthlyBudget = user.settings.monthlyBudget - fixedExpensesTotal;
  const weeklyBudget = realMonthlyBudget / 4;
  const difference = summaryData.weekTotal - weeklyBudget;
  const isOverBudget = difference > 0;

  // Build prompt for AI
  const prompt = `
Analyze this weekly financial data and provide insights:

User: ${user.name}
Monthly Budget: ${
    user.settings.currency || "₹"
  }${user.settings.monthlyBudget.toFixed(2)}
Fixed Expenses: ${user.settings.currency || "₹"}${fixedExpensesTotal.toFixed(2)}
Real Monthly Budget: ${
    user.settings.currency || "₹"
  }${realMonthlyBudget.toFixed(2)}
Weekly Budget: ${user.settings.currency || "₹"}${weeklyBudget.toFixed(2)}

This Week's Spending: ${
    user.settings.currency || "₹"
  }${summaryData.weekTotal.toFixed(2)}
Status: ${isOverBudget ? "Over budget by" : "Under budget by"} ${
    user.settings.currency || "₹"
  }${Math.abs(difference).toFixed(2)}

Category Breakdown:
${Object.entries(summaryData.categoriesBreakdown)
  .sort((a, b) => b[1] - a[1])
  .map(
    ([cat, amount]) =>
      `- ${cat}: ${user.settings.currency || "₹"}${amount.toFixed(2)}`
  )
  .join("\n")}

Daily Breakdown:
${Object.entries(summaryData.dailyBreakdown)
  .map(
    ([day, amount]) =>
      `- ${day}: ${user.settings.currency || "₹"}${amount.toFixed(2)}`
  )
  .join("\n")}

Top Spending Day: ${summaryData.topSpendingDay.day} (${
    user.settings.currency || "₹"
  }${summaryData.topSpendingDay.amount.toFixed(2)})
Average Daily Spending: ${
    user.settings.currency || "₹"
  }${summaryData.averageDailySpending.toFixed(2)}

Please provide a brief weekly analysis including:
- Spending patterns and observations
- Warnings if overspending detected
- How much the user should spend per day next week to stay on track
- Predicted budget status for next week
- Any alerts or recommendations

Keep the response concise and actionable (4-6 bullet points).
`;

  try {
    const aiResponse = await generateAISummary(user, prompt);

    // Format AI response as bullet points
    const insights = aiResponse.insights || [];
    const recommendations = aiResponse.recommendations || [];

    let analysis = "";
    if (aiResponse.summary) {
      analysis += `${aiResponse.summary}\n\n`;
    }

    if (insights.length > 0) {
      analysis += "Key Insights:\n";
      insights.forEach((insight) => {
        analysis += `• ${insight}\n`;
      });
      analysis += "\n";
    }

    if (recommendations.length > 0) {
      analysis += "Recommendations:\n";
      recommendations.forEach((rec) => {
        analysis += `• ${rec}\n`;
      });
    }

    return analysis.trim();
  } catch (error) {
    console.error("AI generation failed:", error);

    // Fallback analysis without AI
    const dailySafe = weeklyBudget / 7;
    return `• You spent ${
      user.settings.currency || "₹"
    }${summaryData.weekTotal.toFixed(2)} this week (${
      isOverBudget ? "over" : "under"
    } budget).
• Your top spending category was ${
      Object.entries(summaryData.categoriesBreakdown).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "N/A"
    }.
• To stay on track next week, aim to spend around ${
      user.settings.currency || "₹"
    }${dailySafe.toFixed(2)} per day.
${
  isOverBudget
    ? "• ⚠️ Warning: You're currently overspending. Consider reducing discretionary expenses."
    : "• ✓ Great job staying within budget! Keep it up."
}`;
  }
}

function getDayName(dayIndex: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dayIndex] || `Day ${dayIndex}`;
}
