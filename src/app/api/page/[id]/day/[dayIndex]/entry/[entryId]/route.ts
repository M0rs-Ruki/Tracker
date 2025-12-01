import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Page from "@/models/Page";
import User from "@/models/User";

interface RouteParams {
  params: Promise<{ id: string; dayIndex: string; entryId: string }>;
}

// PATCH update entry
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, dayIndex, entryId } = await params;
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

    // Build update object dynamically
    const updateFields: Record<string, unknown> = {};
    if (body.title !== undefined)
      updateFields["days.$[day].entries.$[entry].title"] = body.title;
    if (body.amount !== undefined)
      updateFields["days.$[day].entries.$[entry].amount"] = body.amount;
    if (body.description !== undefined)
      updateFields["days.$[day].entries.$[entry].description"] =
        body.description;
    if (body.category !== undefined)
      updateFields["days.$[day].entries.$[entry].category"] = body.category;
    if (body.tags !== undefined)
      updateFields["days.$[day].entries.$[entry].tags"] = body.tags;

    const page = await Page.findOneAndUpdate(
      { _id: id, userId: user._id },
      { $set: updateFields },
      {
        new: true,
        arrayFilters: [{ "day.dayIndex": dayIdx }, { "entry._id": entryId }],
      }
    );

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Error updating entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE entry
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, dayIndex, entryId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dayIdx = parseInt(dayIndex);
    if (isNaN(dayIdx) || dayIdx < 1 || dayIdx > 7) {
      return NextResponse.json({ error: "Invalid day index" }, { status: 400 });
    }

    const page = await Page.findOneAndUpdate(
      { _id: id, userId: user._id, "days.dayIndex": dayIdx },
      {
        $pull: { "days.$.entries": { _id: entryId } },
      },
      { new: true }
    );

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("Error deleting entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
