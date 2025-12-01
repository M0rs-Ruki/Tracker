import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Page from "@/models/Page";
import User from "@/models/User";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string; dayIndex: string }>;
}

// POST add entry to a day
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, dayIndex } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dayIdx = parseInt(dayIndex);
    if (isNaN(dayIdx) || dayIdx < 1 || dayIdx > 7) {
      return NextResponse.json({ error: "Invalid day index" }, { status: 400 });
    }

    const newEntry = {
      _id: new mongoose.Types.ObjectId(),
      title: body.title || "New Entry",
      amount: body.amount || 0,
      description: body.description || "",
      category: body.category || "",
      tags: body.tags || [],
      createdAt: new Date(),
    };

    const page = await Page.findOneAndUpdate(
      {
        _id: id,
        userId: user._id,
        "days.dayIndex": dayIdx,
      },
      {
        $push: { "days.$.entries": newEntry },
      },
      { new: true }
    );

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ entry: newEntry, page }, { status: 201 });
  } catch (error) {
    console.error("Error adding entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
