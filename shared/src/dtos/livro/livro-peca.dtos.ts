import { TipoRegraPecaEnum } from "../../enums/tipo-regra-peca.enum";
import {
  LivroPendenciaCodigoEnum,
  LivroPendenciaGravidadeEnum,
} from "../../enums/livro-pendencia-codigo.enum";
import {
  LivroAberturaDadosDto,
  LivroAmplificadorDadosDto,
  LivroAmplificadoresDadosDto,
  LivroArquetipoDadosDto,
  LivroClasseDadosDto,
  LivroEquipamentoDadosDto,
  LivroEquipamentosDadosDto,
  LivroFaixasDadosDto,
  LivroFichaCriaturaDadosDto,
  LivroGenericoDadosDto,
  LivroGradeDadosDto,
  LivroHabilidadeCriaturaDadosDto,
  LivroHabilidadeDadosDto,
  LivroListaDadosDto,
  LivroModificacaoDadosDto,
  LivroModificacoesDadosDto,
  LivroModulosDadosDto,
  LivroNiveisAmeacaDadosDto,
  LivroOrigemDadosDto,
  LivroOrigensDadosDto,
  LivroRoteiroDadosDto,
  LivroSecaoDadosDto,
  LivroSubclasseDadosDto,
  LivroTabelaDadosDto,
  LivroTermoDadosDto,
  LivroTermosDadosDto,
  LivroTextoDadosDto,
} from "./livro-peca-dados.dtos";

/** Versão atual do contrato do JSON da fotografia (`livro_versao.formato`). */
export const LIVRO_FORMATO_ATUAL = 1;

/** Qual interface de `dados` cada tipo de peça carrega. */
export interface LivroPecaDadosPorTipo {
  [TipoRegraPecaEnum.SECAO]: LivroSecaoDadosDto;
  [TipoRegraPecaEnum.PARAGRAFO]: LivroTextoDadosDto;
  [TipoRegraPecaEnum.EXEMPLO]: LivroTextoDadosDto;
  [TipoRegraPecaEnum.FORMULA]: LivroTextoDadosDto;
  [TipoRegraPecaEnum.NOTA]: LivroTextoDadosDto;
  [TipoRegraPecaEnum.LISTA]: LivroListaDadosDto;
  [TipoRegraPecaEnum.TABELA]: LivroTabelaDadosDto;
  [TipoRegraPecaEnum.HABILIDADE]: LivroHabilidadeDadosDto;
  [TipoRegraPecaEnum.CLASSE]: LivroClasseDadosDto;
  [TipoRegraPecaEnum.ARQUETIPO]: LivroArquetipoDadosDto;
  [TipoRegraPecaEnum.SUBCLASSE]: LivroSubclasseDadosDto;
  [TipoRegraPecaEnum.ORIGENS]: LivroOrigensDadosDto;
  [TipoRegraPecaEnum.ORIGEM]: LivroOrigemDadosDto;
  [TipoRegraPecaEnum.TERMOS]: LivroTermosDadosDto;
  [TipoRegraPecaEnum.TERMO]: LivroTermoDadosDto;
  [TipoRegraPecaEnum.EQUIPAMENTOS]: LivroEquipamentosDadosDto;
  [TipoRegraPecaEnum.EQUIPAMENTO]: LivroEquipamentoDadosDto;
  [TipoRegraPecaEnum.MODIFICACOES]: LivroModificacoesDadosDto;
  [TipoRegraPecaEnum.MODIFICACAO]: LivroModificacaoDadosDto;
  [TipoRegraPecaEnum.AMPLIFICADORES]: LivroAmplificadoresDadosDto;
  [TipoRegraPecaEnum.AMPLIFICADOR]: LivroAmplificadorDadosDto;
  [TipoRegraPecaEnum.MODULOS]: LivroModulosDadosDto;
  [TipoRegraPecaEnum.NIVEIS_AMEACA]: LivroNiveisAmeacaDadosDto;
  [TipoRegraPecaEnum.FICHA_CRIATURA]: LivroFichaCriaturaDadosDto;
  [TipoRegraPecaEnum.HABILIDADE_CRIATURA]: LivroHabilidadeCriaturaDadosDto;
  [TipoRegraPecaEnum.ROTEIRO]: LivroRoteiroDadosDto;
  [TipoRegraPecaEnum.FAIXAS]: LivroFaixasDadosDto;
  [TipoRegraPecaEnum.GRADE]: LivroGradeDadosDto;
  [TipoRegraPecaEnum.ABERTURA]: LivroAberturaDadosDto;
  [TipoRegraPecaEnum.GENERICO]: LivroGenericoDadosDto;
}

/**
 * Peça de um livro: nó da árvore, na cópia de trabalho (`regra_peca`) e na fotografia
 * (`livro_versao.conteudo`). `ancora` é única por livro quando existe (nem toda peça é linkável,
 * por isso `null` é válido). `ordem` é a posição entre irmãs.
 */
export interface LivroPecaDto<TTipo extends TipoRegraPecaEnum = TipoRegraPecaEnum> {
  readonly identificador: string;
  readonly ancora: string | null;
  readonly tipo: TTipo;
  readonly ordem: number;
  readonly dados: LivroPecaDadosPorTipo[TTipo];
  readonly filhos: readonly LivroPecaDto[];
}

/**
 * Conteúdo de uma fotografia (`livro_versao.conteudo`): o livro inteiro congelado, com o
 * `identificador` de cada peça. `formato` é a versão deste contrato.
 */
export interface LivroVersaoConteudoDto {
  readonly formato: number;
  readonly codigo: string;
  readonly titulo: string;
  readonly subtitulo: string;
  /** Número editorial da versão (ex.: `4.1.4`). */
  readonly numero: string;
  readonly pecas: readonly LivroPecaDto[];
  /**
   * Âncoras que peças já tiveram e hoje levam a outra âncora (`antiga → atual`), para o link e a
   * URL publicados antes da renomeação continuarem valendo. Ausente quando não há nenhuma.
   */
  readonly ancorasAntigas?: Readonly<Record<string, string>>;
}

/** Entrada do validador: a árvore e se ela é a cópia de trabalho ou uma fotografia. */
export interface LivroArvoreValidarDto {
  readonly pecas: readonly LivroPecaDto[];
  /** `trabalho`: links resolvem por `identificador`. `fotografia`: links resolvem por `ancora`. */
  readonly modo: "trabalho" | "fotografia";
}

/** Uma pendência encontrada na árvore, apontando a peça e o caminho legível até ela. */
export interface LivroPendenciaDto {
  readonly codigo: LivroPendenciaCodigoEnum;
  readonly gravidade: LivroPendenciaGravidadeEnum;
  readonly identificador: string;
  /** Títulos das peças ancestrais até a peça (a própria incluída), para exibir "onde". */
  readonly caminho: readonly string[];
  readonly mensagem: string;
}
