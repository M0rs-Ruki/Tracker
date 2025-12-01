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
    await dbConnect();

    const updateData: Record<string, unknown> = {};

    if (body.name) updateData.name = body.name;
    if (body.settings) updateData.settings = body.settings;
    if (body.onboardingCompleted !== undefined) {
      updateData.onboardingCompleted = body.onboardingCompleted;
    }

    // Encrypt AI keys before storing
    if (body.aiKeys) {
      const encryptedKeys: Record<string, string> = {};
      for (const [provider, key] of Object.entries(body.aiKeys)) {
        if (key && typeof key === "string") {
          encryptedKeys[provider] = encrypt(key);
        }
      }
      updateData.aiKeys = encryptedKeys;
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
