/**
 * Texto relativo curto para um instante passado (ex.: "agora", "há 12s", "há 3 min", "há 2 h") —
 * extraído do `textoAtualizacao` de `CampanhaDetalhe` (m2-16) para ser reaproveitado também pela
 * linha do painel de controle (m2-18). Puro: quem chama decide o rótulo/prefixo ("Atualizado …")
 * e a cadência do relógio que recomputa (`agora`) — este util só faz a conta.
 */
export function rotuloRelativo(instanteMs: number, agoraMs: number): string {
  const segundos = Math.max(0, Math.floor((agoraMs - instanteMs) / 1000));
  if (segundos < 5) {
    return 'agora';
  }
  if (segundos < 60) {
    return `há ${segundos}s`;
  }
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) {
    return `há ${minutos} min`;
  }
  return `há ${Math.floor(minutos / 60)} h`;
}
