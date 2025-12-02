import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import {
  calculateWeeklySummary,
  generateWeeklyAIAnalysis,
} from "@/lib/weekly-summary";
import { sendWeeklyReport, WeeklyEmailData } from "@/lib/email";

// This endpoint is called by Vercel Cron
// Should be protected by vercel cron secret in production
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Find all users with weekly reports enabled
    const users = await User.find({
      "emailSettings.weeklyReportsEnabled": true,
    });

    console.log(`Processing weekly emails for ${users.length} users`);

    const results = {
      total: users.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const user of users) {
      try {
        // Calculate weekly summary
        const summaryData = await calculateWeeklySummary(user._id.toString());

        // Calculate budget metrics
        const fixedExpensesTotal = (user.settings.fixedExpenses || []).reduce(
          (sum, expense) => sum + (expense.amount || 0),
          0
        );
        const realMonthlyBudget =
          user.settings.monthlyBudget - fixedExpensesTotal;
        const weeklyBudget = realMonthlyBudget / 4;
        const difference = summaryData.weekTotal - weeklyBudget;
        const isOverBudget = difference > 0;

        // Generate AI analysis
        const aiAnalysis = await generateWeeklyAIAnalysis(user, summaryData);

        // Prepare email data
        const emailData: WeeklyEmailData = {
          userName: user.name,
          currency: user.settings.currency || "₹",
          monthlyBudget: user.settings.monthlyBudget,
          fixedExpensesTotal,
          realMonthlyBudget,
          weeklyBudget,
          weekTotal: summaryData.weekTotal,
          difference,
          isOverBudget,
          aiAnalysis,
        };

        // Send email
        await sendWeeklyReport(user.email, emailData);

        results.success++;
        console.log(`✓ Sent weekly email to ${user.email}`);
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed for ${user.email}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        results.errors.push(errorMsg);
        console.error(`✗ ${errorMsg}`);
      }
    }

    return NextResponse.json({
      message: "Weekly emails processed",
      results,
    });
  } catch (error) {
    console.error("Error processing weekly emails:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
