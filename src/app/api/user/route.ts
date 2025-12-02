import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { encrypt } from "@/lib/encryption";

// GET current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email }).select(
      "-aiKeys"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH update user settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("=== PATCH /api/user ===");
    console.log("Body received:", JSON.stringify(body, null, 2));
    console.log("fixedExpenses in body:", body.settings?.fixedExpenses);

    await dbConnect();

    // First get the current user to merge settings
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name;

    // Merge settings instead of replacing
    if (body.settings) {
      updateData.settings = {
        monthlyBudget:
          body.settings.monthlyBudget !== undefined
            ? body.settings.monthlyBudget
            : currentUser.settings?.monthlyBudget ?? 0,
        currency:
          body.settings.currency !== undefined
            ? body.settings.currency
            : currentUser.settings?.currency ?? "₹",
        fixedExpenses:
          body.settings.fixedExpenses !== undefined
            ? body.settings.fixedExpenses
            : currentUser.settings?.fixedExpenses ?? [],
        preferredAIProvider:
          body.settings.preferredAIProvider !== undefined
            ? body.settings.preferredAIProvider
            : currentUser.settings?.preferredAIProvider ?? "openai",
      };
      console.log(
        "Settings to save:",
        JSON.stringify(updateData.settings, null, 2)
      );
    }

    if (body.onboardingCompleted !== undefined) {
      updateData.onboardingCompleted = body.onboardingCompleted;
    }

    // Encrypt AI keys before storing
    if (body.aiKeys) {
      console.log("AI Keys received in PATCH:", Object.keys(body.aiKeys));
      const encryptedKeys: Record<string, string> = {};
      for (const [provider, key] of Object.entries(body.aiKeys)) {
        if (key && typeof key === "string") {
          console.log(`Encrypting key for provider: ${provider}`);
          encryptedKeys[provider] = encrypt(key);
        }
      }
      console.log("Providers with non-empty keys:", Object.keys(encryptedKeys));
      // Use dot notation to update each key individually
      for (const [provider, encKey] of Object.entries(encryptedKeys)) {
        updateData[`aiKeys.${provider}`] = encKey;
      }
      if (Object.keys(encryptedKeys).length === 0) {
        console.log("No valid AI keys to update.");
      }
    }

    // Handle email settings
    if (body.emailSettings) {
      console.log("Email settings received in PATCH");
      updateData["emailSettings.weeklyReportsEnabled"] =
        body.emailSettings.weeklyReportsEnabled ?? false;
    }

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: updateData },
      { new: true }
    ).select("-aiKeys");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
