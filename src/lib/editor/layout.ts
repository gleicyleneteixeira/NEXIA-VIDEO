/**
 * Posiciona um menu fixo dentro do viewport (Smart Viewport Clamping & Flip-Up):
 * se o menu estouraria a borda inferior ou lateral da janela, ele é invertido
 * para cima / reposicionado para a esquerda e mantido dentro do padding.
 */
export interface ContextMenuPosition {
  x: number;
  y: number;
}

export function calculateSafeMenuPosition(
  clickX: number,
  clickY: number,
  menuWidth = 190,
  menuHeight = 240,
  padding = 12
): ContextMenuPosition {
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

  // Eixo X: se estouraria a borda direita, inverte para a esquerda.
  let safeX = clickX;
  if (clickX + menuWidth > windowWidth - padding) {
    safeX = clickX - menuWidth;
  }

  // Eixo Y: se estouraria a borda inferior, move o menu para CIMA do cursor.
  let safeY = clickY;
  if (clickY + menuHeight > windowHeight - padding) {
    safeY = Math.max(padding, clickY - menuHeight);
  }

  return {
    x: Math.max(padding, safeX),
    y: Math.max(padding, safeY),
  };
}