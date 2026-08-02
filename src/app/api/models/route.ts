import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const openrouterKey = request.headers.get("x-openrouter-key") || "";

    const headers: Record<string, string> = {};
    if (openrouterKey) {
      headers["Authorization"] = "Bearer " + openrouterKey;
    }

    const response = await fetch("https://openrouter.ai/api/v1/models?sort=top-weekly", {
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "OpenRouter responded with " + response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Models proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
