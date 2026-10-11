import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import type { RegraPecaEsqueletoDto } from "../dtos/livro/livro-operacao.dtos";

const SAUDE_VAZIA = { vida: [], energia: [] } as const;

/**
 * Esqueleto de uma peça nova da Oficina: o `dados` com a forma do tipo, sem conteúdo, e os filhos que
 * o livro exige existirem junto (arquétipo e subclasse nascem com a habilidade inicial). Nasce válido
 * para o validador; os campos vazios aparecem como pendência de conteúdo, trabalho por terminar.
 */
export function criarEsqueletoPeca(tipo: Tipo): RegraPecaEsqueletoDto {
  const esqueleto = (dados: unknown, filhos: readonly RegraPecaEsqueletoDto[] = []): RegraPecaEsqueletoDto => ({
    tipo,
    dados: dados as RegraPecaEsqueletoDto["dados"],
    filhos,
  });
  const habilidadeInicial = (): RegraPecaEsqueletoDto => ({
    tipo: Tipo.HABILIDADE,
    dados: { nome: "", custo: 0, reacao: false, glifo: null, trechos: [], inicial: true },
    filhos: [],
  });
  const tabela = { cabecalho: [], linhas: [] };

  switch (tipo) {
    case Tipo.SECAO:
      return esqueleto({ titulo: "", nivel: 2, glifo: null });
    case Tipo.PARAGRAFO:
    case Tipo.EXEMPLO:
    case Tipo.FORMULA:
    case Tipo.NOTA:
      return esqueleto({ trechos: [] });
    case Tipo.LISTA:
      return esqueleto({ ordenada: false, inicio: 1, itens: [] });
    case Tipo.TABELA:
      return esqueleto(tabela);
    case Tipo.HABILIDADE:
      return esqueleto({ nome: "", custo: 0, reacao: false, glifo: null, trechos: [] });
    case Tipo.CLASSE:
      return esqueleto({ nome: "", citacao: [], saude: SAUDE_VAZIA, progressao: SAUDE_VAZIA, ...tabela });
    case Tipo.ARQUETIPO:
      return esqueleto({ nome: "", citacao: [], atributosBonus: [] }, [habilidadeInicial()]);
    case Tipo.SUBCLASSE:
      return esqueleto(
        {
          nome: "",
          classe: "",
          citacao: [],
          custos: [],
          saude: SAUDE_VAZIA,
          progressao: SAUDE_VAZIA,
          atributosBonus: [],
        },
        [habilidadeInicial()],
      );
    case Tipo.ORIGENS:
      return esqueleto(tabela);
    case Tipo.ORIGEM:
      return esqueleto({ nome: "", citacao: [], formacao: [], especialidade: [], saberCampo: [] });
    case Tipo.TERMOS:
      return esqueleto({ variante: "verbetes" });
    case Tipo.TERMO:
      return esqueleto({ nome: "", descricao: [] });
    case Tipo.EQUIPAMENTOS:
      return esqueleto({ categoria: "" });
    case Tipo.EQUIPAMENTO:
      return esqueleto({ nome: "", custo: [], descricao: [], peso: [], danos: [] });
    case Tipo.MODIFICACOES:
      return esqueleto({ categoria: "" });
    case Tipo.MODIFICACAO:
      return esqueleto({ nome: "", empilhamento: "■", efeito: [], bloqueia: [] });
    case Tipo.AMPLIFICADORES:
      return esqueleto({});
    case Tipo.AMPLIFICADOR:
      return esqueleto({ nome: "", empilhamento: "■", efeito: [] });
    case Tipo.MODULOS:
      return esqueleto({ modulos: [] });
    case Tipo.NIVEIS_AMEACA:
      return esqueleto({ niveis: [] });
    case Tipo.FICHA_CRIATURA:
      return esqueleto({
        nome: "",
        identidade: [],
        atributos: [],
        vidaMaxima: "",
        defesaBase: "",
        resistencias: [],
        fraquezas: [],
        regeneracao: [],
        porte: [],
        deslocamento: [],
        cadencia: "",
        ataques: [],
      });
    case Tipo.HABILIDADE_CRIATURA:
      return esqueleto({ nome: "", categoria: "PASSIVA", trechos: [], rotulo: "" });
    case Tipo.ROTEIRO:
      return esqueleto({ etapas: [], introducaoQuantidade: 0, conclusaoQuantidade: 0 });
    case Tipo.FAIXAS:
      return esqueleto({ itens: [] });
    case Tipo.GRADE:
      return esqueleto({ apresentacao: "generica", colunas: 2, ...tabela });
    case Tipo.ABERTURA:
      return esqueleto({ titulo: "", trechos: [] });
    case Tipo.GENERICO:
      return esqueleto({ motivo: "", trechos: [] });
  }
}

/** Campo de `dados` que nomeia a peça (e dá a âncora): `titulo` nas seções e aberturas, `nome` nas demais. */
export function campoNomeDaPeca(tipo: Tipo): "titulo" | "nome" | null {
  switch (tipo) {
    case Tipo.SECAO:
    case Tipo.ABERTURA:
      return "titulo";
    case Tipo.HABILIDADE:
    case Tipo.CLASSE:
    case Tipo.ARQUETIPO:
    case Tipo.SUBCLASSE:
    case Tipo.ORIGEM:
    case Tipo.TERMO:
    case Tipo.EQUIPAMENTO:
    case Tipo.MODIFICACAO:
    case Tipo.AMPLIFICADOR:
    case Tipo.FICHA_CRIATURA:
    case Tipo.HABILIDADE_CRIATURA:
      return "nome";
    default:
      return null;
  }
}

/** Âncora legível derivada do título (mesma regra do normalizador dos livros). */
export function derivarAncora(titulo: string): string {
  return (
    titulo
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "secao"
  );
}

/**
 * Âncora do título que não colide com nenhuma de `indisponiveis` (âncoras atuais e antigas das
 * outras peças do livro): a base, ou a base com sufixo `-2`, `-3`… — o primeiro livre, estável.
 */
export function derivarAncoraUnica(titulo: string, indisponiveis: ReadonlySet<string>): string {
  // A coluna da âncora tem 200 caracteres: a base deixa espaço para o sufixo.
  const base = derivarAncora(titulo).slice(0, 180).replace(/-$/, '');
  let ancora = base;
  for (let sufixo = 2; indisponiveis.has(ancora); sufixo += 1) ancora = `${base}-${sufixo}`;
  return ancora;
}
