import { chatTable, frameTable } from "@/config/schema";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { eq } from "drizzle-orm";
import { and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const frameId = searchParams.get("frameId");
  const projectId = searchParams.get("projectId");

  const frameResult = await db.select().from(frameTable)

    //@ts-ignore
    .where(eq(frameTable.frameId, frameId));

  const chatResult = await db.select()
    .from(chatTable)

    //@ts-ignore
    .where(eq(chatTable.frameId, frameId));

  const finalResult = {
    ...frameResult[0],
    chatMessages: chatResult[0].chatMessage,
  };

  return NextResponse.json(finalResult);
}

export async function PUT(req: NextRequest) {
  try {
    const { designCode, frameId, projectId } = await req.json();

    if (!designCode || !frameId || !projectId) {
      return NextResponse.json(
        { error: "designCode, frameId, and projectId required" },
        { status: 400 }
      );
    }

    const result = await db
      .update(frameTable)
      .set({ designCode })
      .where(
        and(
          eq(frameTable.frameId, frameId),
          eq(frameTable.projectId, projectId)
        )
      );

    return NextResponse.json({ success: true, result });
  } catch (err) {
    console.error("/api/frame PUT error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
