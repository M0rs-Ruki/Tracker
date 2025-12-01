import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// GET presence status of AI keys (no secrets returned)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const userDoc = await User.findOne({ email: session.user.email });
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const user = userDoc.toObject();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const aiKeys = user.aiKeys || {};
    // Debug: log raw and decrypted values
    try {
      const { decrypt } = await import("@/lib/encryption");
      Object.entries(aiKeys).forEach(([provider, val]) => {
        if (val) {
          let decrypted = "";
          try {
            decrypted = decrypt(val);
          } catch (e) {
            decrypted = "(decryption failed)";
          }
          console.log(
            `AI key for ${provider}: raw=`,
            val,
            "decrypted=",
            decrypted
          );
        } else {
          console.log(`AI key for ${provider}: not set or empty`);
        }
      });
    } catch (e) {
      console.log("Could not import decrypt for debug:", e);
    }
    const status = {
      openai: Boolean(aiKeys.openai),
      google: Boolean(aiKeys.google),
      anthropic: Boolean(aiKeys.anthropic),
      openrouter: Boolean(aiKeys.openrouter),
      huggingface: Boolean(aiKeys.huggingface),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching AI key status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
