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

    // Token limit को सुरक्षित रखना (402 से बचने के लिए)
    const safeMaxTokens = Math.min(Number(max_tokens ?? 1024), 16000);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemini-2.5-flash-preview-09-2025",
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

      // अगर balance/credits कम है
      if (status === 402) {
        return NextResponse.json(
          {
            error: "आपके OpenRouter खाते में पर्याप्त credits नहीं हैं।",
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
