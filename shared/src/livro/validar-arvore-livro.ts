import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";
import {
  LivroPendenciaCodigoEnum as Codigo,
  LivroPendenciaGravidadeEnum as Gravidade,
} from "../enums/livro-pendencia-codigo.enum";
import {
  LivroArvoreValidarDto,
  LivroPecaDto,
  LivroPendenciaDto,
} from "../dtos/livro/livro-peca.dtos";
import { LIVRO_FILHOS_PERMITIDOS, LIVRO_RAIZ_PERMITIDA } from "./aninhamento";

type TipoDoCampo = "texto" | "numero" | "booleano" | "lista" | "objeto" | "custo" | "textoOuNulo";

interface CampoEsperado {
  readonly campo: string;
  readonly tipo: TipoDoCampo;
  readonly opcional?: boolean;
}

const campoTexto = (campo: string): CampoEsperado => ({ campo, tipo: "texto" });
const campoNumero = (campo: string): CampoEsperado => ({ campo, tipo: "numero" });
const campoLista = (campo: string): CampoEsperado => ({ campo, tipo: "lista" });
const campoObjeto = (campo: string): CampoEsperado => ({ campo, tipo: "objeto" });

const TEXTO_RICO: readonly CampoEsperado[] = [campoLista("trechos")];
const TABELA_FONTE: readonly CampoEsperado[] = [campoLista("cabecalho"), campoLista("linhas")];

/** Forma mínima do `dados` de cada tipo; o que falta ou destoa é pendência ESTRUTURAL. */
const ESQUEMA_DADOS: Readonly<Record<Tipo, readonly CampoEsperado[]>> = {
  [Tipo.SECAO]: [campoTexto("titulo"), campoNumero("nivel"), { campo: "glifo", tipo: "textoOuNulo" }],
  [Tipo.PARAGRAFO]: TEXTO_RICO,
  [Tipo.EXEMPLO]: TEXTO_RICO,
  [Tipo.FORMULA]: TEXTO_RICO,
  [Tipo.NOTA]: TEXTO_RICO,
  [Tipo.LISTA]: [{ campo: "ordenada", tipo: "booleano" }, campoNumero("inicio"), campoLista("itens")],
  [Tipo.TABELA]: TABELA_FONTE,
  [Tipo.HABILIDADE]: [
    campoTexto("nome"),
    { campo: "custo", tipo: "custo" },
    { campo: "reacao", tipo: "booleano" },
    { campo: "glifo", tipo: "textoOuNulo" },
    campoLista("trechos"),
  ],
  [Tipo.CLASSE]: [campoTexto("nome"), campoLista("citacao"), campoObjeto("saude"), campoObjeto("progressao"), ...TABELA_FONTE],
  [Tipo.ARQUETIPO]: [campoTexto("nome"), campoLista("citacao"), campoLista("atributosBonus")],
  [Tipo.SUBCLASSE]: [
    campoTexto("nome"),
    campoTexto("classe"),
    campoLista("citacao"),
    campoLista("custos"),
    campoObjeto("saude"),
    campoObjeto("progressao"),
    campoLista("atributosBonus"),
  ],
  [Tipo.ORIGENS]: TABELA_FONTE,
  [Tipo.ORIGEM]: [
    campoTexto("nome"),
    campoLista("citacao"),
    campoLista("formacao"),
    campoLista("especialidade"),
    campoLista("saberCampo"),
  ],
  [Tipo.TERMOS]: [campoTexto("variante")],
  [Tipo.TERMO]: [campoTexto("nome"), campoLista("descricao")],
  [Tipo.EQUIPAMENTOS]: [campoTexto("categoria")],
  [Tipo.EQUIPAMENTO]: [campoTexto("nome"), campoLista("custo"), campoLista("descricao"), campoLista("peso"), campoLista("danos")],
  [Tipo.MODIFICACOES]: [campoTexto("categoria")],
  [Tipo.MODIFICACAO]: [campoTexto("nome"), campoTexto("empilhamento"), campoLista("efeito"), campoLista("bloqueia")],
  [Tipo.AMPLIFICADORES]: [],
  [Tipo.AMPLIFICADOR]: [campoTexto("nome"), campoTexto("empilhamento"), campoLista("efeito")],
  [Tipo.MODULOS]: [campoLista("modulos")],
  [Tipo.NIVEIS_AMEACA]: [campoLista("niveis")],
  [Tipo.FICHA_CRIATURA]: [
    campoTexto("nome"),
    campoLista("identidade"),
    campoLista("atributos"),
    campoTexto("vidaMaxima"),
    campoTexto("defesaBase"),
    campoLista("resistencias"),
    campoLista("fraquezas"),
    campoLista("regeneracao"),
    campoLista("porte"),
    campoLista("deslocamento"),
    campoTexto("cadencia"),
    campoLista("ataques"),
  ],
  [Tipo.HABILIDADE_CRIATURA]: [campoTexto("nome"), campoTexto("categoria"), campoLista("trechos"), campoTexto("rotulo")],
  [Tipo.ROTEIRO]: [campoLista("etapas"), campoNumero("introducaoQuantidade"), campoNumero("conclusaoQuantidade")],
  [Tipo.FAIXAS]: [campoLista("itens")],
  [Tipo.GRADE]: [campoTexto("apresentacao"), campoNumero("colunas")],
  [Tipo.ABERTURA]: [campoTexto("titulo"), campoLista("trechos")],
  [Tipo.GENERICO]: [campoTexto("motivo"), campoLista("trechos")],
};

/** Campos de texto que precisam estar preenchidos para a peça sair em versão. */
const TEXTO_OBRIGATORIO: Readonly<Partial<Record<Tipo, readonly string[]>>> = {
  [Tipo.SECAO]: ["titulo"],
  [Tipo.HABILIDADE]: ["nome"],
  [Tipo.CLASSE]: ["nome"],
  [Tipo.ARQUETIPO]: ["nome"],
  [Tipo.SUBCLASSE]: ["nome"],
  [Tipo.ORIGEM]: ["nome"],
  [Tipo.TERMO]: ["nome"],
  [Tipo.EQUIPAMENTOS]: ["categoria"],
  [Tipo.EQUIPAMENTO]: ["nome"],
  [Tipo.MODIFICACOES]: ["categoria"],
  [Tipo.MODIFICACAO]: ["nome"],
  [Tipo.AMPLIFICADOR]: ["nome"],
  [Tipo.FICHA_CRIATURA]: ["nome"],
  [Tipo.HABILIDADE_CRIATURA]: ["nome"],
};

const DANOS_VALIDOS: readonly string[] = ["DANO", "UMA MÃO", "DUAS MÃOS"];

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function conferirTipoDoCampo(valor: unknown, tipo: TipoDoCampo): boolean {
  switch (tipo) {
    case "texto":
      return typeof valor === "string";
    case "textoOuNulo":
      return valor === null || typeof valor === "string";
    case "numero":
      return typeof valor === "number" && Number.isFinite(valor);
    case "booleano":
      return typeof valor === "boolean";
    case "lista":
      return Array.isArray(valor);
    case "objeto":
      return ehObjeto(valor);
    case "custo":
      return valor === "X" || (typeof valor === "number" && Number.isFinite(valor));
  }
}

/** Texto corrido de uma lista de trechos, para saber se há conteúdo escrito. */
function extrairTexto(trechos: unknown): string {
  if (!Array.isArray(trechos)) return "";
  return trechos
    .map((trecho) => {
      if (!ehObjeto(trecho)) return "";
      if (typeof trecho["texto"] === "string") return trecho["texto"];
      return extrairTexto(trecho["filhos"]);
    })
    .join("");
}

/** Percorre qualquer valor do `dados` procurando links internos. */
function coletarLinks(valor: unknown, destino: Record<string, unknown>[]): void {
  if (Array.isArray(valor)) {
    valor.forEach((item) => coletarLinks(item, destino));
    return;
  }
  if (!ehObjeto(valor)) return;
  if (valor["tipo"] === "link-interno") destino.push(valor);
  Object.values(valor).forEach((item) => coletarLinks(item, destino));
}

function rotuloDaPeca(peca: LivroPecaDto): string {
  const dados: unknown = peca.dados;
  if (!ehObjeto(dados)) return peca.tipo;
  const nome = dados["titulo"] ?? dados["nome"];
  return typeof nome === "string" && nome.trim() ? nome : peca.tipo;
}

/**
 * Valida a árvore de um livro, na cópia de trabalho ou numa fotografia, e devolve as pendências
 * (nunca lança). Confere: `identificador` único; `ancora` única por livro; filho permitido para o
 * pai; `dados` coerente com o tipo; links internos apontando para peça existente. Pendência
 * `ESTRUTURAL` quebra o contrato e impede qualquer publicação; `CONTEUDO` é trabalho por terminar
 * (campo vazio, link para peça removida) e só impede publicar versão.
 */
export function validarArvoreLivro(dto: LivroArvoreValidarDto): LivroPendenciaDto[] {
  const pendencias: LivroPendenciaDto[] = [];
  const identificadores = new Set<string>();
  const ancoras = new Set<string>();
  const todas: { peca: LivroPecaDto; caminho: readonly string[] }[] = [];
  const identificadoresVistos = new Set<string>();
  const ancorasVistas = new Set<string>();

  const registrar = (
    peca: LivroPecaDto,
    caminho: readonly string[],
    codigo: Codigo,
    gravidade: Gravidade,
    mensagem: string,
  ): void => {
    pendencias.push({ codigo, gravidade, identificador: peca.identificador, caminho, mensagem });
  };

  const percorrer = (
    pecas: readonly LivroPecaDto[],
    tipoPai: Tipo | null,
    caminhoPai: readonly string[],
  ): void => {
    for (const peca of pecas) {
      const caminho = [...caminhoPai, rotuloDaPeca(peca)];
      todas.push({ peca, caminho });

      if (identificadoresVistos.has(peca.identificador)) {
        registrar(peca, caminho, Codigo.IDENTIFICADOR_DUPLICADO, Gravidade.ESTRUTURAL,
          `O identificador ${peca.identificador} aparece mais de uma vez.`);
      }
      identificadoresVistos.add(peca.identificador);
      identificadores.add(peca.identificador);

      if (peca.ancora !== null) {
        if (ancorasVistas.has(peca.ancora)) {
          registrar(peca, caminho, Codigo.ANCORA_DUPLICADA, Gravidade.ESTRUTURAL,
            `A âncora "${peca.ancora}" aparece mais de uma vez no livro.`);
        }
        ancorasVistas.add(peca.ancora);
        ancoras.add(peca.ancora);
      }

      const permitidos = tipoPai === null ? LIVRO_RAIZ_PERMITIDA : LIVRO_FILHOS_PERMITIDOS[tipoPai];
      if (!permitidos.includes(peca.tipo)) {
        const onde = tipoPai === null ? "na raiz do livro" : `dentro de ${tipoPai}`;
        registrar(peca, caminho, Codigo.FILHO_NAO_PERMITIDO, Gravidade.ESTRUTURAL,
          `${peca.tipo} não pode ficar ${onde}.`);
      }

      conferirDados(peca, caminho);
      percorrer(peca.filhos, peca.tipo, caminho);
    }
  };

  const conferirDados = (peca: LivroPecaDto, caminho: readonly string[]): void => {
    const esquema = ESQUEMA_DADOS[peca.tipo];
    const dados: unknown = peca.dados;
    if (!esquema || !ehObjeto(dados)) {
      registrar(peca, caminho, Codigo.DADOS_INVALIDOS, Gravidade.ESTRUTURAL,
        `Os dados de ${peca.tipo} não são um objeto.`);
      return;
    }
    let formaValida = true;
    for (const { campo, tipo, opcional } of esquema) {
      const valor = dados[campo];
      if (valor === undefined && opcional) continue;
      if (!conferirTipoDoCampo(valor, tipo)) {
        formaValida = false;
        registrar(peca, caminho, Codigo.DADOS_INVALIDOS, Gravidade.ESTRUTURAL,
          `O campo "${campo}" de ${peca.tipo} está ausente ou com tipo errado.`);
      }
    }
    if (peca.tipo === Tipo.SECAO && formaValida && ![1, 2, 3, 4].includes(dados["nivel"] as number)) {
      registrar(peca, caminho, Codigo.DADOS_INVALIDOS, Gravidade.ESTRUTURAL,
        "O nível da seção precisa ser 1, 2, 3 ou 4.");
    }
    if (peca.tipo === Tipo.GRADE && formaValida) conferirGrade(peca, caminho, dados);
    if (!formaValida) return;

    for (const campo of TEXTO_OBRIGATORIO[peca.tipo] ?? []) {
      const valor = dados[campo];
      if (typeof valor === "string" && !valor.trim()) {
        registrar(peca, caminho, Codigo.CONTEUDO_INCOMPLETO, Gravidade.CONTEUDO,
          `Falta preencher "${campo}".`);
      }
    }
    conferirEquipamento(peca, caminho, dados);
    conferirClasse(peca, caminho, dados);
    if (peca.tipo === Tipo.HABILIDADE) {
      if (typeof dados["custo"] === "number" && dados["custo"] < 0) {
        registrar(peca, caminho, Codigo.CONTEUDO_INCOMPLETO, Gravidade.CONTEUDO,
          "O custo da habilidade não pode ser negativo.");
      }
      if (!extrairTexto(dados["trechos"]).trim()) {
        registrar(peca, caminho, Codigo.CONTEUDO_INCOMPLETO, Gravidade.CONTEUDO,
          "Falta o efeito da habilidade.");
      }
    }
  };

  /** Pendências de conteúdo dos itens de equipamento, modificação e amplificador (m11-08). */
  const conferirEquipamento = (
    peca: LivroPecaDto,
    caminho: readonly string[],
    dados: Record<string, unknown>,
  ): void => {
    const faltou = (mensagem: string): void =>
      registrar(peca, caminho, Codigo.CONTEUDO_INCOMPLETO, Gravidade.CONTEUDO, mensagem);
    const vazio = (campo: string): boolean => !extrairTexto(dados[campo]).trim();
    if (peca.tipo === Tipo.EQUIPAMENTO) {
      if (vazio("custo")) faltou("Falta o custo do equipamento.");
      if (vazio("peso")) faltou("Falta o peso do equipamento.");
      if (vazio("descricao")) faltou("Falta a descrição do equipamento.");
      const danos: unknown[] = Array.isArray(dados["danos"]) ? dados["danos"] : [];
      if (danos.some((dano) => !ehObjeto(dano) || !DANOS_VALIDOS.includes(dano["rotulo"] as string)
        || !Array.isArray(dano["trechos"]))) {
        registrar(peca, caminho, Codigo.DADOS_INVALIDOS, Gravidade.ESTRUTURAL,
          "Cada dano precisa de um rótulo (DANO, UMA MÃO ou DUAS MÃOS) e de trechos.");
        return;
      }
      const semTexto = danos.some((dano) => !ehObjeto(dano) || !extrairTexto(dano["trechos"]).trim());
      if (semTexto) faltou("Há um dano sem valor.");
    }
    if (peca.tipo === Tipo.MODIFICACAO || peca.tipo === Tipo.AMPLIFICADOR) {
      if (typeof dados["empilhamento"] === "string" && !/^■+□*$/.test(dados["empilhamento"])) {
        faltou("Falta o empilhamento (ao menos um ■ inicial).");
      }
      if (vazio("efeito")) faltou("Falta o efeito.");
    }
    if (peca.tipo === Tipo.MODIFICACAO && vazio("bloqueia")) {
      faltou("Falta o que a modificação bloqueia (use — se nada).");
    }
  };

  /** Pendências de conteúdo de classe, arquétipo e subclasse (m11-08). */
  const conferirClasse = (
    peca: LivroPecaDto,
    caminho: readonly string[],
    dados: Record<string, unknown>,
  ): void => {
    const faltou = (mensagem: string): void =>
      registrar(peca, caminho, Codigo.CONTEUDO_INCOMPLETO, Gravidade.CONTEUDO, mensagem);
    const recurso = (grupo: string, campo: string): string => {
      const valor = dados[grupo];
      return ehObjeto(valor) ? extrairTexto(valor[campo]).trim() : "";
    };
    if (peca.tipo === Tipo.CLASSE || peca.tipo === Tipo.SUBCLASSE) {
      if (!recurso("saude", "vida") || !recurso("saude", "energia")) faltou("Falta a Vida e a Energia iniciais.");
      if (!recurso("progressao", "vida") || !recurso("progressao", "energia")) {
        faltou("Falta a progressão de Vida e de Energia por nível.");
      }
    }
    if (peca.tipo === Tipo.ARQUETIPO || peca.tipo === Tipo.SUBCLASSE) {
      if (!extrairTexto(dados["atributosBonus"]).trim()) faltou("Faltam os atributos bônus.");
    }
    if (peca.tipo === Tipo.SUBCLASSE) {
      if (typeof dados["classe"] === "string" && !dados["classe"].trim()) faltou("Falta a classe da subclasse.");
      const custos: unknown[] = Array.isArray(dados["custos"]) ? dados["custos"] : [];
      if (custos.length === 0 || custos.some((custo) => !extrairTexto(custo).trim())) {
        faltou("Falta o custo do experimento (ao menos um, sem linha vazia).");
      }
    }
  };

  const conferirGrade = (
    peca: LivroPecaDto,
    caminho: readonly string[],
    dados: Record<string, unknown>,
  ): void => {
    const apresentacao = dados["apresentacao"];
    const camposDaVariante =
      apresentacao === "generica" ? ["cabecalho", "linhas"]
      : apresentacao === "saude" || apresentacao === "cartoes" ? ["itens"]
      : null;
    if (camposDaVariante === null) {
      registrar(peca, caminho, Codigo.DADOS_INVALIDOS, Gravidade.ESTRUTURAL,
        "A apresentação da grade precisa ser generica, saude ou cartoes.");
      return;
    }
    for (const campo of camposDaVariante) {
      if (!Array.isArray(dados[campo])) {
        registrar(peca, caminho, Codigo.DADOS_INVALIDOS, Gravidade.ESTRUTURAL,
          `O campo "${campo}" da grade ${String(apresentacao)} está ausente ou com tipo errado.`);
      }
    }
  };

  const conferirLinks = (
    peca: LivroPecaDto,
    caminho: readonly string[],
    dados: Record<string, unknown>,
  ): void => {
    const links: Record<string, unknown>[] = [];
    coletarLinks(dados, links);
    for (const link of links) {
      const texto = typeof link["texto"] === "string" ? link["texto"] : "";
      if (dto.modo === "trabalho") {
        const destino = link["identificador"];
        if (typeof destino !== "string" || !destino) {
          registrar(peca, caminho, Codigo.LINK_SEM_IDENTIFICADOR, Gravidade.ESTRUTURAL,
            `O link "${texto}" não aponta para um identificador.`);
        } else if (!identificadores.has(destino)) {
          registrar(peca, caminho, Codigo.LINK_INEXISTENTE, Gravidade.CONTEUDO,
            `O link "${texto}" aponta para uma peça que não existe mais.`);
        }
      } else if (typeof link["ancora"] !== "string" || !ancoras.has(link["ancora"])) {
        registrar(peca, caminho, Codigo.LINK_INEXISTENTE, Gravidade.CONTEUDO,
          `O link "${texto}" aponta para uma âncora que não existe no livro.`);
      }
    }
  };

  percorrer(dto.pecas, null, []);
  // Links só podem ser conferidos depois de conhecer todos os identificadores e âncoras.
  for (const { peca, caminho } of todas) {
    const dados: unknown = peca.dados;
    if (ehObjeto(dados)) conferirLinks(peca, caminho, dados);
  }
  return pendencias;
}
