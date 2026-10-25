import { createHash } from "node:crypto";
import {
  LIVRO_FORMATO_ATUAL,
  LIVRO_PACOTE_FORMATO_ATUAL,
} from "@contratados-rpg/shared/dtos/livro";
import type {
  LivroPacoteDto,
  LivroPacoteItemDto,
  LivroVersaoConteudoDto,
} from "@contratados-rpg/shared/dtos/livro";
import { LivroPendenciaGravidadeEnum, TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";
import { validarArvoreLivro } from "@contratados-rpg/shared/livro";

type Registro = Record<string, unknown>;
type Conferir = (valor: unknown) => unknown;
const CODIGOS = ["sistema", "guia"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ANCORA = /^[^\s#\p{Cc}]+$/u;
const falhar = (): never => {
  throw new Error(
    "Pacote de livros inválido: estrutura, integridade ou referências incompatíveis.",
  );
};
const exigir = (condicao: unknown): void => {
  if (!condicao) falhar();
};
const objeto = (valor: unknown): Registro => {
  exigir(
    valor !== null &&
      typeof valor === "object" &&
      !Array.isArray(valor) &&
      (Object.getPrototypeOf(valor) === Object.prototype || Object.getPrototypeOf(valor) === null),
  );
  return valor as Registro;
};
const texto: Conferir = (valor) => exigir(typeof valor === "string" && valor.length <= 2_000_000);
// Compatível com MARCA do exportador e seguro na composição de `sistema-v${numero}.md`.
const numeroEditorial: Conferir = (valor) =>
  exigir(
    typeof valor === "string" && valor.length > 0 && valor.length <= 40 && !/[^\w.-]/u.test(valor),
  );
const numero: Conferir = (valor) => exigir(typeof valor === "number" && Number.isFinite(valor));
const inteiro: Conferir = (valor) => exigir(Number.isSafeInteger(valor) && (valor as number) >= 0);
const booleano: Conferir = (valor) => exigir(typeof valor === "boolean");
const escolha =
  (...valores: unknown[]): Conferir =>
  (valor) =>
    exigir(valores.includes(valor));
const lista =
  (conferir: Conferir): Conferir =>
  (valor) => {
    exigir(Array.isArray(valor) && valor.length <= 100_000);
    (valor as unknown[]).forEach(conferir);
  };
const esquema =
  (campos: Record<string, Conferir>, opcionais: Record<string, Conferir> = {}): Conferir =>
  (valor) => {
    const registro = objeto(valor);
    for (const chave of Object.keys(registro))
      exigir(Object.hasOwn(campos, chave) || Object.hasOwn(opcionais, chave));
    for (const [chave, conferir] of Object.entries(campos)) {
      exigir(Object.hasOwn(registro, chave));
      conferir(registro[chave]);
    }
    for (const [chave, conferir] of Object.entries(opcionais))
      if (Object.hasOwn(registro, chave)) conferir(registro[chave]);
  };
const data: Conferir = (valor) => {
  texto(valor);
  exigir(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(valor as string));
  exigir(Number.isFinite(Date.parse(valor as string)));
  exigir(new Date(valor as string).toISOString().slice(0, 19) === (valor as string).slice(0, 19));
};

/** JSON canônico: chaves ordenadas recursivamente; arrays preservados e apenas JSON finito. */
export function serializarCanonico(valor: unknown): string {
  const ancestrais = new Set<object>();
  let quantidade = 0;
  let tamanho = 0;
  const contabilizar = (trecho: string): string => {
    tamanho += Buffer.byteLength(trecho, "utf8");
    exigir(tamanho <= 32 * 1024 * 1024);
    return trecho;
  };
  const serializar = (atual: unknown, profundidade: number): string => {
    exigir(profundidade <= 128 && ++quantidade <= 1_000_000);
    if (atual === null) return contabilizar("null");
    if (typeof atual === "string") {
      texto(atual);
      return contabilizar(JSON.stringify(atual));
    }
    if (typeof atual === "number") {
      numero(atual);
      return contabilizar(JSON.stringify(atual));
    }
    if (typeof atual === "boolean") return contabilizar(JSON.stringify(atual));
    exigir(typeof atual === "object" && atual !== null && !ancestrais.has(atual));
    const referencia = atual as object;
    ancestrais.add(referencia);
    let resultado: string;
    if (Array.isArray(atual)) {
      exigir(atual.length <= 100_000);
      contabilizar("[" + ",".repeat(Math.max(0, atual.length - 1)) + "]");
      resultado = `[${Array.from(atual, (item) => serializar(item, profundidade + 1)).join(",")}]`;
    } else {
      const registro = objeto(atual);
      exigir(
        Object.keys(registro).length <= 100_000 &&
          Object.getOwnPropertySymbols(registro).length === 0,
      );
      contabilizar("{" + ",".repeat(Math.max(0, Object.keys(registro).length - 1)) + "}");
      resultado = `{${Object.keys(registro)
        .sort()
        .map((chave) => {
          exigir(!["__proto__", "constructor", "prototype"].includes(chave));
          texto(chave);
          contabilizar(JSON.stringify(chave) + ":");
          const descritor = Object.getOwnPropertyDescriptor(registro, chave);
          exigir(descritor && "value" in descritor);
          return `${JSON.stringify(chave)}:${serializar(registro[chave], profundidade + 1)}`;
        })
        .join(",")}}`;
    }
    ancestrais.delete(referencia);
    return resultado;
  };
  const resultado = serializar(valor, 0);
  exigir(Buffer.byteLength(resultado, "utf8") <= 32 * 1024 * 1024);
  return resultado;
}

const trecho: Conferir = (valor) => {
  const tipo = objeto(valor)["tipo"];
  if (tipo === "texto") return esquema({ tipo: escolha(tipo), texto })(valor);
  if (["negrito", "italico", "tachado"].includes(tipo as string))
    return esquema({ tipo: escolha(tipo), filhos: lista(trecho) })(valor);
  if (tipo === "tarja") return esquema({ tipo: escolha(tipo), comprimento: inteiro })(valor);
  if (tipo === "link-interno")
    return esquema({ tipo: escolha(tipo), texto, ancora: texto }, { identificador: texto })(valor);
  if (tipo === "nivel-ameaca")
    return esquema({ tipo: escolha(tipo), nivel: inteiro, texto }, { compacto: booleano })(valor);
  if (tipo === "link-externo")
    return esquema({ tipo: escolha(tipo), destino: texto, filhos: lista(trecho) })(valor);
  falhar();
};
const trechos = lista(trecho);
const tabela = { cabecalho: lista(trechos), linhas: lista(lista(trechos)) };
const saude = esquema({ vida: trechos, energia: trechos });
const bloco: Conferir = (valor) => {
  const tipo = objeto(valor)["tipo"];
  if (tipo === "paragrafo") return esquema({ tipo: escolha(tipo), trechos })(valor);
  return esquema({
    tipo: escolha("lista"),
    ordenada: booleano,
    inicio: inteiro,
    itens: lista(lista(bloco)),
  })(valor);
};
const dadosPorTipo: Record<Tipo, Conferir> = {
  [Tipo.SECAO]: esquema(
    { titulo: texto, nivel: escolha(1, 2, 3, 4), glifo: escolha(null, "⬢", "⬡", "⬥", "⬦") },
    { origemTabela: booleano },
  ),
  [Tipo.PARAGRAFO]: esquema({ trechos }),
  [Tipo.EXEMPLO]: esquema({ trechos }),
  [Tipo.FORMULA]: esquema({ trechos }),
  [Tipo.NOTA]: esquema({ trechos }),
  [Tipo.LISTA]: esquema({ ordenada: booleano, inicio: inteiro, itens: lista(lista(bloco)) }),
  [Tipo.TABELA]: esquema(tabela, { emPares: booleano }),
  [Tipo.HABILIDADE]: esquema(
    {
      nome: texto,
      custo: (valor) => (valor === "X" ? undefined : numero(valor)),
      reacao: booleano,
      glifo: escolha(null, "⬦", "◈", "◻"),
      trechos,
    },
    { inicial: booleano, melhorada: booleano },
  ),
  [Tipo.CLASSE]: esquema({ nome: texto, citacao: trechos, saude, progressao: saude, ...tabela }),
  [Tipo.ARQUETIPO]: esquema({ nome: texto, citacao: trechos, atributosBonus: trechos }),
  [Tipo.SUBCLASSE]: esquema({
    nome: texto,
    classe: texto,
    citacao: trechos,
    custos: lista(trechos),
    saude,
    progressao: saude,
    atributosBonus: trechos,
  }),
  [Tipo.ORIGENS]: esquema(tabela),
  [Tipo.ORIGEM]: esquema({
    nome: texto,
    citacao: trechos,
    formacao: trechos,
    especialidade: trechos,
    saberCampo: trechos,
  }),
  [Tipo.TERMOS]: esquema({
    variante: escolha("atributos", "maestrias", "penalidades", "verbetes"),
  }),
  [Tipo.TERMO]: esquema({ nome: texto, descricao: trechos }, { numero, rotulo: texto }),
  [Tipo.EQUIPAMENTOS]: esquema({ categoria: texto }),
  [Tipo.EQUIPAMENTO]: esquema(
    {
      nome: texto,
      custo: trechos,
      descricao: trechos,
      peso: trechos,
      danos: lista(esquema({ rotulo: escolha("DANO", "UMA MÃO", "DUAS MÃOS"), trechos })),
    },
    { porte: trechos, especificacoes: trechos, duracao: trechos },
  ),
  [Tipo.MODIFICACOES]: esquema({ categoria: texto }, { nota: trechos }),
  [Tipo.MODIFICACAO]: esquema({
    nome: texto,
    empilhamento: texto,
    efeito: trechos,
    bloqueia: trechos,
  }),
  [Tipo.AMPLIFICADORES]: esquema({}),
  [Tipo.AMPLIFICADOR]: esquema({ nome: texto, empilhamento: texto, efeito: trechos }),
  [Tipo.MODULOS]: esquema({ modulos: lista(esquema({ nivel: texto, energiaMaxima: inteiro })) }),
  [Tipo.NIVEIS_AMEACA]: esquema({
    niveis: lista(esquema({ nivel: inteiro, referenciaImagem: texto, descricao: trechos })),
  }),
  [Tipo.FICHA_CRIATURA]: esquema({
    nome: texto,
    identidade: lista(esquema({ rotulo: texto, valor: trechos }, { nivel: numero })),
    atributos: lista(esquema({ nome: texto, valor: numero, modificador: texto, bonus: texto })),
    vidaMaxima: texto,
    defesaBase: texto,
    resistencias: trechos,
    fraquezas: trechos,
    regeneracao: trechos,
    porte: trechos,
    deslocamento: trechos,
    cadencia: texto,
    ataques: lista(
      esquema({ nome: texto, acao: texto, teste: texto, dano: texto, efeito: trechos }),
    ),
  }),
  [Tipo.HABILIDADE_CRIATURA]: esquema({
    nome: texto,
    categoria: escolha("PASSIVA", "ATIVA", "DE GATILHO"),
    trechos,
    rotulo: texto,
  }),
  [Tipo.ROTEIRO]: esquema({
    etapas: lista(esquema({ ordem: inteiro, titulo: trechos, descricao: trechos })),
    introducaoQuantidade: inteiro,
    conclusaoQuantidade: inteiro,
  }),
  [Tipo.FAIXAS]: esquema({ itens: lista(esquema({ rotulo: texto, valor: texto })) }),
  [Tipo.GRADE]: (valor) =>
    objeto(valor)["apresentacao"] === "generica"
      ? esquema({ apresentacao: escolha("generica"), colunas: inteiro, ...tabela })(valor)
      : esquema(
          {
            apresentacao: escolha("saude", "cartoes"),
            colunas: inteiro,
            itens: lista(
              esquema(
                { rotulo: texto, conteudo: trechos },
                { nota: texto, variante: escolha("vida", "energia") },
              ),
            ),
          },
          { titulo: texto },
        )(valor),
  [Tipo.ABERTURA]: esquema({ titulo: texto, trechos }, { selo: texto }),
  [Tipo.GENERICO]: esquema({ motivo: texto, trechos }),
};

function conferirConteudo(valor: unknown, identificadores: Set<string>, exigirCompleto = true): void {
  const ancoras = new Set<string>();
  const identificadorAncora = new Map<string, string | null>();
  const peca: Conferir = (atual) => {
    esquema({
      identificador: texto,
      ancora: (ancora) =>
        exigir(ancora === null || (typeof ancora === "string" && ANCORA.test(ancora))),
      tipo: escolha(...Object.values(Tipo)),
      ordem: inteiro,
      dados: objeto,
      filhos: lista(peca),
    })(atual);
    const registro = objeto(atual);
    const identificador = registro["identificador"] as string;
    const ancora = registro["ancora"] as string | null;
    exigir(UUID.test(identificador) && !identificadores.has(identificador.toLowerCase()));
    identificadores.add(identificador.toLowerCase());
    identificadorAncora.set(identificador, ancora);
    if (ancora !== null) {
      exigir(!ancoras.has(ancora));
      ancoras.add(ancora);
    }
    dadosPorTipo[registro["tipo"] as Tipo](registro["dados"]);
  };
  esquema(
    {
      formato: escolha(LIVRO_FORMATO_ATUAL),
      codigo: texto,
      titulo: texto,
      subtitulo: texto,
      numero: numeroEditorial,
      pecas: lista(peca),
    },
    { ancorasAntigas: objeto },
  )(valor);
  // Somente após checar integralmente a forma é seguro chamar o motor compartilhado.
  const conteudo = valor as LivroVersaoConteudoDto;
  for (const [antiga, destino] of Object.entries(conteudo.ancorasAntigas ?? {})) {
    exigir(
      ANCORA.test(antiga) &&
        typeof destino === "string" &&
        ancoras.has(destino) &&
        !ancoras.has(antiga),
    );
  }
  const conferirLinks = (atual: unknown): void => {
    if (Array.isArray(atual)) {
      atual.forEach(conferirLinks);
      return;
    }
    if (atual === null || typeof atual !== "object") return;
    const registro = objeto(atual);
    if (registro["tipo"] === "link-interno") {
      exigir(ancoras.has(registro["ancora"] as string));
      if (registro["identificador"] !== undefined)
        exigir(identificadorAncora.get(registro["identificador"] as string) === registro["ancora"]);
    }
    Object.values(registro).forEach(conferirLinks);
  };
  if (exigirCompleto) conferirLinks(conteudo.pecas);
  const pendencias = validarArvoreLivro({ pecas: conteudo.pecas, modo: "fotografia" });
  exigir((exigirCompleto ? pendencias : pendencias.filter((pendencia) => pendencia.gravidade === LivroPendenciaGravidadeEnum.ESTRUTURAL)).length === 0);
}

/** Valida uma fotografia isolada, inclusive dados ricos e referências, para recuperação. */
export function validarConteudoLivro(valor: unknown): LivroVersaoConteudoDto {
  serializarCanonico(valor);
  conferirConteudo(valor, new Set<string>());
  return valor as LivroVersaoConteudoDto;
}

/** Rascunhos preservam pendências de conteúdo legítimas; a forma continua validada integralmente. */
export function validarEstruturaConteudoLivro(valor: unknown): LivroVersaoConteudoDto {
  serializarCanonico(valor);
  conferirConteudo(valor, new Set<string>(), false);
  return valor as LivroVersaoConteudoDto;
}

/** Recusa pacote malformado ou adulterado antes de qualquer acesso mutável ao banco. */
export function validarPacoteLivros(valor: unknown): LivroPacoteDto {
  serializarCanonico(valor);
  const identificadores = new Set<string>();
  const item = esquema({
    codigo: escolha(...CODIGOS),
    titulo: texto,
    ordem: inteiro,
    numero: numeroEditorial,
    formato: escolha(LIVRO_FORMATO_ATUAL),
    publicacaoData: data,
    nota: (nota) => (nota === null ? undefined : texto(nota)),
    conteudo: (conteudo) => conferirConteudo(conteudo, identificadores),
  });
  esquema({
    formato: escolha(LIVRO_PACOTE_FORMATO_ATUAL),
    exportacaoData: data,
    livros: lista(item),
    sha256: texto,
  })(valor);
  const pacote = valor as LivroPacoteDto;
  exigir(
    pacote.livros.length === 2 && new Set(pacote.livros.map((livro) => livro.codigo)).size === 2,
  );
  for (const livro of pacote.livros) {
    exigir(
      livro.codigo === livro.conteudo.codigo &&
        livro.titulo === livro.conteudo.titulo &&
        livro.numero === livro.conteudo.numero &&
        livro.formato === livro.conteudo.formato &&
        livro.titulo.trim().length > 0 &&
        livro.numero.trim().length > 0,
    );
  }
  const { sha256, ...corpo } = pacote;
  exigir(
    /^[0-9a-f]{64}$/.test(sha256) &&
      createHash("sha256").update(serializarCanonico(corpo), "utf8").digest("hex") === sha256,
  );
  return pacote;
}

/** Cria e valida o pacote completo; o hash cobre conteúdo e metadados originais. */
export function criarPacoteLivros(
  livros: readonly LivroPacoteItemDto[],
  exportacaoData = new Date().toISOString(),
): LivroPacoteDto {
  const corpo = { formato: LIVRO_PACOTE_FORMATO_ATUAL, exportacaoData, livros };
  return validarPacoteLivros({
    ...corpo,
    sha256: createHash("sha256").update(serializarCanonico(corpo), "utf8").digest("hex"),
  });
}
