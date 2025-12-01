import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// POST - Clean up duplicate fields in user document
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Remove the duplicate root-level fields (monthlyBudget and fixedExpenses)
    const result = await User.updateOne(
      { email: session.user.email },
      {
        $unset: {
          monthlyBudget: "",
          fixedExpenses: "",
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Cleaned up duplicate fields",
      result,
    });
  } catch (error) {
    console.error("Error cleaning up user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
