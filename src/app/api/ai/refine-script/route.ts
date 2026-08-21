import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MODEL = "google/gemini-2.5-flash:free";
const TIMEOUT_MS = 20000;

function extractJsonObject(content: string): Record<string, unknown> | null {
  if (!content) return null;

  const clean = content
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  let jsonString = clean.slice(first, last + 1);
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* tenta a versão corrigida abaixo */
  }

  jsonString = jsonString.replace(/,\s*([}\]])/g, "$1");
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentScript, instructions, model, apiKey, apiKeys } =
      (body || {}) as {
        currentScript?: Record<string, string>;
        instructions?: string;
        model?: string;
        apiKey?: string;
        apiKeys?: string[];
      };

    if (!currentScript || !currentScript.hook) {
      return NextResponse.json(
        { error: "currentScript e obrigatorio" },
        { status: 400 }
      );
    }

    const keyList: string[] = [];
    if (Array.isArray(apiKeys)) {
      keyList.push(...apiKeys.filter((k) => k?.trim()));
    }
    if (typeof apiKey === "string" && apiKey.trim() && !keyList.includes(apiKey)) {
      keyList.push(apiKey.trim());
    }
    const headerToken = request.headers.get("x-ai-custom-token")?.trim();
    if (headerToken && !keyList.includes(headerToken)) {
      keyList.push(headerToken);
    }
    if (keyList.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma API Key do OpenRouter configurada" },
        { status: 400 }
      );
    }

    const systemPrompt = `Voce e um roteirista especialista em Reels/TikTok/Shorts. Refine o roteiro fornecido mantendo a estrutura de 3 blocos (Gancho, Desenvolvimento [Dor + Solucao integradas], CTA) e retorne APENAS um objeto JSON valido (sem markdown, sem texto extra) com esta estrutura exata:
{"headline": "nova headline curta", "hook": "novo gancho", "development": "desenvolvimento fluido e coeso (dor + solucao em um paragrafo)", "cta": "novo cta"}

REGRAS DE INDEPENDENCIA: O roteiro refinado DEVE manter cada bloco (Gancho, Desenvolvimento, CTA) semanticamente independente. Nenhum bloco pode depender de outro para ser compreendido. Todos os blocos devem extrair contexto exclusivamente do briefing original. O usuario podera combinar qualquer Gancho com qualquer Desenvolvimento e qualquer CTA.

Regra estrita: ${instructions || "Deixe mais informal, persuasivo e com ganchos fortes para Reels/TikTok, mantendo a estrutura de 3 blocos e preservando a independencia semantica de cada bloco"}`;

    const userPrompt =
      "Roteiro atual:\n" + JSON.stringify(currentScript, null, 2);

    const modelsToTry: string[] = [];
    if (typeof model === "string" && model.trim()) {
      modelsToTry.push(model.trim());
    }
    if (!modelsToTry.includes(DEFAULT_MODEL)) {
      modelsToTry.push(DEFAULT_MODEL);
    }

    let lastError = "Todos os modelos falharam.";

    for (const key of keyList) {
      for (const m of modelsToTry) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const res = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + key,
                "HTTP-Referer": "https://contenthub.app",
                "X-Title": "ContentHub",
              },
              body: JSON.stringify({
                model: m,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                temperature: 0.9,
                max_tokens: 1024,
              }),
              signal: controller.signal,
            }
          );
          clearTimeout(timeout);

          if (!res.ok) {
            const errData = await res.json().catch(() => null) as
              | { error?: { message?: string } }
              | null;
            const msg =
              errData?.error?.message ||
              `erro HTTP ${res.status}`;
            lastError = `OpenRouter ${res.status}: ${msg}`;
            if (res.status === 429 || res.status === 401 || res.status === 403) {
              break;
            }
            continue;
          }

          const data = await res.json();
          const content: string =
            data?.choices?.[0]?.message?.content || "";
          const parsed = extractJsonObject(content);

          if (parsed && typeof parsed.hook === "string") {
            return NextResponse.json({
              headline:
                typeof parsed.headline === "string" ? parsed.headline : undefined,
              hook: parsed.hook,
              development:
                typeof parsed.development === "string" ? parsed.development : undefined,
              cta: typeof parsed.cta === "string" ? parsed.cta : undefined,
            });
          }

          lastError = "A IA nao retornou um objeto JSON valido.";
        } catch (err) {
          clearTimeout(timeout);
          if (err instanceof Error && err.name === "AbortError") {
            lastError = "A IA demorou muito para responder. Tente novamente.";
          } else {
            lastError = err instanceof Error ? err.message : "Erro desconhecido";
          }
          continue;
        }
      }
    }

    return NextResponse.json({ error: lastError }, { status: 502 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 400 }
    );
  }
}