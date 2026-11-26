import type {
  FichaCriaturaExportadaDto,
  FichaCriaturaRecuperadaDto,
  FichaNpcExportadaDto,
  FichaNpcRecuperadaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import { TipoFichaEnum } from '@contratados-rpg/shared/enums';

/**
 * Montagem e leitura do arquivo JSON de ficha (`ficha-json-exportar-importar-admin`). Funções
 * puras: a página só copia/baixa o texto e encaminha o resultado lido à criação. A validação aqui
 * é só do **envelope**; o documento `dados` é validado pelo backend contra `shared/regras`.
 */

export type FichaExportada = FichaCriaturaExportadaDto | FichaNpcExportadaDto;

const FORMATO = 'contratados-rpg.ficha' as const;
const VERSAO = 1 as const;

/** Monta o envelope de uma criatura recuperada — sem id, dono, campanha, imagem nem `oculta`. */
export function montarCriaturaExportada(
  ficha: FichaCriaturaRecuperadaDto,
  agora: Date = new Date(),
): FichaCriaturaExportadaDto {
  return {
    formato: FORMATO,
    versao: VERSAO,
    tipo: TipoFichaEnum.CRIATURA,
    exportacaoData: agora.toISOString(),
    nome: ficha.nome,
    cor: ficha.cor,
    dados: ficha.dados,
  };
}

/** Mesmo recorte de {@link montarCriaturaExportada}, para NPC. */
export function montarNpcExportado(
  ficha: FichaNpcRecuperadaDto,
  agora: Date = new Date(),
): FichaNpcExportadaDto {
  return {
    formato: FORMATO,
    versao: VERSAO,
    tipo: TipoFichaEnum.NPC,
    exportacaoData: agora.toISOString(),
    nome: ficha.nome,
    cor: ficha.cor,
    dados: ficha.dados,
  };
}

/** Texto do arquivo: JSON indentado com quebra de linha final. */
export function serializarFichaExportada(ficha: FichaExportada): string {
  return `${JSON.stringify(ficha, null, 2)}\n`;
}

/** Nome do arquivo: tipo + nome sem acento nem símbolo (`criatura-sombra-faminta.json`). */
export function nomeArquivoFichaExportada(ficha: FichaExportada): string {
  const base = ficha.nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const prefixo = ficha.tipo === TipoFichaEnum.CRIATURA ? 'criatura' : 'npc';
  return `${prefixo}-${base || 'sem-nome'}.json`;
}

export type LeituraFichaExportada =
  | { readonly ok: true; readonly ficha: FichaExportada }
  | { readonly ok: false; readonly erro: string };

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

/**
 * Lê o texto colado/carregado e devolve o envelope ou a mensagem de erro para o modal. Não
 * confere o conteúdo de `dados` (o backend recusa com a mensagem da regra violada).
 */
export function lerFichaExportada(texto: string): LeituraFichaExportada {
  if (!texto.trim()) {
    return { ok: false, erro: 'Cole o JSON da ficha ou escolha um arquivo.' };
  }
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erro: 'O texto não é um JSON válido.' };
  }
  if (!ehObjeto(bruto) || bruto['formato'] !== FORMATO) {
    return { ok: false, erro: 'Este JSON não é uma ficha exportada do Contratados.' };
  }
  if (bruto['versao'] !== VERSAO) {
    return { ok: false, erro: `Versão de arquivo não suportada: ${String(bruto['versao'])}.` };
  }
  const tipo = bruto['tipo'];
  if (tipo !== TipoFichaEnum.CRIATURA && tipo !== TipoFichaEnum.NPC) {
    return { ok: false, erro: 'Só é possível importar ficha de Criatura ou de NPC.' };
  }
  const nome = bruto['nome'];
  if (typeof nome !== 'string' || !nome.trim()) {
    return { ok: false, erro: 'A ficha não tem nome.' };
  }
  const cor = bruto['cor'];
  if (cor !== undefined && cor !== null && typeof cor !== 'string') {
    return { ok: false, erro: 'A cor da ficha é inválida.' };
  }
  if (!ehObjeto(bruto['dados'])) {
    return { ok: false, erro: 'A ficha não tem o documento de jogo (`dados`).' };
  }
  return {
    ok: true,
    ficha: {
      ...(bruto as unknown as FichaExportada),
      nome: nome.trim(),
      cor: (cor as string | null | undefined) ?? null,
    },
  };
}
