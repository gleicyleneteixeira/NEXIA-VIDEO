import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const provider = request.nextUrl.searchParams.get("provider") || "openrouter";

    const openrouterKey =
      request.headers.get("x-openrouter-key") ||
      request.headers.get("x-ai-custom-token") ||
      "";
    const groqKey = request.headers.get("x-groq-key") || "";

    if (provider === "groq") {
      if (!groqKey) {
        return NextResponse.json(
          { error: "Groq API key not provided" },
          { status: 400 }
        );
      }
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: "Bearer " + groqKey },
      });
      if (!response.ok) {
        return NextResponse.json(
          { error: "Groq responded with " + response.status },
          { status: response.status }
        );
      }
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (provider === "ollama") {
      try {
        const response = await fetch("http://localhost:11434/api/tags", {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          return NextResponse.json(
            { error: "Ollama not reachable" },
            { status: 502 }
          );
        }
        const data = await response.json();
        const models = (data.models || []).map((m: any) => ({
          id: m.name,
          name: m.name,
          provider: "ollama",
        }));
        return NextResponse.json({ data: models });
      } catch {
        return NextResponse.json(
          { error: "Ollama not running on localhost:11434" },
          { status: 502 }
        );
      }
    }

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
