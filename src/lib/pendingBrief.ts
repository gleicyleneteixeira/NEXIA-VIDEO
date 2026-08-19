"use client";

/**
 * Briefing/texto pendente para o modulo de Criador de Conteudo (Calendario).
 * A aba de transcricao grava o texto aqui; o calendario consome no mount
 * para preencher o campo de conteudo/dor.
 */

let pending: string | null = null;

export function setPendingBrief(text: string): void {
  pending = text;
}

export function consumePendingBrief(): string | null {
  const text = pending;
  pending = null;
  return text;
}

export function hasPendingBrief(): boolean {
  return pending !== null;
}