import type { TipoFichaEnum } from '../../enums';
import type { FichaCriaturaDadosDto } from './ficha-criatura.dtos';
import type { FichaNpcDadosDto } from './ficha-npc.dtos';

/**
 * Envelope do **arquivo JSON** de uma ficha (`ficha-json-exportar-importar-admin`): o que o acervo
 * copia/baixa e o que o modal de importar aceita de volta. Carrega só o conteúdo — `nome`, `cor` e o
 * documento de jogo `dados` exatamente como a API devolve. Identidade e posse (`id`, dono, campanha,
 * imagem, enquadramento, `oculta`) **não** viajam: a importação sempre cria uma ficha nova no acervo
 * de quem importa, e o backend revalida `dados` contra `shared/regras` como em qualquer criação.
 *
 * `formato`/`versao` identificam o arquivo; uma mudança incompatível no envelope sobe a `versao`.
 */
export interface FichaCriaturaExportadaDto {
  readonly formato: 'contratados-rpg.ficha';
  readonly versao: 1;
  readonly tipo: TipoFichaEnum.CRIATURA;
  /** ISO 8601 do momento da exportação — informativo, ignorado na importação. */
  readonly exportacaoData: string;
  readonly nome: string;
  readonly cor: string | null;
  readonly dados: FichaCriaturaDadosDto;
}

/** Mesmo envelope de {@link FichaCriaturaExportadaDto}, para NPC. */
export interface FichaNpcExportadaDto {
  readonly formato: 'contratados-rpg.ficha';
  readonly versao: 1;
  readonly tipo: TipoFichaEnum.NPC;
  readonly exportacaoData: string;
  readonly nome: string;
  readonly cor: string | null;
  readonly dados: FichaNpcDadosDto;
}

/**
 * Entrada da importação administrativa (`POST /ficha/importar`, só `ADMIN`): o próprio arquivo
 * exportado. A ficha nasce solta no acervo de quem importa e é validada **como edição** — regras do
 * jogo sim, distribuição de criação não —, para que uma ficha ajustada depois de criada volte igual.
 */
export interface FichaImportarDto {
  readonly ficha: FichaCriaturaExportadaDto | FichaNpcExportadaDto;
}

/** Saída da importação — o `id` da ficha criada e o tipo, para a tela abrir a rota certa. */
export interface FichaImportadaDto {
  readonly id: number;
  readonly tipo: TipoFichaEnum.CRIATURA | TipoFichaEnum.NPC;
}
