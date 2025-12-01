import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/mongodb";
import Page from "@/models/Page";
import User from "@/models/User";

// GET all pages for current user
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
    const folderId = searchParams.get("folderId");

    const query: Record<string, unknown> = { userId: user._id };
    if (folderId) {
      query.folderId = folderId === "null" ? null : folderId;
    }

    const pages = await Page.find(query).sort({ order: 1 });
    return NextResponse.json(pages);
  } catch (error) {
    console.error("Error fetching pages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new page with 7 days
export async function POST(request: NextRequest) {
  try {
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

    // Get the highest order
    const lastPage = await Page.findOne({
      userId: user._id,
      folderId: body.folderId || null,
    }).sort({ order: -1 });

    // Create page with 7 empty days
    const days = Array.from({ length: 7 }, (_, i) => ({
      dayIndex: i + 1,
      entries: [],
    }));

    const page = await Page.create({
      userId: user._id,
      folderId: body.folderId || null,
      title: body.title || "Untitled Page",
      icon: body.icon || "📄",
      days,
      order: lastPage ? lastPage.order + 1 : 0,
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Error creating page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
