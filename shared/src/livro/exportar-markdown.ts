import type {
  LivroAberturaDadosDto,
  LivroCelulaDto,
  LivroClasseDadosDto,
  LivroEquipamentoDadosDto,
  LivroFichaCriaturaDadosDto,
  LivroGradeDadosDto,
  LivroHabilidadeCriaturaDadosDto,
  LivroHabilidadeDadosDto,
  LivroListaDadosDto,
  LivroListaItemBlocoDto,
  LivroPecaDto,
  LivroSaudeRecursosDto,
  LivroSecaoDadosDto,
  LivroTabelaDadosDto,
  LivroTrechoDto,
  LivroVersaoConteudoDto,
} from "../dtos/livro";
import { TipoRegraPecaEnum as Tipo } from "../enums/tipo-regra-peca.enum";

/**
 * Exporta um livro publicado como Markdown legível (m11-10): a cópia gerada de `docs/core/`, lida
 * por pessoas e agentes. Pura e determinística (mesma fotografia, mesmo texto). Não é lida de volta:
 * o banco é a fonte da verdade e o Markdown é só leitura. Cada peça sai com o texto completo; marcas
 * que o Markdown não carrega (exemplo, nota, fórmula, container) ficam em comentários HTML.
 * Seções viram títulos (`##` para o nível 1); os cartões (classe, arquétipo, origem, equipamento,
 * ficha de criatura…) vivem abaixo da seção em que estão. A tabela de layout que a classe e as origens
 * guardam da fonte repete as peças filhas e não é exportada.
 */
export function exportarLivroEmMarkdown(livro: LivroVersaoConteudoDto): string {
  const blocos: string[][] = [[`# ${escapar(livro.titulo)}`]];
  if (livro.subtitulo) blocos.push([`*${escapar(livro.subtitulo)}*`]);
  blocos.push(...pecasEmBlocos(livro.pecas, 1));
  return `${blocos.map((bloco) => bloco.join("\n")).join("\n\n")}\n`;
}

type Bloco = string[];

// ------------------------------------------------------------------------------------ texto

/** Escapa só o que quebraria a estrutura do Markdown; o resto do texto sai como está. */
function escapar(texto: string): string {
  return texto.replace(/([\\*_[\]])/g, "\\$1").replace(/\n/g, "  \n");
}

/** Marcadores de bloco (`>`, `#`, `-`, `+`, `1.`) no começo de uma linha de texto viram texto, não citação, título ou lista. */
function protegerInicio(texto: string): string {
  return texto.split("\n").map((linha) =>
    linha.replace(/^(\s*)(>|#{1,6}(?=\s)|[+-](?=\s)|\d+(?=[.)]\s))/, (_inteiro, recuo: string, marcador: string) =>
      /^\d+$/.test(marcador) ? `${recuo}${marcador}\\` : `${recuo}\\${marcador}`)).join("\n");
}

const paragrafoSeguro = (trechos: readonly LivroTrechoDto[]): string => protegerInicio(inline(trechos));

function inline(trechos: readonly LivroTrechoDto[]): string {
  return trechos.map(trecho).join("");
}

function trecho(item: LivroTrechoDto): string {
  switch (item.tipo) {
    case "texto":
      return escapar(item.texto);
    case "negrito":
      return envolver("**", inline(item.filhos));
    case "italico":
      return envolver("*", inline(item.filhos));
    case "tarja":
      return "█".repeat(item.comprimento);
    case "link-interno":
      return `[${escapar(item.texto)}](#${item.ancora})`;
    case "nivel-ameaca":
      return escapar(item.texto);
    case "link-externo":
      return `[${inline(item.filhos)}](${item.destino})`;
  }
}

/** Marcadores não podem encostar em espaço: o espaço de borda sai para fora do marcador. */
function envolver(marcador: string, conteudo: string): string {
  const miolo = conteudo.trim();
  if (!miolo) return conteudo;
  const antes = conteudo.slice(0, conteudo.length - conteudo.trimStart().length);
  const depois = conteudo.slice(conteudo.trimEnd().length);
  return `${antes}${marcador}${miolo}${marcador}${depois}`;
}

/** Texto seguro dentro de um comentário HTML. */
const comentario = (texto: string): string => texto.replace(/--/g, "—");

/** Texto de uma célula: sem `|` nem quebra de linha. */
function celula(trechos: LivroCelulaDto): string {
  return inline(trechos).replace(/\|/g, "\\|").replace(/ {2}\n/g, "<br>").trim();
}

const rotulado = (rotulo: string, trechos: readonly LivroTrechoDto[]): string =>
  trechos.length ? `**${rotulo}** ${inline(trechos)}` : `**${rotulo}**`;

function tabela(cabecalho: readonly LivroCelulaDto[], linhas: readonly (readonly LivroCelulaDto[])[]): Bloco {
  const largura = Math.max(cabecalho.length, ...linhas.map((linha) => linha.length), 1);
  const montar = (celulas: readonly LivroCelulaDto[]): string =>
    `| ${Array.from({ length: largura }, (_, indice) => celula(celulas[indice] ?? [])).join(" | ")} |`;
  return [
    montar(cabecalho),
    `| ${Array.from({ length: largura }, () => "---").join(" | ")} |`,
    ...linhas.map(montar),
  ];
}

function citar(linhas: readonly string[]): Bloco {
  return linhas.flatMap((linha) => linha.split("\n")).map((linha) => (linha ? `> ${linha}` : ">"));
}

function titulo(nivel: number, texto: string, ancora: string | null): string {
  return `${"#".repeat(Math.min(nivel, 6))} ${texto}${ancora ? ` {#${ancora}}` : ""}`;
}

// ------------------------------------------------------------------------------------ listas

function itemDeLista(blocos: readonly LivroListaItemBlocoDto[], marcador: string): string[] {
  const recuo = " ".repeat(marcador.length);
  const linhas: string[] = [];
  blocos.forEach((bloco, indice) => {
    const texto = bloco.tipo === "paragrafo" ? inline(bloco.trechos).split("\n") : lista(bloco).slice();
    texto.forEach((linha, posicao) => {
      linhas.push(indice === 0 && posicao === 0 ? `${marcador}${linha}` : `${recuo}${linha}`);
    });
  });
  return linhas.length ? linhas : [marcador.trimEnd()];
}

function lista(dados: Pick<LivroListaDadosDto, "ordenada" | "inicio" | "itens">): string[] {
  return dados.itens.flatMap((item, indice) =>
    itemDeLista(item, dados.ordenada ? `${dados.inicio + indice}. ` : "- "));
}

// ------------------------------------------------------------------------------------ peças

function pecasEmBlocos(pecas: readonly LivroPecaDto[], nivel: number): Bloco[] {
  return pecas.flatMap((peca) => pecaEmBlocos(peca, nivel));
}

/** `nivel` é o nível do título da seção que contém a peça (cartões abrem no nível seguinte). */
function pecaEmBlocos(peca: LivroPecaDto, nivel: number): Bloco[] {
  const dados = peca.dados as unknown;
  switch (peca.tipo) {
    case Tipo.SECAO: {
      const secao = dados as LivroSecaoDadosDto;
      const rotulo = [secao.glifo, escapar(secao.titulo)].filter(Boolean).join(" ");
      return [[titulo(secao.nivel + 1, rotulo, peca.ancora)], ...pecasEmBlocos(peca.filhos, secao.nivel)];
    }
    case Tipo.PARAGRAFO:
      return [[paragrafoSeguro((dados as { trechos: readonly LivroTrechoDto[] }).trechos)]];
    case Tipo.EXEMPLO:
      return [["<!-- exemplo -->", paragrafoSeguro((dados as { trechos: readonly LivroTrechoDto[] }).trechos)]];
    case Tipo.FORMULA:
      return [["<!-- fórmula -->", paragrafoSeguro((dados as { trechos: readonly LivroTrechoDto[] }).trechos)]];
    case Tipo.NOTA:
      return [["<!-- nota -->", paragrafoSeguro((dados as { trechos: readonly LivroTrechoDto[] }).trechos)]];
    case Tipo.LISTA:
      return [lista(dados as LivroListaDadosDto)];
    case Tipo.TABELA: {
      const { cabecalho, linhas, emPares } = dados as LivroTabelaDadosDto;
      return [[...(emPares ? ["<!-- tabela em pares -->"] : []), ...tabela(cabecalho, linhas)]];
    }
    case Tipo.HABILIDADE:
      return [[habilidade(dados as LivroHabilidadeDadosDto)]];
    case Tipo.CLASSE:
      return classe(peca, dados as LivroClasseDadosDto, nivel);
    case Tipo.ARQUETIPO:
      return arquetipo(peca, nivel);
    case Tipo.SUBCLASSE:
      return subclasse(peca, nivel);
    case Tipo.ORIGENS:
      // A tabela do container repete, em colunas, as origens filhas: só as filhas saem.
      return [["<!-- origens -->"], ...pecasEmBlocos(peca.filhos, nivel)];
    case Tipo.ORIGEM: {
      const origem = dados as { nome: string; citacao: readonly LivroTrechoDto[]; formacao: readonly LivroTrechoDto[]; especialidade: readonly LivroTrechoDto[]; saberCampo: readonly LivroTrechoDto[] };
      return [
        [titulo(nivel + 2, escapar(origem.nome), null)],
        ...(origem.citacao.length ? [[inline(origem.citacao)]] : []),
        [rotulado("Formação", origem.formacao)],
        [rotulado("Especialidade", origem.especialidade)],
        [rotulado("Saber de Campo", origem.saberCampo)],
      ];
    }
    case Tipo.TERMOS:
      return [[`<!-- termos: ${(dados as { variante: string }).variante} -->`], ...pecasEmBlocos(peca.filhos, nivel)];
    case Tipo.TERMO: {
      const termo = dados as { nome: string; numero?: number; rotulo?: string; descricao: readonly LivroTrechoDto[] };
      const detalhe = [termo.numero !== undefined ? String(termo.numero) : "", termo.rotulo ?? ""].filter(Boolean).join(" · ");
      return [[`- **${escapar(termo.nome)}**${detalhe ? ` (${escapar(detalhe)})` : ""}: ${inline(termo.descricao)}`]];
    }
    case Tipo.EQUIPAMENTOS:
      return [
        [`<!-- equipamentos: ${comentario((dados as { categoria: string }).categoria)} -->`],
        ...pecasEmBlocos(peca.filhos, nivel + 1),
      ];
    case Tipo.EQUIPAMENTO:
      return [equipamento(dados as LivroEquipamentoDadosDto)];
    case Tipo.MODIFICACOES: {
      const { categoria, nota } = dados as { categoria: string; nota?: readonly LivroTrechoDto[] };
      return [
        [titulo(nivel + 2, `Modificações — ${escapar(categoria)}`, null)],
        ...(nota?.length ? [[inline(nota)]] : []),
        ...pecasEmBlocos(peca.filhos, nivel + 1),
      ];
    }
    case Tipo.MODIFICACAO: {
      const modificacao = dados as { nome: string; empilhamento: string; efeito: readonly LivroTrechoDto[]; bloqueia: readonly LivroTrechoDto[] };
      return [[
        `**${escapar(modificacao.nome)}** ${escapar(modificacao.empilhamento)}  `,
        rotulado("Efeito", modificacao.efeito) + "  ",
        rotulado("Bloqueia", modificacao.bloqueia),
      ]];
    }
    case Tipo.AMPLIFICADORES:
      return [["<!-- amplificadores -->"], ...pecasEmBlocos(peca.filhos, nivel + 1)];
    case Tipo.AMPLIFICADOR: {
      const amplificador = dados as { nome: string; empilhamento: string; efeito: readonly LivroTrechoDto[] };
      return [[
        `**${escapar(amplificador.nome)}** ${escapar(amplificador.empilhamento)}  `,
        rotulado("Efeito", amplificador.efeito),
      ]];
    }
    case Tipo.MODULOS: {
      const { modulos } = dados as { modulos: readonly { nivel: string; energiaMaxima: number }[] };
      return [tabela(
        [[{ tipo: "texto", texto: "Nível" }], [{ tipo: "texto", texto: "Energia máxima" }]],
        modulos.map((modulo) => [[{ tipo: "texto", texto: modulo.nivel }], [{ tipo: "texto", texto: String(modulo.energiaMaxima) }]]),
      )];
    }
    case Tipo.NIVEIS_AMEACA: {
      const { niveis } = dados as { niveis: readonly { nivel: number; referenciaImagem: string; descricao: readonly LivroTrechoDto[] }[] };
      return [niveis.flatMap((nivelAmeaca) => [`- **Nível ${nivelAmeaca.nivel}** (${nivelAmeaca.referenciaImagem}): ${inline(nivelAmeaca.descricao)}`])];
    }
    case Tipo.FICHA_CRIATURA:
      return fichaCriatura(peca, dados as LivroFichaCriaturaDadosDto, nivel);
    case Tipo.HABILIDADE_CRIATURA: {
      const criatura = dados as LivroHabilidadeCriaturaDadosDto;
      const inclui = criatura.rotulo.toLowerCase().includes(criatura.categoria.toLowerCase());
      return [[`**${escapar(criatura.rotulo)}**${inclui ? "" : ` (${criatura.categoria})`} ${inline(criatura.trechos)}`]];
    }
    case Tipo.ROTEIRO:
      return roteiro(peca, nivel);
    case Tipo.FAIXAS: {
      const { itens } = dados as { itens: readonly { rotulo: string; valor: string }[] };
      return [itens.map((item) => `- ${escapar(item.rotulo)}: **${escapar(item.valor)}**`)];
    }
    case Tipo.GRADE:
      return [grade(dados as LivroGradeDadosDto)];
    case Tipo.ABERTURA:
      return abertura(dados as LivroAberturaDadosDto);
    case Tipo.GENERICO: {
      const generico = dados as { motivo: string; trechos: readonly LivroTrechoDto[] };
      return [[`<!-- genérico: ${comentario(generico.motivo)} -->`, inline(generico.trechos)]];
    }
  }
}

function habilidade(dados: LivroHabilidadeDadosDto): string {
  const nome = [dados.glifo, escapar(dados.nome)].filter(Boolean).join(" ");
  const custo = `[${dados.custo} E]`;
  return `**${nome}** ${custo}${dados.reacao ? " (Reação)" : ""} ${inline(dados.trechos)}`.trimEnd();
}

const saude = (rotulo: string, recursos: LivroSaudeRecursosDto): string[] => [
  `**⬦ ${rotulo}**  `,
  `Vida = ${inline(recursos.vida)}  `,
  `Energia = ${inline(recursos.energia)}`,
];

function habilidadesAgrupadas(filhos: readonly LivroPecaDto[], rotuloComum: string): Bloco[] {
  const habilidades = filhos.filter((filha) => filha.tipo === Tipo.HABILIDADE);
  const marcas = (filha: LivroPecaDto) => filha.dados as LivroHabilidadeDadosDto;
  const grupo = (rotulo: string, itens: readonly LivroPecaDto[]): Bloco[] =>
    itens.length ? [[`**⬦ ${rotulo}**`], ...itens.map((filha) => [habilidade(marcas(filha))])] : [];
  return [
    ...grupo("Habilidade Inicial", habilidades.filter((filha) => marcas(filha).inicial)),
    ...grupo(rotuloComum, habilidades.filter((filha) => !marcas(filha).inicial && !marcas(filha).melhorada)),
    ...grupo("Habilidades Gerais Melhoradas", habilidades.filter((filha) => marcas(filha).melhorada)),
  ];
}

function classe(peca: LivroPecaDto, dados: LivroClasseDadosDto, nivel: number): Bloco[] {
  const arquetipos = peca.filhos.filter((filha) => filha.tipo === Tipo.ARQUETIPO);
  return [
    [titulo(nivel + 2, escapar(dados.nome), peca.ancora)],
    ...(dados.citacao.length ? [[inline(dados.citacao)]] : []),
    saude("Saúde", dados.saude),
    saude("Progressão por Nível", dados.progressao),
    ...habilidadesAgrupadas(peca.filhos.filter((filha) => filha.tipo !== Tipo.ARQUETIPO), "Habilidades de Classe"),
    ...arquetipos.flatMap((filha) => arquetipo(filha, nivel + 1)),
  ];
}

function arquetipo(peca: LivroPecaDto, nivel: number): Bloco[] {
  const dados = peca.dados as { nome: string; citacao: readonly LivroTrechoDto[]; atributosBonus: readonly LivroTrechoDto[] };
  return [
    [titulo(nivel + 2, escapar(dados.nome), peca.ancora)],
    ...(dados.citacao.length ? [[inline(dados.citacao)]] : []),
    [rotulado("⬦ Atributos Bônus", dados.atributosBonus)],
    ...habilidadesAgrupadas(peca.filhos, "Habilidades de Arquétipo"),
  ];
}

function subclasse(peca: LivroPecaDto, nivel: number): Bloco[] {
  const dados = peca.dados as {
    nome: string; classe: string; citacao: readonly LivroTrechoDto[]; custos: readonly (readonly LivroTrechoDto[])[];
    saude: LivroSaudeRecursosDto; progressao: LivroSaudeRecursosDto; atributosBonus: readonly LivroTrechoDto[];
  };
  return [
    [titulo(nivel + 2, escapar(dados.nome), peca.ancora)],
    [`**Classe** ${escapar(dados.classe)}`],
    ...(dados.citacao.length ? [[inline(dados.citacao)]] : []),
    ...(dados.custos.length ? [dados.custos.map((custo) => `- ${inline(custo)}`)] : []),
    saude("Saúde", dados.saude),
    saude("Progressão por Nível", dados.progressao),
    [rotulado("⬦ Atributos Bônus", dados.atributosBonus)],
    ...habilidadesAgrupadas(peca.filhos, "Habilidades de Subclasse"),
  ];
}

function equipamento(dados: LivroEquipamentoDadosDto): Bloco {
  const campos: string[] = [
    rotulado("Custo", dados.custo),
    ...(dados.porte ? [rotulado("Porte", dados.porte)] : []),
    rotulado("Peso", dados.peso),
    ...dados.danos.map((dano) => rotulado(dano.rotulo, dano.trechos)),
    ...(dados.especificacoes ? [rotulado("Especificações", dados.especificacoes)] : []),
    ...(dados.duracao ? [rotulado("Duração", dados.duracao)] : []),
    ...(dados.descricao.length ? [inline(dados.descricao)] : []),
  ];
  return [`**${escapar(dados.nome)}**  `, ...campos.map((campo, indice) => (indice < campos.length - 1 ? `${campo}  ` : campo))];
}

function fichaCriatura(peca: LivroPecaDto, dados: LivroFichaCriaturaDadosDto, nivel: number): Bloco[] {
  const texto = (valor: string): LivroCelulaDto => [{ tipo: "texto", texto: valor }];
  return [
    [titulo(nivel + 2, escapar(dados.nome), peca.ancora)],
    dados.identidade.map((campo) => `**${escapar(campo.rotulo)}** ${inline(campo.valor)}  `),
    tabela(
      [texto("Atributo"), texto("Valor"), texto("Modificador"), texto("Bônus")],
      dados.atributos.map((atributo) => [texto(atributo.nome), texto(String(atributo.valor)), texto(atributo.modificador), texto(atributo.bonus)]),
    ),
    [
      `**Vida Máxima** ${escapar(dados.vidaMaxima)}  `,
      `**Defesa Base** ${escapar(dados.defesaBase)}  `,
      rotulado("Resistências", dados.resistencias) + "  ",
      rotulado("Fraquezas", dados.fraquezas) + "  ",
      rotulado("Regeneração", dados.regeneracao) + "  ",
      rotulado("Porte", dados.porte) + "  ",
      rotulado("Deslocamento", dados.deslocamento) + "  ",
      `**Cadência** ${escapar(dados.cadencia)}`,
    ],
    ...(dados.ataques.length ? [tabela(
      [texto("Ataque"), texto("Ação"), texto("Teste"), texto("Dano"), texto("Efeito")],
      dados.ataques.map((ataque) => [texto(ataque.nome), texto(ataque.acao), texto(ataque.teste), texto(ataque.dano), ataque.efeito]),
    )] : []),
    ...pecasEmBlocos(peca.filhos, nivel + 1),
  ];
}

function roteiro(peca: LivroPecaDto, nivel: number): Bloco[] {
  const dados = peca.dados as {
    etapas: readonly { ordem: number; titulo: readonly LivroTrechoDto[]; descricao: readonly LivroTrechoDto[] }[];
    introducaoQuantidade: number;
    conclusaoQuantidade: number;
  };
  const fim = peca.filhos.length - dados.conclusaoQuantidade;
  return [
    ...pecasEmBlocos(peca.filhos.slice(0, dados.introducaoQuantidade), nivel),
    ["<!-- roteiro -->", ...dados.etapas.map((etapa) => `${etapa.ordem}. **${inline(etapa.titulo)}** ${inline(etapa.descricao)}`)],
    ...pecasEmBlocos(peca.filhos.slice(dados.introducaoQuantidade, fim), nivel),
    ...pecasEmBlocos(peca.filhos.slice(fim), nivel),
  ];
}

function grade(dados: LivroGradeDadosDto): Bloco {
  if (dados.apresentacao === "generica") return ["<!-- grade -->", ...tabela(dados.cabecalho, dados.linhas)];
  return [
    `<!-- grade: ${dados.apresentacao} -->`,
    ...(dados.titulo ? [`**${escapar(dados.titulo)}**`, ""] : []),
    ...dados.itens.map((item) =>
      `- **${escapar(item.rotulo)}**: ${inline(item.conteudo)}${item.nota ? ` (${escapar(item.nota)})` : ""}`),
  ];
}

function abertura(dados: LivroAberturaDadosDto): Bloco[] {
  return [
    [...citar([protegerInicio(escapar(dados.titulo))]), ">", ...citar([protegerInicio(inline(dados.trechos).trim())])],
    ...(dados.selo ? [[`**${escapar(dados.selo)}**`]] : []),
  ];
}
