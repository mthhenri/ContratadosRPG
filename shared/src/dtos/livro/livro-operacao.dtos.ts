import { TipoUsuarioEnum } from "../../enums/tipo-usuario.enum";
import { TipoLivroVersaoSituacaoEnum } from "../../enums/tipo-livro-versao-situacao.enum";
import { TipoRegraPecaEnum } from "../../enums/tipo-regra-peca.enum";
import { LivroPecaDadosPorTipo, LivroPendenciaDto, LivroVersaoConteudoDto } from "./livro-peca.dtos";

/** Livro de regras (Sistema, Guia do Mestre, expansões). `codigo` vira a URL `/regras/<codigo>`. */
export interface LivroResumoDto {
  readonly id: number;
  readonly codigo: string;
  readonly titulo: string;
  readonly ordem: number;
}

export interface LivroCodigoRecuperarDto {
  readonly codigo: string;
}

export interface LivroInternoCriarDto {
  readonly codigo: string;
  readonly titulo: string;
  readonly ordem: number;
}

/** Peça da cópia de trabalho (`regra_peca`), com o `dados` completo. */
export interface RegraPecaRecuperadaDto {
  readonly id: number;
  readonly livroId: number;
  readonly pecaPaiId: number | null;
  readonly tipo: TipoRegraPecaEnum;
  readonly identificador: string;
  readonly ancora: string | null;
  readonly ordem: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  readonly revisao: number;
}

export interface RegraPecaRecuperarDto {
  readonly id: number;
}

export interface RegraPecaIdentificadorRecuperarDto {
  readonly identificador: string;
}

export interface RegraPecaArvoreListarDto {
  readonly livroId: number;
}

/** Linha da árvore do livro (plana, ordenada por pai e `ordem`); a service monta o aninhamento. */
export interface RegraPecaArvoreItemDto {
  readonly id: number;
  readonly livroId: number;
  readonly pecaPaiId: number | null;
  readonly tipo: TipoRegraPecaEnum;
  readonly identificador: string;
  readonly ancora: string | null;
  readonly ordem: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  readonly revisao: number;
}

export interface RegraPecaInternoCriarDto {
  readonly livroId: number;
  readonly pecaPaiId: number | null;
  readonly tipo: TipoRegraPecaEnum;
  readonly identificador: string;
  readonly ancora: string | null;
  readonly ordem: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
}

/** Altera o `dados` se `revisao` for a do banco; incrementa a revisão. */
export interface RegraPecaDadosInternoAlterarDto {
  readonly id: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  readonly revisao: number;
}

/** Altera a âncora se `revisao` for a do banco; incrementa a revisão. */
export interface RegraPecaAncoraInternoAlterarDto {
  readonly id: number;
  readonly ancora: string | null;
  readonly revisao: number;
}

/** Move a peça (novo pai e nova `ordem`) se `revisao` for a do banco; incrementa a revisão. */
export interface RegraPecaPosicaoInternoAlterarDto {
  readonly id: number;
  readonly pecaPaiId: number | null;
  readonly ordem: number;
  readonly revisao: number;
}

/** Exclui (soft) a peça e todas as descendentes, se `revisao` for a do banco. */
export interface RegraPecaRemoverDto {
  readonly id: number;
  readonly revisao: number;
}

export interface RegraPecaAncoraAntigaInternoCriarDto {
  readonly regraPecaId: number;
  readonly ancora: string;
}

export interface RegraPecaAncorasAntigasListarDto {
  readonly livroId: number;
}

/** Âncora que a peça já teve, com o identificador da peça a que hoje ela leva. */
export interface RegraPecaAncoraAntigaResumoDto {
  readonly regraPecaId: number;
  readonly identificador: string;
  readonly ancora: string;
}

/** Fotografia completa de um livro (`livro_versao`), com o conteúdo. */
export interface LivroVersaoRecuperadaDto {
  readonly id: number;
  readonly livroId: number;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
  readonly numero: string;
  readonly formato: number;
  readonly conteudo: LivroVersaoConteudoDto;
  /** Instante da publicação, texto ISO em UTC. */
  readonly publicacaoData: string;
  readonly usuarioId: number;
  readonly nota: string | null;
}

export interface LivroVersaoRecuperarDto {
  readonly id: number;
}

/** A fotografia mais recente de um livro numa situação. */
export interface LivroVersaoAtualRecuperarDto {
  readonly livroId: number;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
}

export interface LivroVersoesListarDto {
  readonly livroId: number;
}

/** Fotografia sem o conteúdo, para listar o histórico. */
export interface LivroVersaoResumoDto {
  readonly id: number;
  readonly livroId: number;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
  readonly numero: string;
  readonly formato: number;
  readonly publicacaoData: string;
  readonly usuarioId: number;
  readonly nota: string | null;
}

export interface LivroVersaoInternoCriarDto {
  readonly livroId: number;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
  readonly numero: string;
  readonly formato: number;
  readonly conteudo: LivroVersaoConteudoDto;
  readonly usuarioId: number;
  readonly nota: string | null;
}

/** Importação única de um livro (`regras:importar`): grava a cópia de trabalho e a 1ª fotografia. */
export interface LivroInternoImportarDto {
  readonly conteudo: LivroVersaoConteudoDto;
  /** Posição do livro na lista de livros. */
  readonly ordemDoLivro: number;
  readonly usuarioId: number;
  /** Só em desenvolvimento: descarta as peças e as fotografias atuais e importa de novo. */
  readonly refazer: boolean;
  /** Pula o livro que já tem peças, sem erro e sem alterar nada; é o que torna a importação repetível no CI. */
  readonly pularSeJaImportado?: boolean;
}

export interface LivroImportadoDto {
  readonly livroId: number;
  readonly codigo: string;
  readonly numero: string;
  readonly pecas: number;
  readonly versaoId: number;
}

/** Descarta (soft delete) todas as fotografias de um livro; só a importação em dev usa. */
export interface LivroVersoesInternoRemoverDto {
  readonly livroId: number;
}

/** Livro como o leitor o recebe: a fotografia visível ao papel, sem dados internos de quem publicou. */
export interface LivroLeituraDto {
  readonly codigo: string;
  readonly titulo: string;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
  readonly numero: string;
  /** Instante da publicação, texto ISO em UTC. */
  readonly publicacaoData: string;
  readonly conteudo: LivroVersaoConteudoDto;
}

/** Lista os livros visíveis ao papel global de quem pede (`null` = visitante sem login). */
export interface LivroListarDto {
  readonly tipoUsuario: TipoUsuarioEnum | null;
}

/** Papel global de quem pede (`null` = visitante sem login), com o livro pedido pelo código. */
export interface LivroLeituraRecuperarDto {
  readonly codigo: string;
  readonly tipoUsuario: TipoUsuarioEnum | null;
}

/** Fotografia pedida por id dentro de um livro (só `ADMIN`). */
export interface LivroVersaoPorCodigoRecuperarDto {
  readonly codigo: string;
  readonly id: number;
}

/** Publica o estado atual da cópia de trabalho como rascunho ou versão (só `ADMIN`). */
export interface LivroPublicarDto {
  readonly codigo: string;
  readonly situacao: TipoLivroVersaoSituacaoEnum;
  /** Número editorial (ex.: `4.1.5`). */
  readonly numero: string;
  readonly nota?: string | null;
}

/** Fotografia criada e as pendências que ainda restavam (só um rascunho publica com pendência). */
export interface LivroPublicadoDto {
  readonly versao: LivroVersaoResumoDto;
  readonly pendencias: readonly LivroPendenciaDto[];
}

/** Troca só a `ordem` de uma irmã (sem alterar a `revisao`): ajuste de posição, não edição. */
export interface RegraPecaOrdemInternoAlterarDto {
  readonly id: number;
  readonly ordem: number;
}

/** Desfaz a exclusão de uma peça e das descendentes excluídas junto com ela. */
export interface RegraPecaRestaurarInternoDto {
  readonly id: number;
  /** Só restaura peça deste livro. */
  readonly livroId: number;
}

/** Altera o `dados` de uma peça do livro `codigo` (só `ADMIN`); `revisao` é a que o cliente leu. */
export interface RegraPecaDadosAlterarDto {
  readonly codigo: string;
  readonly id: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  readonly revisao: number;
}

export interface RegraPecaAlteradaDto {
  readonly peca: RegraPecaRecuperadaDto;
}

/** Move a peça para o pai informado, na posição `indice` entre as irmãs (0 = primeira). */
export interface RegraPecaPosicaoAlterarDto {
  readonly codigo: string;
  readonly id: number;
  readonly pecaPaiId: number | null;
  readonly indice: number;
  readonly revisao: number;
}

/** A peça movida e as irmãs cuja `ordem` mudou, com a posição nova de cada uma. */
export interface RegraPecaMovidaDto {
  readonly pecas: readonly RegraPecaArvoreItemDto[];
}

export interface RegraPecaDuplicarDto {
  readonly codigo: string;
  readonly id: number;
}

/** A cópia (raiz e descendentes, identificadores novos, sem âncora) e as irmãs reordenadas. */
export interface RegraPecaDuplicadaDto {
  /** Id da raiz da cópia. */
  readonly copiaId: number;
  readonly pecas: readonly RegraPecaArvoreItemDto[];
}

export interface RegraPecaExcluirDto {
  readonly codigo: string;
  readonly id: number;
  readonly revisao: number;
}

export interface RegraPecaExcluidaDto {
  /** Quantas peças saíram (a peça e as descendentes). */
  readonly removidas: number;
}

export interface RegraPecaRestaurarDto {
  readonly codigo: string;
  readonly id: number;
}

export interface RegraPecaRestauradaDto {
  readonly pecas: readonly RegraPecaArvoreItemDto[];
}

/** Cria uma peça do livro `codigo` dentro de `pecaPaiId` (`null` = raiz), na posição `indice`. */
export interface RegraPecaCriarDto {
  readonly codigo: string;
  readonly tipo: TipoRegraPecaEnum;
  readonly pecaPaiId: number | null;
  readonly indice: number;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  /** Filhos do esqueleto (ex.: a habilidade inicial do arquétipo), criados junto com a peça. */
  readonly filhos?: readonly RegraPecaEsqueletoDto[];
}

/** Peça a criar com o que nasce dentro dela; o esqueleto de cada tipo vem de `criarEsqueletoPeca`. */
export interface RegraPecaEsqueletoDto {
  readonly tipo: TipoRegraPecaEnum;
  readonly dados: LivroPecaDadosPorTipo[TipoRegraPecaEnum];
  readonly filhos: readonly RegraPecaEsqueletoDto[];
}

/** A peça criada, as filhas do esqueleto e as irmãs que mudaram de posição para abrir espaço. */
export interface RegraPecaCriadaDto {
  readonly peca: RegraPecaRecuperadaDto;
  readonly pecas: readonly RegraPecaArvoreItemDto[];
  /** Descendentes criadas junto (vazio quando a peça nasceu sem filhos). */
  readonly filhas: readonly RegraPecaArvoreItemDto[];
}

/** Renomeia a peça: troca o nome/título e a âncora, guardando a antiga; `revisao` é a que o cliente leu. */
export interface RegraPecaNomeAlterarDto {
  readonly codigo: string;
  readonly id: number;
  readonly nome: string;
  readonly revisao: number;
}

/** A peça renomeada (já com a âncora nova e a revisão seguinte). */
export interface RegraPecaNomeAlteradaDto {
  readonly peca: RegraPecaRecuperadaDto;
  /** Âncora que a peça deixou de usar e que continua levando a ela; `null` se não tinha ou não mudou. */
  readonly ancoraAntiga: string | null;
}
