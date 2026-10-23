import type { LivroMudancaPublicadaDto, LivroPecaDto, LivroVersaoConteudoDto } from "@contratados-rpg/shared/dtos/livro";
import { LivroMudancaSituacaoEnum as Situacao, TipoRegraPecaEnum as Tipo } from "@contratados-rpg/shared/enums";
import { compararLivros, exportarLivroEmMarkdown } from "@contratados-rpg/shared/livro";

interface Entrada {
  readonly peca: LivroPecaDto;
  readonly ancestrais: readonly LivroPecaDto[];
  readonly caminho: readonly string[];
}

const ROTULOS: Record<Tipo, string> = {
  SECAO: "Seção", PARAGRAFO: "Parágrafo", EXEMPLO: "Exemplo", FORMULA: "Fórmula", NOTA: "Nota", LISTA: "Lista", TABELA: "Tabela", HABILIDADE: "Habilidade", CLASSE: "Classe", ARQUETIPO: "Arquétipo", SUBCLASSE: "Subclasse", ORIGENS: "Origens", ORIGEM: "Origem", TERMOS: "Termos", TERMO: "Termo", EQUIPAMENTOS: "Equipamentos", EQUIPAMENTO: "Equipamento", MODIFICACOES: "Modificações", MODIFICACAO: "Modificação", AMPLIFICADORES: "Amplificadores", AMPLIFICADOR: "Amplificador", MODULOS: "Módulos", NIVEIS_AMEACA: "Níveis de ameaça", FICHA_CRIATURA: "Ficha de criatura", HABILIDADE_CRIATURA: "Habilidade de criatura", ROTEIRO: "Roteiro", FAIXAS: "Faixas", GRADE: "Grade", ABERTURA: "Abertura", GENERICO: "Conteúdo",
};

function indexar(pecas: readonly LivroPecaDto[]): Map<string, Entrada> {
  const indice = new Map<string, Entrada>();
  const percorrer = (itens: readonly LivroPecaDto[], ancestrais: readonly LivroPecaDto[], caminho: readonly string[]): void => {
    for (const peca of itens) {
      const dados = peca.dados as unknown as Record<string, unknown>;
      const nome = dados["titulo"] ?? dados["nome"];
      const caminhoPeca = [...caminho, typeof nome === "string" && nome.trim() ? nome : ROTULOS[peca.tipo]];
      indice.set(peca.identificador, { peca, ancestrais, caminho: caminhoPeca });
      percorrer(peca.filhos, [...ancestrais, peca], caminhoPeca);
    }
  };
  percorrer(pecas, [], []);
  return indice;
}

/** Fragmento isolado: o exportador de livros ignora tabelas de layout em containers.
 * Aqui a tabela própria de ORIGENS precisa aparecer quando ela mudou, sem filhos iguais. */
function fragmento(livro: LivroVersaoConteudoDto, peca: LivroPecaDto, oposto: Map<string, Entrada>, subarvore: boolean, cobertas?: Set<string>): string {
  const recortar = (item: LivroPecaDto): LivroPecaDto => {
    // Marca apenas peças incluídas no recorte; uma peça existente interrompe a subárvore.
    cobertas?.add(item.identificador);
    return {
      ...item,
      filhos: subarvore ? item.filhos.filter((filha) => !oposto.has(filha.identificador)).map(recortar) : [],
    };
  };
  const recorte = recortar(peca);
  const exportavel: LivroPecaDto = recorte.tipo === Tipo.ORIGENS && !subarvore
    ? { ...recorte, tipo: Tipo.TABELA, dados: { ...recorte.dados, emPares: false } as LivroPecaDto["dados"] }
    : recorte;
  let markdown = exportarLivroEmMarkdown({ ...livro, titulo: "", subtitulo: "", pecas: [exportavel] }).replace(/^# \n\n?/, "").trim();
  if (peca.tipo === Tipo.HABILIDADE) {
    const dados = peca.dados as { inicial: boolean; melhorada: boolean };
    const categorias = [dados.inicial ? "Inicial" : "", dados.melhorada ? "Melhorada" : ""].filter(Boolean);
    markdown += `\n\n**Categoria da habilidade:** ${categorias.join(" e ") || "Comum"}`;
  }
  // Alguns containers só carregam uma propriedade de apresentação em comentário no exportador.
  if (!markdown.replace(/<!--[\s\S]*?-->/g, "").trim()) {
    const dados = recorte.dados as unknown as Record<string, unknown>;
    const detalhe = dados["categoria"] ?? dados["variante"];
    return `**${ROTULOS[recorte.tipo]}**${typeof detalhe === "string" ? `: ${detalhe}` : ""}`;
  }
  return markdown;
}

/** Projeção pública do comparador canônico, sem fotografias integrais. */
export function montarMudancasPublicadas(anterior: LivroVersaoConteudoDto, atual: LivroVersaoConteudoDto): LivroMudancaPublicadaDto[] {
  const antes = indexar(anterior.pecas);
  const depois = indexar(atual.pecas);
  const comparacao = compararLivros(anterior.pecas, atual.pecas);
  const agrupadas = new Map<string, LivroMudancaPublicadaDto>();
  const novasCobertas = new Set<string>();
  const removidasCobertas = new Set<string>();
  for (const mudanca of comparacao.mudancas) {
    const original = antes.get(mudanca.identificador);
    const corrente = depois.get(mudanca.identificador);
    const entrada = corrente ?? original!;
    const nova = mudanca.situacao === Situacao.NOVA;
    const removida = mudanca.situacao === Situacao.REMOVIDA;
    if ((nova && novasCobertas.has(mudanca.identificador)) || (removida && removidasCobertas.has(mudanca.identificador))) continue;
    const anteriorAgrupada = agrupadas.get(mudanca.identificador);
    if (anteriorAgrupada) {
      // O comparador emite ALTERADA e depois MOVIDA; a localização fica na mesma entrada.
      agrupadas.set(mudanca.identificador, { ...anteriorAgrupada, caminhoAnterior: original?.caminho ?? null, posicao: mudanca.posicao ?? null });
      continue;
    }
    const candidatos = corrente ? [...corrente.ancestrais, corrente.peca] : original?.ancestrais ?? [];
    const ancoraAtual = [...candidatos].reverse().map((peca) => depois.get(peca.identificador)?.peca.ancora).find((ancora) => !!ancora) ?? null;
    const movimento = mudanca.situacao === Situacao.MOVIDA;
    agrupadas.set(mudanca.identificador, {
      identificador: mudanca.identificador,
      situacao: mudanca.situacao,
      caminho: entrada.caminho,
      caminhoAnterior: movimento ? original?.caminho ?? null : null,
      antesMarkdown: original && !movimento ? fragmento(anterior, original.peca, depois, removida, removida ? removidasCobertas : undefined) : null,
      depoisMarkdown: corrente && !movimento ? fragmento(atual, corrente.peca, antes, nova, nova ? novasCobertas : undefined) : null,
      ancoraAtual,
      campos: mudanca.campos ?? [],
      posicao: mudanca.posicao ?? null,
    });
  }
  return [...agrupadas.values()];
}
