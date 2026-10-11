import { normalizarPaleta } from '../paleta/paleta';

/** Opção do menu de inserção: `termos` são apelidos que também casam com o filtro (`/hab`, `/nota`…). */
export interface MenuInsercaoOpcao {
  readonly id: string;
  readonly rotulo: string;
  readonly descricao?: string;
  /** Marca curta à esquerda (um glifo ou sigla). */
  readonly marca?: string;
  readonly termos?: readonly string[];
}

/**
 * Filtra as opções pelo que foi digitado: rótulo ou apelido que começa com o termo vem primeiro,
 * depois início de palavra e por fim trecho. Termo vazio devolve todas, na ordem recebida; um
 * `/` na frente do termo é ignorado (o menu abre pelo `/`).
 */
export function filtrarMenuInsercao(opcoes: readonly MenuInsercaoOpcao[], consulta: string): MenuInsercaoOpcao[] {
  const termo = normalizarPaleta(consulta.replace(/^\s*\//, ''));
  if (!termo) return [...opcoes];
  const pontuadas: { opcao: MenuInsercaoOpcao; ponto: number; ordem: number }[] = [];
  opcoes.forEach((opcao, ordem) => {
    const candidatos = [opcao.rotulo, ...(opcao.termos ?? [])].map(normalizarPaleta);
    const ponto = candidatos.some((c) => c.startsWith(termo)) ? 0
      : candidatos.some((c) => c.includes(` ${termo}`)) ? 1
      : candidatos.some((c) => c.includes(termo)) ? 2
      : normalizarPaleta(opcao.descricao ?? '').includes(termo) ? 3 : -1;
    if (ponto >= 0) pontuadas.push({ opcao, ponto, ordem });
  });
  return pontuadas.sort((a, b) => a.ponto - b.ponto || a.ordem - b.ordem).map(({ opcao }) => opcao);
}
