import type { LivroListaItemBlocoDto } from "../dtos/livro/livro-peca-dados.dtos";
import type {
  LivroPecaDadosPorTipo,
  LivroPecaDto,
  LivroVersaoConteudoDto,
} from "../dtos/livro/livro-peca.dtos";
import type { LivroTrechoDto } from "../dtos/livro/livro-trecho.dtos";
import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import type {
  NormalizadoConteudo,
  NormalizadoDocumento,
  NormalizadoHabilidade,
  NormalizadoLista,
} from "./regras-formato";

/** Título da capa de todo livro: texto fixo da marca, não varia por livro nem por versão. */
const TITULO_DA_CAPA = "Contratados";

function dadosDe<T extends Tipo>(peca: LivroPecaDto, tipo: T): LivroPecaDadosPorTipo[T] {
  if (peca.tipo !== tipo) throw new Error(`Esperava ${tipo} e veio ${peca.tipo}.`);
  return peca.dados as LivroPecaDadosPorTipo[T];
}

function listaDoItem(bloco: LivroListaItemBlocoDto): NormalizadoConteudo {
  if (bloco.tipo === "paragrafo") return { tipo: "paragrafo", trechos: bloco.trechos };
  const lista: NormalizadoLista = {
    tipo: "lista",
    ordenada: bloco.ordenada,
    inicio: bloco.inicio,
    itens: bloco.itens.map((item) => item.map(listaDoItem)),
  };
  return lista;
}

/** Ligado só durante uma projeção com `incluirPecas`: cada bloco ganha o `identificador` da peça. */
let incluirPecasNaProjecao = false;

function comPeca<T extends object>(bloco: T, peca: LivroPecaDto): T {
  return incluirPecasNaProjecao ? { ...bloco, peca: peca.identificador } : bloco;
}

/** Seção cujos parágrafos de habilidade passiva a leitura reconhece como bloco de habilidade. */
export const TITULO_BIBLIOTECA_REFERENCIA = "Biblioteca de Referência";

/** Ligado enquanto se projetam os filhos da Biblioteca de Referência (só na leitura). */
let dentroDaBiblioteca = false;

/**
 * Passiva da Biblioteca: o livro guarda `Nome [Ex.: Narrativo]` e, na linha seguinte, `Passiva — efeito`
 * num único parágrafo (as ativas são peças HABILIDADE com custo). A leitura as apresenta com o mesmo
 * bloco das ativas, sem custo. A assinatura é completa (texto único, duas linhas, segunda linha
 * iniciada por "Passiva"); qualquer outra forma segue como parágrafo.
 */
export function reconhecerPassivaDaBiblioteca(trechos: readonly LivroTrechoDto[]): NormalizadoHabilidade | null {
  if (trechos.length !== 1 || trechos[0].tipo !== "texto") return null;
  const quebra = trechos[0].texto.indexOf("\n");
  if (quebra < 0) return null;
  const nome = trechos[0].texto.slice(0, quebra).trim();
  const efeito = trechos[0].texto.slice(quebra + 1).trim();
  if (!nome || efeito.includes("\n") || !/^Passiva(?=[\s(—-])/.test(efeito)) return null;
  return { tipo: "habilidade", nome, custo: null, reacao: false, glifo: null, trechos: [{ tipo: "texto", texto: efeito }] };
}

function habilidadeDe(peca: LivroPecaDto): NormalizadoHabilidade {
  const { nome, custo, reacao, glifo, trechos } = dadosDe(peca, Tipo.HABILIDADE);
  return comPeca({ tipo: "habilidade", nome, custo, reacao, glifo, trechos }, peca);
}

/**
 * Projeta a árvore de peças de volta no formato que o leitor de Regras consome (o do normalizador).
 * Com `incluirPecas`, cada bloco carrega `peca` (o `identificador`): é como a Oficina liga o que vê
 * na tela à peça que edita. É a outra metade da prova de ida e volta da m11-03 e, depois, a ponte entre a fotografia do
 * banco e o leitor atual. O que o conversor não guarda (campos de auditoria da fonte) não volta;
 * as divergências aceitas estão listadas em `diagnostico.md` da spec.
 */
export function projetarPecasEmRegras(
  conteudo: LivroVersaoConteudoDto,
  opcoes: { readonly incluirPecas?: boolean } = {},
): NormalizadoDocumento {
  incluirPecasNaProjecao = opcoes.incluirPecas === true;
  try {
    return projetarDocumento(conteudo);
  } finally {
    incluirPecasNaProjecao = false;
  }
}

function projetarDocumento(conteudo: LivroVersaoConteudoDto): NormalizadoDocumento {
  const filhos: NormalizadoConteudo[] = projetarLista(conteudo.pecas);
  const aberturaAte = filhos.findIndex((filho) => filho.tipo !== "abertura");
  const selo = acharSelo(conteudo.pecas);
  filhos.splice(aberturaAte < 0 ? filhos.length : aberturaAte, 0, {
    tipo: "capa",
    ...(selo ? { versao: selo } : {}),
    titulo: TITULO_DA_CAPA,
    subtitulo: conteudo.subtitulo,
  });
  return {
    tipo: "documento",
    id: conteudo.codigo as NormalizadoDocumento["id"],
    titulo: conteudo.titulo,
    versao: conteudo.numero,
    filhos,
  };
}

function acharSelo(pecas: readonly LivroPecaDto[]): string | undefined {
  for (const peca of pecas) {
    const selo = peca.tipo === Tipo.ABERTURA ? dadosDe(peca, Tipo.ABERTURA).selo : undefined;
    const encontrado = selo ?? acharSelo(peca.filhos);
    if (encontrado !== undefined) return encontrado;
  }
  return undefined;
}

function projetarFilhosDaSecao(titulo: string, filhos: readonly LivroPecaDto[]): NormalizadoConteudo[] {
  if (dentroDaBiblioteca || titulo.trim() !== TITULO_BIBLIOTECA_REFERENCIA) return projetarLista(filhos);
  dentroDaBiblioteca = true;
  try {
    return projetarLista(filhos);
  } finally {
    dentroDaBiblioteca = false;
  }
}

function projetarLista(pecas: readonly LivroPecaDto[]): NormalizadoConteudo[] {
  return pecas.map(projetar);
}

function projetar(peca: LivroPecaDto): NormalizadoConteudo {
  return comPeca(projetarBase(peca), peca);
}

function projetarBase(peca: LivroPecaDto): NormalizadoConteudo {
  switch (peca.tipo) {
    case Tipo.SECAO: {
      const { titulo, nivel, glifo, origemTabela } = dadosDe(peca, Tipo.SECAO);
      return {
        tipo: "secao",
        nivel,
        glifo,
        titulo,
        ancora: peca.ancora ?? "",
        ...(origemTabela ? { origemTabela: true } : {}),
        filhos: projetarFilhosDaSecao(titulo, peca.filhos),
      };
    }
    case Tipo.PARAGRAFO: {
      // Na Oficina a peça segue parágrafo editável; só a leitura reconhece a passiva.
      const passiva = dentroDaBiblioteca && !incluirPecasNaProjecao
        ? reconhecerPassivaDaBiblioteca(dadosDe(peca, Tipo.PARAGRAFO).trechos) : null;
      return passiva ?? { tipo: "paragrafo", trechos: dadosDe(peca, Tipo.PARAGRAFO).trechos };
    }
    case Tipo.EXEMPLO:
      return { tipo: "exemplo", trechos: dadosDe(peca, Tipo.EXEMPLO).trechos };
    case Tipo.FORMULA:
      return { tipo: "formula", trechos: dadosDe(peca, Tipo.FORMULA).trechos };
    case Tipo.NOTA:
      return { tipo: "nota", trechos: dadosDe(peca, Tipo.NOTA).trechos };
    case Tipo.LISTA: {
      const { ordenada, inicio, itens } = dadosDe(peca, Tipo.LISTA);
      return comPeca({ tipo: "lista", ordenada, inicio, itens: itens.map((item) => item.map(listaDoItem)) }, peca);
    }
    case Tipo.TABELA: {
      const { cabecalho, linhas, emPares } = dadosDe(peca, Tipo.TABELA);
      return {
        tipo: "tabela",
        cabecalho,
        linhas,
        // As duas metades saem das colunas; não são guardadas.
        ...(emPares
          ? {
              pares: {
                cabecalho: cabecalho.slice(0, 2),
                linhas: [0, 2].flatMap((coluna) =>
                  linhas
                    .map((celulas) => celulas.slice(coluna, coluna + 2))
                    .filter((par) => par.some((celula) => celula.length)),
                ),
              },
            }
          : {}),
      };
    }
    case Tipo.HABILIDADE:
      return habilidadeDe(peca);
    case Tipo.CLASSE: {
      const dados = dadosDe(peca, Tipo.CLASSE);
      const arquetipos = peca.filhos.filter((filho) => filho.tipo === Tipo.ARQUETIPO);
      return {
        tipo: "classe",
        nome: dados.nome,
        ancora: peca.ancora ?? undefined,
        citacao: dados.citacao,
        saude: dados.saude,
        progressao: dados.progressao,
        cabecalho: dados.cabecalho,
        linhas: dados.linhas,
        habilidades: peca.filhos.filter((filho) => filho.tipo === Tipo.HABILIDADE).map(habilidadeDe),
        arquetipos: arquetipos.map((arquetipo) => {
          const inicial = arquetipo.filhos.find(
            (filho) => dadosDe(filho, Tipo.HABILIDADE).inicial === true,
          );
          if (!inicial) throw new Error(`Arquétipo ${dadosDe(arquetipo, Tipo.ARQUETIPO).nome} sem inicial.`);
          return { nome: dadosDe(arquetipo, Tipo.ARQUETIPO).nome, habilidadeInicial: habilidadeDe(inicial) };
        }),
        filhos: arquetipos.length
          ? [
              {
                tipo: "arquetipos",
                classe: dados.nome,
                cabecalho: [],
                linhas: [],
                arquetipos: arquetipos.map((arquetipo) => {
                  const itens = arquetipo.filhos.map((filho) => ({
                    marcas: dadosDe(filho, Tipo.HABILIDADE),
                    habilidade: habilidadeDe(filho),
                  }));
                  const arquetipoDados = dadosDe(arquetipo, Tipo.ARQUETIPO);
                  return comPeca({
                    nome: arquetipoDados.nome,
                    citacao: arquetipoDados.citacao,
                    atributosBonus: arquetipoDados.atributosBonus,
                    habilidades: itens
                      .filter(({ marcas }) => !marcas.inicial && !marcas.melhorada)
                      .map(({ habilidade }) => habilidade),
                    habilidadesGeraisMelhoradas: itens
                      .filter(({ marcas }) => marcas.melhorada)
                      .map(({ habilidade }) => habilidade),
                  }, arquetipo);
                }),
              },
            ]
          : undefined,
      };
    }
    case Tipo.ARQUETIPO:
      throw new Error("Arquétipo fora de uma classe.");
    case Tipo.SUBCLASSE: {
      const dados = dadosDe(peca, Tipo.SUBCLASSE);
      const inicial = peca.filhos.find((filho) => dadosDe(filho, Tipo.HABILIDADE).inicial === true);
      if (!inicial) throw new Error(`Subclasse ${dados.nome} sem habilidade inicial.`);
      return {
        tipo: "subclasse",
        nome: dados.nome,
        ancora: peca.ancora ?? undefined,
        classe: dados.classe,
        citacao: dados.citacao,
        custos: dados.custos,
        saude: dados.saude,
        progressao: dados.progressao,
        atributosBonus: dados.atributosBonus,
        cabecalho: [],
        linhas: [],
        habilidadeInicial: habilidadeDe(inicial),
        habilidades: peca.filhos.filter((filho) => filho !== inicial).map(habilidadeDe),
      };
    }
    case Tipo.ORIGENS: {
      const { cabecalho, linhas } = dadosDe(peca, Tipo.ORIGENS);
      return {
        tipo: "origens",
        cabecalho,
        linhas,
        origens: peca.filhos.map((filho) => comPeca({ ...dadosDe(filho, Tipo.ORIGEM) }, filho)),
      };
    }
    case Tipo.TERMOS:
      return {
        tipo: "termos",
        variante: dadosDe(peca, Tipo.TERMOS).variante,
        cabecalho: [],
        linhas: [],
        itens: peca.filhos.map((filho) => comPeca({ ...dadosDe(filho, Tipo.TERMO) }, filho)),
      };
    case Tipo.EQUIPAMENTOS:
      return {
        tipo: "equipamentos",
        categoria: dadosDe(peca, Tipo.EQUIPAMENTOS).categoria,
        cabecalho: [],
        linhas: [],
        itens: peca.filhos.map((filho) => comPeca({ ...dadosDe(filho, Tipo.EQUIPAMENTO) }, filho)),
      };
    case Tipo.MODIFICACOES: {
      const { categoria, nota } = dadosDe(peca, Tipo.MODIFICACOES);
      return {
        tipo: "modificacoes",
        categoria,
        ...(nota ? { nota } : {}),
        cabecalho: [],
        linhas: [],
        itens: peca.filhos.map((filho) => comPeca({ ...dadosDe(filho, Tipo.MODIFICACAO) }, filho)),
      };
    }
    case Tipo.AMPLIFICADORES:
      return {
        tipo: "amplificadores",
        cabecalho: [],
        linhas: [],
        itens: peca.filhos.map((filho) => comPeca({ ...dadosDe(filho, Tipo.AMPLIFICADOR) }, filho)),
      };
    case Tipo.MODULOS:
      return { tipo: "modulos", cabecalho: [], linhas: [], modulos: dadosDe(peca, Tipo.MODULOS).modulos };
    case Tipo.NIVEIS_AMEACA:
      return { tipo: "niveis-ameaca", cabecalho: [], linhas: [], niveis: dadosDe(peca, Tipo.NIVEIS_AMEACA).niveis };
    case Tipo.FAIXAS:
      return { tipo: "faixas", cabecalho: [], linhas: [], itens: dadosDe(peca, Tipo.FAIXAS).itens };
    case Tipo.GRADE: {
      const dados = dadosDe(peca, Tipo.GRADE);
      if (dados.apresentacao === "generica") {
        return { tipo: "grade", colunas: dados.colunas, cabecalho: dados.cabecalho, linhas: dados.linhas };
      }
      return {
        tipo: "grade",
        colunas: dados.colunas,
        cabecalho: [],
        linhas: [],
        referencia: {
          tipo: dados.apresentacao,
          ...(dados.titulo ? { titulo: dados.titulo } : {}),
          itens: dados.itens,
        },
      };
    }
    case Tipo.ABERTURA: {
      const { titulo, trechos } = dadosDe(peca, Tipo.ABERTURA);
      return { tipo: "abertura", titulo, trechos };
    }
    case Tipo.ROTEIRO: {
      const { etapas, introducaoQuantidade, conclusaoQuantidade } = dadosDe(peca, Tipo.ROTEIRO);
      const todas = projetarLista(peca.filhos);
      const fimCorpo = todas.length - conclusaoQuantidade;
      return {
        tipo: "roteiro",
        etapas,
        introducao: todas.slice(0, introducaoQuantidade),
        filhos: todas.slice(introducaoQuantidade, fimCorpo),
        conclusao: todas.slice(fimCorpo),
      };
    }
    case Tipo.FICHA_CRIATURA: {
      const dados = dadosDe(peca, Tipo.FICHA_CRIATURA);
      return {
        tipo: "ficha-criatura",
        nome: dados.nome,
        identidade: { tipo: "identidade", cabecalho: [], linhas: [], campos: dados.identidade },
        atributos: { tipo: "atributos", cabecalho: [], linhas: [], atributos: dados.atributos },
        vidaMaxima: dados.vidaMaxima,
        defesaBase: dados.defesaBase,
        resistencias: dados.resistencias,
        fraquezas: dados.fraquezas,
        regeneracao: dados.regeneracao,
        porte: dados.porte,
        deslocamento: dados.deslocamento,
        cadencia: dados.cadencia,
        ataques: dados.ataques,
        habilidades: peca.filhos
          .filter((filho) => filho.tipo === Tipo.HABILIDADE_CRIATURA)
          .map((filho) => comPeca({ tipo: "habilidade-criatura", ...dadosDe(filho, Tipo.HABILIDADE_CRIATURA) }, filho)),
        filhos: projetarLista(peca.filhos.filter((filho) => filho.tipo !== Tipo.HABILIDADE_CRIATURA)),
      };
    }
    case Tipo.GENERICO: {
      const { motivo, trechos } = dadosDe(peca, Tipo.GENERICO);
      return { tipo: "generico", motivo, trechos, origemMarkdown: "" };
    }
    case Tipo.ORIGEM:
    case Tipo.TERMO:
    case Tipo.EQUIPAMENTO:
    case Tipo.MODIFICACAO:
    case Tipo.AMPLIFICADOR:
    case Tipo.HABILIDADE_CRIATURA:
      throw new Error(`${peca.tipo} fora do seu container.`);
  }
}
