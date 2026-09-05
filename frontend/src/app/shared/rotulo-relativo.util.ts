/**
 * Texto relativo curto para um instante passado (ex.: "agora", "há 12s", "há 3 min", "há 2 h",
 * "há 5 dias", "há 2 semanas", "há 3 meses", "há 1 ano") — extraído do `textoAtualizacao` de
 * `CampanhaDetalhe` (m2-16) para ser reaproveitado também pela linha do painel de controle
 * (m2-18) e pelo feed/histórico de rolagens (`tempoRolagem`). Puro: quem chama decide o
 * rótulo/prefixo ("Atualizado …") e a cadência do relógio que recomputa (`agora`) — este util só
 * faz a conta. Dia/semana/mês/ano são aproximações de calendário (30/365 dias) — suficiente pra um
 * rótulo relativo curto, sem puxar uma lib de datas pra isso.
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
  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    return `há ${horas} h`;
  }
  const dias = Math.floor(horas / 24);
  if (dias < 7) {
    return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }
  const semanas = Math.floor(dias / 7);
  if (dias < 30) {
    return `há ${semanas} ${semanas === 1 ? 'semana' : 'semanas'}`;
  }
  const meses = Math.floor(dias / 30);
  if (dias < 365) {
    return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }
  const anos = Math.floor(dias / 365);
  return `há ${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}
