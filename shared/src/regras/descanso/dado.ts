import { ESCADA_DADOS } from './descanso.dados';
import { DadoAjustarDto, DadoDescreverDto, DadoElevarDto } from './descanso.dtos';

/**
 * Move um dado `modificador` passos na `ESCADA_DADOS`, com trava nos dois
 * extremos: um modificador negativo (ambiente insalubre) desce a escada, um
 * positivo (confortável/refeição) sobe, sem passar do menor (D3) nem do maior
 * (D20) dado. Espelha `tipoDado` do site antigo.
 *
 * Espera-se `dadoBase` já na escada (os dados de descanso são D4/D6/D8). Para um
 * `dadoBase` fora da escada, replica o fallback do site (`indexOf` = −1 → parte
 * do degrau abaixo do menor), preservado por paridade — não é caminho esperado.
 */
export function ajustarDado(dto: DadoAjustarDto): number {
  const indice = ESCADA_DADOS.indexOf(dto.dadoBase);
  const indiceFinal = Math.max(0, Math.min(ESCADA_DADOS.length - 1, indice + dto.modificador));
  return ESCADA_DADOS[indiceFinal];
}

/**
 * Sobe um dado `passos` degraus na `ESCADA_DADOS`, sem ultrapassar `limite`
 * (quando informado) nem o topo da escada. Se `faces` não estiver na escada,
 * devolve `faces` inalterado. Espelha `_upgradeDie` do site antigo.
 *
 * Primitiva compartilhada da escada de dados: o descanso não a usa (usa
 * `ajustarDado`), mas a aba compras (m1-05) eleva o dado de dano de armas com
 * teto (ex.: Pesada limitada a D10). `limite` deve ser um degrau da escada.
 */
export function elevarDado(dto: DadoElevarDto): number {
  const indice = ESCADA_DADOS.indexOf(dto.faces);
  if (indice === -1) {
    return dto.faces;
  }
  const indiceLimite = dto.limite ? ESCADA_DADOS.indexOf(dto.limite) : ESCADA_DADOS.length - 1;
  return ESCADA_DADOS[Math.min(indice + dto.passos, indiceLimite)];
}

/**
 * Notação de exibição de um dado: `"D8"` para 8 faces, `"—"` quando não há dado
 * (`null` ou 0). Espelha `descDado` do site antigo — cujo ramo `faces === 0 →
 * "0"` era código morto (o `if (!faces)` já captura o 0), então 0 mapeia para
 * `"—"` por paridade.
 */
export function descreverDado(dto: DadoDescreverDto): string {
  if (!dto.faces) {
    return '—';
  }
  return `D${dto.faces}`;
}
