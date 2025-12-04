import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Page from "@/models/Page";
import AISummary from "@/models/AISummary";
import { generateAISummary, AIProvider } from "@/lib/ai-providers";

// POST generate daily summary
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const provider = body.provider as AIProvider | undefined;
    const pageId = body.pageId as string;
    const dayIndex = body.dayIndex as number;

    if (!pageId || dayIndex === undefined) {
      return NextResponse.json(
        { error: "pageId and dayIndex are required" },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the specific page
    const page = await Page.findById(pageId);
    if (!page || page.userId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Page not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get the specific day
    const day = page.days.find((d) => d.dayIndex === dayIndex);
    if (!day) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    // Get today's date
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    // Get 3 days data: current day and 2 previous days for comparison
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const threeDaysData: Array<{
      dayIndex: number;
      dayName: string;
      totalSpent: number;
      entries: Array<{ title: string; amount: number; category: string }>;
      entriesByCategory: Record<string, number>;
    }> = [];

    // Collect data for current day and 2 previous days
    for (let i = 0; i < 3; i++) {
      const targetDayIndex = (dayIndex - i + 7) % 7; // Handle wrap around (Sunday = 0)
      const targetDay = page.days.find((d) => d.dayIndex === targetDayIndex);

      let dayTotal = 0;
      const dayCategories: Record<string, number> = {};
      const dayEntries: Array<{
        title: string;
        amount: number;
        category: string;
      }> = [];

      if (targetDay && targetDay.entries) {
        for (const entry of targetDay.entries) {
          dayTotal += entry.amount || 0;
          const category = entry.category || "Uncategorized";
          dayCategories[category] =
            (dayCategories[category] || 0) + (entry.amount || 0);
          dayEntries.push({
            title: entry.title || "Untitled",
            amount: entry.amount || 0,
            category,
          });
        }
      }

      threeDaysData.push({
        dayIndex: targetDayIndex,
        dayName: dayNames[targetDayIndex],
        totalSpent: dayTotal,
        entries: dayEntries,
        entriesByCategory: dayCategories,
      });
    }

    // Calculate total spending from ONLY current day's entries
    const currentDayData = threeDaysData[0];
    const totalSpent = currentDayData.totalSpent;
    const entriesByCategory = currentDayData.entriesByCategory;

    // Get day name
    const currentDayName = dayNames[dayIndex];

    // Calculate available budget after fixed expenses
    const fixedExpensesTotal = user.settings.fixedExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0
    );
    const availableMonthlyBudget =
      user.settings.monthlyBudget - fixedExpensesTotal;
    const dailyBudget = availableMonthlyBudget / 30;

    // Build prompt for AI
    const prompt = `
Analyze this 3-DAY financial comparison for ${currentDayName}:

**TODAY (${currentDayName}):**
Total Spent: ${
      user.settings.currency || "₹"
    }${threeDaysData[0].totalSpent.toFixed(2)}
Spending by Category:
${Object.entries(threeDaysData[0].entriesByCategory)
  .map(
    ([cat, amount]) =>
      `- ${cat}: ${user.settings.currency || "₹"}${amount.toFixed(2)}`
  )
  .join("\n")}
Entries:
${threeDaysData[0].entries
  .map(
    (e) =>
      `- ${e.title}: ${user.settings.currency || "₹"}${e.amount.toFixed(2)} (${
        e.category
      })`
  )
  .join("\n")}

**YESTERDAY (${threeDaysData[1].dayName}):**
Total Spent: ${
      user.settings.currency || "₹"
    }${threeDaysData[1].totalSpent.toFixed(2)}
Spending by Category:
${
  Object.entries(threeDaysData[1].entriesByCategory)
    .map(
      ([cat, amount]) =>
        `- ${cat}: ${user.settings.currency || "₹"}${amount.toFixed(2)}`
    )
    .join("\n") || "No spending"
}

**2 DAYS AGO (${threeDaysData[2].dayName}):**
Total Spent: ${
      user.settings.currency || "₹"
    }${threeDaysData[2].totalSpent.toFixed(2)}
Spending by Category:
${
  Object.entries(threeDaysData[2].entriesByCategory)
    .map(
      ([cat, amount]) =>
        `- ${cat}: ${user.settings.currency || "₹"}${amount.toFixed(2)}`
    )
    .join("\n") || "No spending"
}

**Budget Context:**
Monthly Budget (Total): ${
      user.settings.currency || "₹"
    }${user.settings.monthlyBudget.toFixed(2)}
Fixed Monthly Expenses: ${
      user.settings.currency || "₹"
    }${fixedExpensesTotal.toFixed(2)}
Available Monthly Budget (After Fixed Expenses): ${
      user.settings.currency || "₹"
    }${availableMonthlyBudget.toFixed(2)}
Daily Budget Target (Available Budget ÷ 30): ${
      user.settings.currency || "₹"
    }${dailyBudget.toFixed(2)}

Fixed Monthly Budgets/Expenses:
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

Please provide:
1. **3-Day Comparison**: How today's spending compares to the last 2 days
2. **Trends**: Are you spending more or less? Which categories changed?
3. **Growth/Decline**: Percentage change in spending from yesterday and 2 days ago
4. **Category Analysis**: Which categories increased/decreased across the 3 days
5. **Budget Status**: Is today within daily budget? How does it compare to previous days?
6. **Recommendations**: Based on the 3-day pattern, what should you do tomorrow?

Focus on trends, patterns, and actionable insights from the 3-day comparison.
`;

    try {
      const aiResponse = await generateAISummary(user, prompt, provider);

      // Save summary to database
      const summary = await AISummary.findOneAndUpdate(
        { userId: user._id, date: dateStr, type: "daily" },
        {
          userId: user._id,
          date: dateStr,
          type: "daily",
          summary: aiResponse.summary,
          totalSpent,
          insights: aiResponse.insights,
          recommendations: aiResponse.recommendations,
        },
        { upsert: true, new: true }
      );

      return NextResponse.json(summary);
    } catch (aiError) {
      console.error("AI generation error:", aiError);

      // Return basic summary without AI if generation fails
      const fixedExpensesTotal = user.settings.fixedExpenses.reduce(
        (sum, e) => sum + (e.amount || 0),
        0
      );
      const availableMonthlyBudget =
        user.settings.monthlyBudget - fixedExpensesTotal;
      const dailyBudget = availableMonthlyBudget / 30;

      return NextResponse.json({
        userId: user._id,
        date: dateStr,
        type: "daily",
        summary: `You spent ${
          user.settings.currency || "₹"
        }${totalSpent.toFixed(2)} today. ${
          totalSpent > dailyBudget
            ? "⚠️ This is above your daily available budget!"
            : "You're within your daily budget."
        }`,
        totalSpent,
        insights: [
          `Total spending today: ${
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
          `Daily budget target: ${
            user.settings.currency || "₹"
          }${dailyBudget.toFixed(2)}`,
          `Top category: ${
            Object.entries(entriesByCategory).sort(
              (a, b) => b[1] - a[1]
            )[0]?.[0] || "N/A"
          }`,
        ],
        recommendations: [
          (aiError as Error)?.message?.includes("rate limit")
            ? "⚠️ AI rate limit reached. Wait a few minutes or try a different provider"
            : (aiError as Error)?.message?.includes("API key")
            ? "Set up your AI API key in Settings > AI Keys for detailed insights"
            : "AI service unavailable. Try again later or use a different provider",
          "Track your spending consistently for better analysis",
        ],
      });
    }
  } catch (error) {
    console.error("Error generating daily summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET daily summaries
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
    const limit = parseInt(searchParams.get("limit") || "7");

    const summaries = await AISummary.find({
      userId: user._id,
      type: "daily",
    })
      .sort({ date: -1 })
      .limit(limit);

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("Error fetching daily summaries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
