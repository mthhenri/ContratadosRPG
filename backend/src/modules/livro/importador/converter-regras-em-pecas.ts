import { randomUUID } from "node:crypto";
import {
  LIVRO_FORMATO_ATUAL,
  type LivroListaItemBlocoDto,
  type LivroPecaDadosPorTipo,
  type LivroPecaDto,
  type LivroVersaoConteudoDto,
} from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";
import type {
  NormalizadoArquetipos,
  NormalizadoAtributos,
  NormalizadoConteudo,
  NormalizadoDocumento,
  NormalizadoFichaCriatura,
  NormalizadoHabilidade,
  NormalizadoHabilidadeCriatura,
  NormalizadoIdentidade,
  NormalizadoLista,
} from "@contratados-rpg/shared/livro";

export interface ConverterRegrasOpcoes {
  /** Gera o `identificador` de cada peça; o padrão é um UUID aleatório (gravado uma única vez). */
  readonly gerarIdentificador?: () => string;
}

/** Peça ainda sem links resolvidos; o `identificador` do destino só existe depois do percurso. */
interface PecaEmConstrucao {
  readonly identificador: string;
  readonly ancora: string | null;
  readonly tipo: Tipo;
  readonly ordem: number;
  readonly dados: unknown;
  readonly filhos: readonly PecaEmConstrucao[];
}

/**
 * Converte o documento do normalizador (`sistema.json`/`guia.json`) na árvore de peças da Oficina
 * (contrato da m11-01). Puro: não toca banco nem disco. Regras do mapeamento (D1–D8):
 * - campos de auditoria da fonte (`cabecalho`/`linhas` de blocos que têm campos estruturados) não
 *   migram; a paridade com o `.md` é provada na ida e volta;
 * - `capa` sai da árvore e vira o envelope; `identidade`/`atributos` de uma ficha de criatura
 *   ficam no `dados` dela, e as habilidades da criatura viram suas filhas;
 * - as grades de referência guardam a apresentação reconhecida como estrutura da peça.
 * Lança `Error` ao encontrar bloco que o contrato não modela, em vez de perder conteúdo.
 */
export function converterRegrasEmPecas(
  documento: NormalizadoDocumento,
  opcoes: ConverterRegrasOpcoes = {},
): LivroVersaoConteudoDto {
  const gerar = opcoes.gerarIdentificador ?? randomUUID;
  const capa = documento.filhos.find((filho) => filho.tipo === "capa");
  const conversor = new ConversorDeRegras(gerar, capa?.tipo === "capa" ? capa.versao : undefined);
  const pecas = conversor.converterLista(documento.filhos);
  return {
    formato: LIVRO_FORMATO_ATUAL,
    codigo: documento.id,
    titulo: documento.titulo,
    subtitulo: capa?.tipo === "capa" ? capa.subtitulo : "",
    numero: documento.versao,
    pecas: conversor.resolverLinks(pecas),
  };
}

const igual = (primeiro: unknown, segundo: unknown): boolean =>
  JSON.stringify(primeiro) === JSON.stringify(segundo);

function repeteAFicha(
  bloco: NormalizadoIdentidade | NormalizadoAtributos | NormalizadoHabilidadeCriatura,
  ficha: NormalizadoFichaCriatura,
): boolean {
  if (bloco.tipo === "identidade") return igual(bloco.campos, ficha.identidade.campos);
  if (bloco.tipo === "atributos") return igual(bloco.atributos, ficha.atributos.atributos);
  return ficha.habilidades.some((habilidade) => igual(habilidade, bloco));
}

class ConversorDeRegras {
  private readonly identificadorPorAncora = new Map<string, string>();

  /** `selo` é o selo de versão da capa; vai para a `ABERTURA`, que a capa acompanha no livro. */
  constructor(
    private readonly gerar: () => string,
    private selo: string | undefined,
  ) {}

  /** Converte irmãos, numerando `ordem` a partir de 0 na ordem em que ficam. */
  converterLista(
    conteudo: readonly NormalizadoConteudo[],
    contexto: { readonly ficha?: NormalizadoFichaCriatura } = {},
  ): PecaEmConstrucao[] {
    const pecas = conteudo.flatMap((item) => this.converter(item, contexto));
    return pecas.map((peca, ordem) => ({ ...peca, ordem }));
  }

  private criar(
    tipo: Tipo,
    dados: unknown,
    filhos: readonly PecaEmConstrucao[] = [],
    ancora: string | null = null,
  ): PecaEmConstrucao {
    const identificador = this.gerar();
    if (ancora !== null) this.identificadorPorAncora.set(ancora, identificador);
    return {
      identificador,
      ancora,
      tipo,
      ordem: 0,
      dados,
      filhos: filhos.map((filho, ordem) => ({ ...filho, ordem })),
    };
  }

  private habilidade(
    habilidade: NormalizadoHabilidade,
    marca: { readonly inicial?: true; readonly melhorada?: true } = {},
  ): PecaEmConstrucao {
    const { nome, custo, reacao, glifo, trechos } = habilidade;
    return this.criar(Tipo.HABILIDADE, { nome, custo, reacao, glifo, trechos, ...marca });
  }

  private arquetipos(bloco: NormalizadoArquetipos, classeNome: string, iniciais: ReadonlyMap<string, NormalizadoHabilidade>): PecaEmConstrucao[] {
    return bloco.arquetipos.map((arquetipo) => {
      const inicial = iniciais.get(arquetipo.nome);
      if (!inicial) {
        throw new Error(`Arquétipo "${arquetipo.nome}" de ${classeNome} sem habilidade inicial.`);
      }
      return this.criar(
        Tipo.ARQUETIPO,
        { nome: arquetipo.nome, citacao: arquetipo.citacao, atributosBonus: arquetipo.atributosBonus },
        [
          this.habilidade(inicial, { inicial: true }),
          ...arquetipo.habilidades.map((habilidade) => this.habilidade(habilidade)),
          ...arquetipo.habilidadesGeraisMelhoradas.map((habilidade) =>
            this.habilidade(habilidade, { melhorada: true }),
          ),
        ],
      );
    });
  }

  private itemDeLista(item: NormalizadoConteudo): LivroListaItemBlocoDto {
    if (item.tipo === "paragrafo") return { tipo: "paragrafo", trechos: item.trechos };
    if (item.tipo === "lista") return this.lista(item);
    throw new Error(`Bloco "${item.tipo}" dentro de item de lista não é modelado pelo contrato.`);
  }

  private lista(lista: NormalizadoLista): Extract<LivroListaItemBlocoDto, { tipo: "lista" }> {
    return {
      tipo: "lista",
      ordenada: lista.ordenada,
      inicio: lista.inicio,
      itens: lista.itens.map((item) => item.map((bloco) => this.itemDeLista(bloco))),
    };
  }

  private converter(item: NormalizadoConteudo, contexto: { readonly ficha?: NormalizadoFichaCriatura }): PecaEmConstrucao[] {
    switch (item.tipo) {
      case "capa":
        return [];
      case "secao":
        return [
          this.criar(
            Tipo.SECAO,
            {
              titulo: item.titulo,
              nivel: item.nivel,
              glifo: item.glifo,
              ...(item.origemTabela ? { origemTabela: true } : {}),
            },
            this.converterLista(item.filhos, contexto),
            item.ancora,
          ),
        ];
      case "paragrafo":
        return [this.criar(Tipo.PARAGRAFO, { trechos: item.trechos })];
      case "exemplo":
        return [this.criar(Tipo.EXEMPLO, { trechos: item.trechos })];
      case "formula":
        return [this.criar(Tipo.FORMULA, { trechos: item.trechos })];
      case "nota":
        return [this.criar(Tipo.NOTA, { trechos: item.trechos })];
      case "lista": {
        const { ordenada, inicio, itens } = this.lista(item);
        return [this.criar(Tipo.LISTA, { ordenada, inicio, itens })];
      }
      case "tabela":
        return [
          this.criar(Tipo.TABELA, {
            cabecalho: item.cabecalho,
            linhas: item.linhas,
            ...(item.pares ? { emPares: true } : {}),
          }),
        ];
      case "habilidade":
        return [this.habilidade(item)];
      case "classe": {
        const iniciais = new Map(item.arquetipos.map((resumo) => [resumo.nome, resumo.habilidadeInicial]));
        const blocos = item.filhos ?? [];
        return [
          this.criar(
            Tipo.CLASSE,
            {
              nome: item.nome,
              citacao: item.citacao,
              saude: item.saude,
              progressao: item.progressao,
              cabecalho: item.cabecalho,
              linhas: item.linhas,
            },
            [
              ...item.habilidades.map((habilidade) => this.habilidade(habilidade)),
              ...blocos.flatMap((bloco) => this.arquetipos(bloco, item.nome, iniciais)),
            ],
            item.ancora ?? null,
          ),
        ];
      }
      case "arquetipos":
        throw new Error(`Arquétipos de ${item.classe} fora de uma classe.`);
      case "subclasse":
        return [
          this.criar(
            Tipo.SUBCLASSE,
            {
              nome: item.nome,
              classe: item.classe,
              citacao: item.citacao,
              custos: item.custos,
              saude: item.saude,
              progressao: item.progressao,
              atributosBonus: item.atributosBonus,
            },
            [
              this.habilidade(item.habilidadeInicial, { inicial: true }),
              ...item.habilidades.map((habilidade) => this.habilidade(habilidade)),
            ],
            item.ancora ?? null,
          ),
        ];
      case "origens":
        return [
          this.criar(
            Tipo.ORIGENS,
            { cabecalho: item.cabecalho, linhas: item.linhas },
            item.origens.map((origem) => this.criar(Tipo.ORIGEM, { ...origem })),
          ),
        ];
      case "termos":
        return [
          this.criar(
            Tipo.TERMOS,
            { variante: item.variante },
            item.itens.map((termo) => this.criar(Tipo.TERMO, { ...termo })),
          ),
        ];
      case "equipamentos":
        return [
          this.criar(
            Tipo.EQUIPAMENTOS,
            { categoria: item.categoria },
            item.itens.map((equipamento) => this.criar(Tipo.EQUIPAMENTO, { ...equipamento })),
          ),
        ];
      case "modificacoes":
        return [
          this.criar(
            Tipo.MODIFICACOES,
            { categoria: item.categoria, ...(item.nota ? { nota: item.nota } : {}) },
            item.itens.map((modificacao) => this.criar(Tipo.MODIFICACAO, { ...modificacao })),
          ),
        ];
      case "amplificadores":
        return [
          this.criar(
            Tipo.AMPLIFICADORES,
            {},
            item.itens.map((amplificador) => this.criar(Tipo.AMPLIFICADOR, { ...amplificador })),
          ),
        ];
      case "modulos":
        return [this.criar(Tipo.MODULOS, { modulos: item.modulos })];
      case "niveis-ameaca":
        return [this.criar(Tipo.NIVEIS_AMEACA, { niveis: item.niveis })];
      case "faixas":
        return [this.criar(Tipo.FAIXAS, { itens: item.itens })];
      case "grade":
        return [
          this.criar(
            Tipo.GRADE,
            item.referencia
              ? {
                  apresentacao: item.referencia.tipo,
                  colunas: item.colunas,
                  ...(item.referencia.titulo ? { titulo: item.referencia.titulo } : {}),
                  itens: item.referencia.itens,
                }
              : {
                  apresentacao: "generica",
                  colunas: item.colunas,
                  cabecalho: item.cabecalho,
                  linhas: item.linhas,
                },
          ),
        ];
      case "abertura": {
        const selo = this.selo;
        this.selo = undefined;
        return [
          this.criar(Tipo.ABERTURA, {
            titulo: item.titulo,
            trechos: item.trechos,
            ...(selo ? { selo } : {}),
          }),
        ];
      }
      case "roteiro": {
        const introducao = this.converterLista(item.introducao ?? [], contexto);
        const corpo = this.converterLista(item.filhos, contexto);
        const conclusao = this.converterLista(item.conclusao ?? [], contexto);
        return [
          this.criar(
            Tipo.ROTEIRO,
            {
              etapas: item.etapas,
              introducaoQuantidade: introducao.length,
              conclusaoQuantidade: conclusao.length,
            },
            [...introducao, ...corpo, ...conclusao],
          ),
        ];
      }
      case "ficha-criatura": {
        return [
          this.criar(
            Tipo.FICHA_CRIATURA,
            {
              nome: item.nome,
              identidade: item.identidade.campos,
              atributos: item.atributos.atributos,
              vidaMaxima: item.vidaMaxima,
              defesaBase: item.defesaBase,
              resistencias: item.resistencias,
              fraquezas: item.fraquezas,
              regeneracao: item.regeneracao,
              porte: item.porte,
              deslocamento: item.deslocamento,
              cadencia: item.cadencia,
              ataques: item.ataques,
            },
            [
              ...this.converterLista(item.filhos, { ficha: item }),
              ...item.habilidades.map((habilidade) =>
                this.criar(Tipo.HABILIDADE_CRIATURA, {
                  nome: habilidade.nome,
                  categoria: habilidade.categoria,
                  trechos: habilidade.trechos,
                  rotulo: habilidade.rotulo,
                }),
              ),
            ],
          ),
        ];
      }
      case "identidade":
      case "atributos":
      case "habilidade-criatura":
        // Dentro das seções da ficha estes blocos repetem o que `FICHA_CRIATURA` já guarda; só se
        // descartam quando são idênticos ao que ela guarda (senão haveria perda silenciosa).
        if (!contexto.ficha) throw new Error(`Bloco "${item.tipo}" fora de uma ficha de criatura.`);
        if (!repeteAFicha(item, contexto.ficha)) {
          throw new Error(
            `Bloco "${item.tipo}" dentro da ficha "${contexto.ficha.nome}" difere do que a ficha guarda.`,
          );
        }
        return [];
      case "generico":
        if (item.filhos?.length || (!item.trechos.length && item.origemMarkdown.trim())) {
          throw new Error(
            `Bloco genérico (${item.motivo}) não pode ser importado sem perder conteúdo; ` +
              "ajuste o .md para o normalizador reconhecê-lo.",
          );
        }
        return [this.criar(Tipo.GENERICO, { motivo: item.motivo, trechos: item.trechos })];
    }
  }

  /** Acrescenta `identificador` a cada link interno, a partir da âncora que o normalizador resolveu. */
  resolverLinks(pecas: readonly PecaEmConstrucao[]): LivroPecaDto[] {
    const erros: string[] = [];
    const resolver = (valor: unknown): unknown => {
      if (Array.isArray(valor)) return valor.map(resolver);
      if (typeof valor !== "object" || valor === null) return valor;
      const registro = valor as Record<string, unknown>;
      if (registro["tipo"] === "link-interno") {
        const ancora = registro["ancora"] as string;
        const identificador = this.identificadorPorAncora.get(ancora);
        if (!identificador) {
          erros.push(`"${String(registro["texto"])}" → #${ancora}`);
          return registro;
        }
        return { ...registro, identificador };
      }
      return Object.fromEntries(
        Object.entries(registro)
          .filter(([, conteudo]) => conteudo !== undefined)
          .map(([chave, conteudo]) => [chave, resolver(conteudo)]),
      );
    };
    const montar = (peca: PecaEmConstrucao): LivroPecaDto => ({
      identificador: peca.identificador,
      ancora: peca.ancora,
      tipo: peca.tipo,
      ordem: peca.ordem,
      dados: resolver(peca.dados) as LivroPecaDadosPorTipo[Tipo],
      filhos: peca.filhos.map(montar),
    });
    const resolvidas = pecas.map(montar);
    if (this.selo) throw new Error(`Selo "${this.selo}" da capa sem abertura para recebê-lo.`);
    if (erros.length) {
      throw new Error(`Links internos sem peça de destino: ${erros.join("; ")}`);
    }
    return resolvidas;
  }
}
