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

    for (const page of pages) {
      for (const day of page.days) {
        for (const entry of day.entries) {
          totalSpent += entry.amount;
          const category = entry.category || "Uncategorized";
          entriesByCategory[category] =
            (entriesByCategory[category] || 0) + entry.amount;
          entriesByDay[day.dayIndex] =
            (entriesByDay[day.dayIndex] || 0) + entry.amount;
          allEntries.push({
            title: entry.title,
            amount: entry.amount,
            category,
            dayIndex: day.dayIndex,
          });
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
    const fixedExpensesTotal = user.settings.fixedExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    // Build prompt for AI
    const prompt = `
Analyze this weekly financial data:

Total Spent This Week: ${user.settings.currency || "₹"}${totalSpent.toFixed(2)}
Monthly Budget: ${
      user.settings.currency || "₹"
    }${user.settings.monthlyBudget.toFixed(2)}
Weekly Budget (Monthly/4): ${user.settings.currency || "₹"}${(
      user.settings.monthlyBudget / 4
    ).toFixed(2)}
Fixed Monthly Expenses: ${
      user.settings.currency || "₹"
    }${fixedExpensesTotal.toFixed(2)}

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
3. Category-wise insights
4. Budget warnings if applicable
5. Specific savings recommendations
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
          insights: aiResponse.insights,
          recommendations: aiResponse.recommendations,
        },
        { upsert: true, new: true }
      );

      return NextResponse.json(summary);
    } catch (aiError) {
      console.error("AI generation error:", aiError);

      // Return basic summary without AI
      const weeklyBudget = user.settings.monthlyBudget / 4;
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
          `Weekly budget: ${
            user.settings.currency || "₹"
          }${weeklyBudget.toFixed(2)}`,
          `Highest spending day: Day ${highestSpendingDay?.[0] || "N/A"}`,
          `Top category: ${topCategory?.[0] || "N/A"}`,
        ],
        recommendations: [
          "Set up your AI API key for detailed insights",
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
