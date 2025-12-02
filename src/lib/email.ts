import nodemailer from "nodemailer";

export interface WeeklyEmailData {
  userName: string;
  currency: string;
  monthlyBudget: number;
  fixedExpensesTotal: number;
  realMonthlyBudget: number;
  weeklyBudget: number;
  weekTotal: number;
  difference: number;
  isOverBudget: boolean;
  aiAnalysis: string;
}

export async function sendWeeklyReport(
  recipientEmail: string,
  data: WeeklyEmailData
): Promise<void> {
  // Get mail server settings from environment variables
  const mailHost = process.env.MAIL_HOST;
  const mailPort = parseInt(process.env.MAIL_PORT || "587");
  const mailUser = process.env.MAIL_USER;
  const mailPassword = process.env.MAIL_PASSWORD;

  if (!mailHost || !mailUser || !mailPassword) {
    throw new Error(
      "Mail server settings not configured in environment variables"
    );
  }

  // Create transporter with SMTP settings from .env
  const transporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: mailPort === 465,
    auth: {
      user: mailUser,
      pass: mailPassword,
    },
  });

  // Build email content
  const emailBody = generateEmailBody(data);

  // Send email
  await transporter.sendMail({
    from: `"Budget Tracker" <${mailUser}>`,
    to: recipientEmail,
    subject: "Your Weekly Budget AI Summary",
    text: emailBody,
    html: generateEmailHtml(data),
  });
}

function generateEmailBody(data: WeeklyEmailData): string {
  const status = data.isOverBudget
    ? "⚠️ You overspent this week"
    : "✓ You stayed under your weekly budget";

  return `Hello ${data.userName}, here is your weekly spending analysis:

Monthly Budget: ${data.currency}${data.monthlyBudget.toFixed(2)}
Fixed Expenses Total: ${data.currency}${data.fixedExpensesTotal.toFixed(2)}
Real Monthly Budget: ${data.currency}${data.realMonthlyBudget.toFixed(2)}
Weekly Budget: ${data.currency}${data.weeklyBudget.toFixed(2)}

You Spent This Week: ${data.currency}${data.weekTotal.toFixed(2)}
Difference: ${data.currency}${Math.abs(data.difference).toFixed(2)} ${
    data.isOverBudget ? "over" : "under"
  } budget
Status: ${status}

AI Analysis:
${data.aiAnalysis}

---
This is an automated weekly report from your Budget Tracker.
To disable these emails, update your settings in the app.
`;
}

function generateEmailHtml(data: WeeklyEmailData): string {
  const status = data.isOverBudget
    ? "⚠️ You overspent this week"
    : "✓ You stayed under your weekly budget";
  const statusColor = data.isOverBudget ? "#ef4444" : "#22c55e";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Budget Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #111; margin-top: 0; font-size: 24px;">Your Weekly Budget AI Summary</h1>
    <p style="font-size: 16px;">Hello <strong>${
      data.userName
    }</strong>, here is your weekly spending analysis:</p>
    
    <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 18px; color: #374151;">Budget Overview</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Monthly Budget:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${
            data.currency
          }${data.monthlyBudget.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Fixed Expenses Total:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${
            data.currency
          }${data.fixedExpensesTotal.toFixed(2)}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 8px 0; color: #374151; font-weight: 600;">Real Monthly Budget:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #374151;">${
            data.currency
          }${data.realMonthlyBudget.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Weekly Budget:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${
            data.currency
          }${data.weeklyBudget.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: ${
      data.isOverBudget ? "#fef2f2" : "#f0fdf4"
    }; border-left: 4px solid ${statusColor}; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 18px; color: #374151;">This Week's Spending</h2>
      <p style="font-size: 32px; font-weight: bold; margin: 10px 0; color: ${statusColor};">${
    data.currency
  }${data.weekTotal.toFixed(2)}</p>
      <p style="margin: 5px 0; color: #6b7280;">
        ${data.currency}${Math.abs(data.difference).toFixed(2)} ${
    data.isOverBudget ? "over" : "under"
  } budget
      </p>
      <p style="margin: 10px 0 0 0; font-weight: 600; color: ${statusColor};">${status}</p>
    </div>

    <div style="background-color: #eff6ff; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 18px; color: #374151;">🤖 AI Analysis</h2>
      <div style="white-space: pre-line; color: #374151; line-height: 1.8;">${
        data.aiAnalysis
      }</div>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      This is an automated weekly report from your Budget Tracker.<br>
      To disable these emails, update your settings in the app.
    </p>
  </div>
</body>
</html>
`;
}
