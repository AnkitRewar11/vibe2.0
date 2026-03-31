export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, max_tokens } = body ?? {};

    if (!messages) {
      return NextResponse.json({ error: "Messages field is missing" }, { status: 400 });
    }

    const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_KEY) {
      return NextResponse.json({ error: "OPENROUTER_API_KEY is missing" }, { status: 500 });
    }

    // Preserve token limit (to avoid exceeding 402)
    const safeMaxTokens = Math.min(Number(max_tokens ?? 1024), 16000);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "anthropic/claude-sonnet-4.6",
        messages,
        stream: false,
        max_tokens: safeMaxTokens,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json(response.data, { status: 200 });

  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      console.error("OpenRouter API Error:", status, data);

      // If balance/credits are low
      if (status === 402) {
        return NextResponse.json(
          {
            error: "You don't have enough credits in your OpenRouter account.",
            details: data,
          },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: "Upstream API error", details: data },
        { status: status ?? 500 }
      );
    }

    console.error("Internal Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
