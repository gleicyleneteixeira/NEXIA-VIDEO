"use client";

import { createClient } from "@/lib/supabase/client";

export type SystemEventType =
  | "USER_CREATED"
  | "PASSWORD_RESET_REQUESTED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUSED"
  | "TEST_COMPLETED";

interface WebhookPayload {
  event: SystemEventType;
  timestamp: string;
  user: {
    id?: string;
    email?: string;
    name?: string;
    phone?: string;
    cpf?: string;
  };
  data?: Record<string, any>;
}

export async function triggerWebhook(
  event: SystemEventType,
  userData: WebhookPayload["user"],
  extraData?: Record<string, any>
): Promise<void> {
  try {
    const supabase = createClient();

    const { data: settings } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", ["global_webhook_url", "global_webhook_enabled"]);

    const webhookUrl = settings?.find((s) => s.key === "global_webhook_url")?.value;
    const isEnabled =
      settings?.find((s) => s.key === "global_webhook_enabled")?.value === "true";

    if (!isEnabled || !webhookUrl) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      user: userData,
      data: extraData || {},
    };

    fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch((err) => console.error("Erro ao disparar Webhook:", err));
  } catch (error) {
    console.error("Falha ao processar triggerWebhook:", error);
  }
}