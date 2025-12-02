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

    // Calculate total spending from ONLY this day's entries
    let totalSpent = 0;
    const entriesByCategory: Record<string, number> = {};
    const allEntries: Array<{
      title: string;
      amount: number;
      category: string;
    }> = [];

    for (const entry of day.entries) {
      totalSpent += entry.amount;
      const category = entry.category || "Uncategorized";
      entriesByCategory[category] =
        (entriesByCategory[category] || 0) + entry.amount;
      allEntries.push({
        title: entry.title,
        amount: entry.amount,
        category,
      });
    }

    // Get day name
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayName = dayNames[dayIndex];

    // Build prompt for AI
    const prompt = `
Analyze this DAILY financial data for ${dayName} ONLY:

Total Spent Today: ${user.settings.currency || "₹"}${totalSpent.toFixed(2)}
Monthly Budget: ${
      user.settings.currency || "₹"
    }${user.settings.monthlyBudget.toFixed(2)}
Daily Budget Target: ${user.settings.currency || "₹"}${(
      (user.settings.monthlyBudget -
        user.settings.fixedExpenses.reduce((sum, e) => sum + e.amount, 0)) /
      30
    ).toFixed(2)}

Spending by Category (Today Only):
${Object.entries(entriesByCategory)
  .map(
    ([cat, amount]) =>
      `- ${cat}: ${user.settings.currency || "₹"}${amount.toFixed(2)}`
  )
  .join("\n")}

All Entries for ${dayName}:
${allEntries
  .map(
    (e) =>
      `- ${e.title}: ${user.settings.currency || "₹"}${e.amount.toFixed(2)} (${
        e.category
      })`
  )
  .join("\n")}

Please provide:
1. Analysis of TODAY'S spending only
2. Category breakdown for THIS DAY
3. Warning if over daily budget
4. Recommendations for tomorrow

DO NOT include weekly totals or data from other days.
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
      return NextResponse.json({
        userId: user._id,
        date: dateStr,
        type: "daily",
        summary: `You spent ${
          user.settings.currency || "₹"
        }${totalSpent.toFixed(2)} today. ${
          totalSpent > user.settings.monthlyBudget / 30
            ? "⚠️ This is above your daily average budget!"
            : "You're within your daily budget."
        }`,
        totalSpent,
        insights: [
          `Total spending: ${user.settings.currency || "₹"}${totalSpent.toFixed(
            2
          )}`,
          `Top category: ${
            Object.entries(entriesByCategory).sort(
              (a, b) => b[1] - a[1]
            )[0]?.[0] || "N/A"
          }`,
        ],
        recommendations: [
          "Set up your AI API key for detailed insights",
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
