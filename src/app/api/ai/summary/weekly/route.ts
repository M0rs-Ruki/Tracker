import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Page from "@/models/Page";
import AISummary from "@/models/AISummary";
import { generateAISummary, AIProvider } from "@/lib/ai-providers";

// POST generate weekly summary
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const provider = body.provider as AIProvider | undefined;

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get week start date (Sunday)
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStr = weekStart.toISOString().split("T")[0];

    // Get all pages for the user
    const pages = await Page.find({ userId: user._id });

    // Calculate weekly spending
    let totalSpent = 0;
    const entriesByCategory: Record<string, number> = {};
    const entriesByDay: Record<number, number> = {};
    const allEntries: Array<{
      title: string;
      amount: number;
      category: string;
      dayIndex: number;
    }> = [];

    // Only process pages if they exist
    if (pages && pages.length > 0) {
      for (const page of pages) {
        if (page.days && page.days.length > 0) {
          for (const day of page.days) {
            if (day.entries && day.entries.length > 0) {
              for (const entry of day.entries) {
                totalSpent += entry.amount || 0;
                const category = entry.category || "Uncategorized";
                entriesByCategory[category] =
                  (entriesByCategory[category] || 0) + (entry.amount || 0);
                entriesByDay[day.dayIndex] =
                  (entriesByDay[day.dayIndex] || 0) + (entry.amount || 0);
                allEntries.push({
                  title: entry.title || "Untitled",
                  amount: entry.amount || 0,
                  category,
                  dayIndex: day.dayIndex,
                });
              }
            }
          }
        }
      }
    }

    // Find highest spending day
    const highestSpendingDay = Object.entries(entriesByDay).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topCategory = Object.entries(entriesByCategory).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Calculate fixed expenses total
    const fixedExpensesTotal =
      user.settings?.fixedExpenses?.reduce(
        (sum, exp) => sum + (exp.amount || 0),
        0
      ) || 0;

    // If no spending data, return early with a message
    if (allEntries.length === 0) {
      return NextResponse.json({
        userId: user._id,
        date: weekStr,
        type: "weekly",
        summary:
          "No spending data available for this week. Start tracking your expenses!",
        totalSpent: 0,
        insights: ["No transactions recorded this week"],
        recommendations: [
          "Start adding your daily expenses to track your spending",
        ],
      });
    }

    // Calculate available budget after fixed expenses
    const availableMonthlyBudget =
      user.settings.monthlyBudget - fixedExpensesTotal;
    const weeklyBudget = availableMonthlyBudget / 4;

    // Build prompt for AI
    const prompt = `
Analyze this weekly financial data:

Total Spent This Week: ${user.settings.currency || "₹"}${totalSpent.toFixed(2)}
Monthly Budget (Total): ${
      user.settings.currency || "₹"
    }${user.settings.monthlyBudget.toFixed(2)}
Fixed Monthly Expenses Total: ${
      user.settings.currency || "₹"
    }${fixedExpensesTotal.toFixed(2)}
Available Monthly Budget (After Fixed Expenses): ${
      user.settings.currency || "₹"
    }${availableMonthlyBudget.toFixed(2)}
Weekly Budget Target (Available Budget ÷ 4): ${
      user.settings.currency || "₹"
    }${weeklyBudget.toFixed(2)}

Fixed Monthly Budgets/Expenses (Detailed):
${
  user.settings.fixedExpenses && user.settings.fixedExpenses.length > 0
    ? user.settings.fixedExpenses
        .map(
          (budget) =>
            `- **${budget.title}**: ${
              user.settings.currency || "₹"
            }${budget.amount.toFixed(2)}
  Description: ${budget.description || "N/A"}
  Category: ${budget.category || "N/A"}
  Tags: ${
    budget.tags && budget.tags.length > 0 ? budget.tags.join(", ") : "None"
  }`
        )
        .join("\n")
    : "No fixed budgets set"
}

Spending by Day:
${Object.entries(entriesByDay)
  .map(
    ([day, amount]) =>
      `- Day ${day}: ${user.settings.currency || "₹"}${amount.toFixed(2)}`
  )
  .join("\n")}

Spending by Category:
${Object.entries(entriesByCategory)
  .map(
    ([cat, amount]) =>
      `- ${cat}: ${user.settings.currency || "₹"}${amount.toFixed(2)}`
  )
  .join("\n")}

Highest Spending Day: Day ${highestSpendingDay?.[0] || "N/A"} (${
      user.settings.currency || "₹"
    }${highestSpendingDay?.[1]?.toFixed(2) || 0})
Top Category: ${topCategory?.[0] || "N/A"} (${user.settings.currency || "₹"}${
      topCategory?.[1]?.toFixed(2) || 0
    })

Number of Transactions: ${allEntries.length}

Please provide a comprehensive weekly analysis with:
1. Overall spending assessment
2. Pattern recognition across days
3. Category-wise insights comparing actual spending vs fixed budgets
4. Budget warnings if applicable (check against budget categories and tags)
5. Specific savings recommendations based on budget descriptions
6. Analysis of which budget categories are on track or exceeded
`;

    try {
      const aiResponse = await generateAISummary(user, prompt, provider);

      // Save summary to database
      const summary = await AISummary.findOneAndUpdate(
        { userId: user._id, date: weekStr, type: "weekly" },
        {
          userId: user._id,
          date: weekStr,
          type: "weekly",
          summary: aiResponse.summary,
          totalSpent,
          insights: aiResponse.insights || [],
          recommendations: aiResponse.recommendations || [],
        },
        { upsert: true, new: true }
      );

      return NextResponse.json(summary);
    } catch (aiError: any) {
      console.error("AI generation error for weekly summary:", {
        error: aiError?.message || aiError,
        provider: provider || user.settings?.preferredAIProvider,
        hasApiKey:
          !!user.aiKeys?.[
            (provider as keyof typeof user.aiKeys) ||
              (user.settings?.preferredAIProvider as keyof typeof user.aiKeys)
          ],
      });

      // Return basic summary without AI
      const availableMonthlyBudget =
        user.settings.monthlyBudget - fixedExpensesTotal;
      const weeklyBudget = availableMonthlyBudget / 4;
      const isOverBudget = totalSpent > weeklyBudget;

      return NextResponse.json({
        userId: user._id,
        date: weekStr,
        type: "weekly",
        summary: `Weekly total: ${
          user.settings.currency || "₹"
        }${totalSpent.toFixed(2)}. ${
          isOverBudget
            ? "⚠️ You've exceeded your weekly budget!"
            : "You're within your weekly budget."
        }`,
        totalSpent,
        insights: [
          `Total weekly spending: ${
            user.settings.currency || "₹"
          }${totalSpent.toFixed(2)}`,
          `Monthly budget: ${
            user.settings.currency || "₹"
          }${user.settings.monthlyBudget.toFixed(2)}`,
          `Fixed expenses: ${
            user.settings.currency || "₹"
          }${fixedExpensesTotal.toFixed(2)}`,
          `Available budget: ${
            user.settings.currency || "₹"
          }${availableMonthlyBudget.toFixed(2)}/month`,
          `Weekly budget target: ${
            user.settings.currency || "₹"
          }${weeklyBudget.toFixed(2)}`,
          `Highest spending day: Day ${highestSpendingDay?.[0] || "N/A"}`,
          `Top category: ${topCategory?.[0] || "N/A"}`,
        ],
        recommendations: [
          (aiError as Error)?.message?.includes("rate limit")
            ? "⚠️ AI rate limit reached. Wait a few minutes or try a different provider"
            : (aiError as Error)?.message?.includes("API key")
            ? "Set up your AI API key in Settings > AI Keys for detailed insights"
            : "AI service unavailable. Try again later or use a different provider",
          isOverBudget
            ? "Consider reducing discretionary spending next week"
            : "Keep up the good budgeting!",
        ],
      });
    }
  } catch (error) {
    console.error("Error generating weekly summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET weekly summaries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "4");

    const summaries = await AISummary.find({
      userId: user._id,
      type: "weekly",
    })
      .sort({ date: -1 })
      .limit(limit);

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Error fetching weekly summaries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
