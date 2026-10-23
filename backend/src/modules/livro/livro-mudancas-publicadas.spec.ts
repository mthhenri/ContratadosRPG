import type { LivroPecaDto, LivroVersaoRecuperadaDto } from "@contratados-rpg/shared/dtos/livro";
import { TipoRegraPecaEnum as Tipo, TipoLivroVersaoSituacaoEnum as Situacao, LivroTextoOperacaoEnum } from "@contratados-rpg/shared/enums";
import { describe, expect, it, vi } from "vitest";
import { LivroService } from "./livro.service";

const paragrafo = (identificador: string, texto: string): LivroPecaDto => ({ identificador, tipo: Tipo.PARAGRAFO, ancora: null, ordem: 0, dados: { trechos: [{ tipo: "texto", texto }] }, filhos: [] });
const secao = (identificador: string, filhos: readonly LivroPecaDto[], titulo = identificador): LivroPecaDto => ({ identificador, tipo: Tipo.SECAO, ancora: identificador, ordem: 0, dados: { titulo, nivel: 1, glifo: null }, filhos });
const versao = (id: number, pecas: readonly LivroPecaDto[], extra: Partial<LivroVersaoRecuperadaDto> = {}): LivroVersaoRecuperadaDto => ({ id, livroId: 1, numero: "repetido", situacao: Situacao.PUBLICADA, formato: 1, publicacaoData: `2026-10-${String(id).padStart(2, "0")}T00:00:00Z`, usuarioId: 777, nota: `Nota ${id}`, conteudo: { codigo: "sistema", titulo: "Sistema", subtitulo: "", numero: "repetido", formato: 1, pecas }, ...extra });
function criar(versoes: LivroVersaoRecuperadaDto[]) {
  const repository = { listarVersoes: vi.fn().mockResolvedValue(versoes), recuperarVersao: vi.fn(({ id }: { id: number }) => Promise.resolve(versoes.find((item) => item.id === id) ?? null)) };
  const service = new LivroService({ recuperarLivro: vi.fn().mockResolvedValue({ id: 1, codigo: "sistema", titulo: "Sistema", ordem: 0 }) } as never, {} as never, repository as never, {} as never);
  return { service, repository };
}
describe("Mudanças publicadas para leitores", () => {
  it("sem publicação retorna 404 mesmo com rascunho", async () => {
    const { service } = criar([versao(1, [], { situacao: Situacao.RASCUNHO })]);
    await expect(service.recuperarMudancasPublicadas({ codigo: "sistema" })).rejects.toThrow();
  });

  it("data prevalece sobre id e empate usa id, mesmo com número repetido", async () => {
    const { service } = criar([versao(9, [], { publicacaoData: "2026-10-01T00:00:00Z" }), versao(1, [], { publicacaoData: "2026-10-02T00:00:00Z" }), versao(2, [], { publicacaoData: "2026-10-02T00:00:00Z" })]);
    const resultado = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(resultado.publicacoes.map((item) => item.id)).toEqual([2, 1, 9]);
  });

  it.each([null, versao(1, [], { livroId: 2 }), versao(1, [], { situacao: Situacao.RASCUNHO })])("revalida fotografia antes de devolver conteúdo", async (fotografia) => {
    const { service, repository } = criar([versao(1, []), versao(2, [])]);
    repository.recuperarVersao.mockResolvedValue(fotografia);
    await expect(service.recuperarMudancasPublicadas({ codigo: "sistema" })).rejects.toThrow();
  });

  it("seleciona as duas últimas oficiais por cronologia, sem autoria nem fotografia integral", async () => {
    const { service } = criar([versao(1, []), versao(3, [], { situacao: Situacao.RASCUNHO }), versao(2, [])]);
    const resultado = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(resultado.atual.id).toBe(2);
    expect(resultado.origem?.id).toBe(1);
    expect(resultado.publicacoes.map((item) => item.id)).toEqual([2, 1]);
    expect(resultado.notas.map((item) => item.id)).toEqual([2]);
    expect(JSON.stringify(resultado)).not.toMatch(/usuarioId|conteudo|livroId|situacao/);
  });
  it.each([0, -1, 1.5, Number.NaN, 4, 5, 99, 3])("recusa origem manipulada %s", async (origemId) => {
    const { service } = criar([versao(1, []), versao(3, []), versao(4, [], { situacao: Situacao.RASCUNHO }), versao(5, [], { livroId: 2 })]);
    await expect(service.recuperarMudancasPublicadas({ codigo: "sistema", origemId })).rejects.toThrow();
  });
  it("não tem anterior na primeira publicação e mantém sua nota sem listar o livro todo", async () => {
    const { service } = criar([versao(1, [paragrafo("a", "Texto")])]);
    expect(await service.recuperarMudancasPublicadas({ codigo: "sistema" })).toMatchObject({ origem: null, mudancas: [], notas: [{ id: 1 }] });
  });
  it("preserva notas intermediárias, mas compara extremos e elimina reversão", async () => {
    const { service } = criar([versao(1, [paragrafo("a", "Original")]), versao(2, [paragrafo("a", "Intermediário")]), versao(3, [paragrafo("a", "Original")])]);
    const resultado = await service.recuperarMudancasPublicadas({ codigo: "sistema", origemId: 1 });
    expect(resultado.notas.map((item) => item.id)).toEqual([2, 3]);
    expect(resultado.mudancas).toEqual([]);
  });
  it("agrupa adição/remoção e não exporta filhas iguais de container alterado", async () => {
    const igual = paragrafo("igual", "Segredo inalterado");
    const { service } = criar([versao(1, [secao("s", [igual]), secao("removida", [paragrafo("filha-r", "Removida")])]), versao(2, [secao("s", [igual], "Novo título"), secao("nova", [paragrafo("filha-n", "Nova")])])]);
    const resultado = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(resultado.mudancas.map((item) => item.identificador)).toEqual(["s", "nova", "removida"]);
    expect(resultado.mudancas[0].depoisMarkdown).toContain("Novo título");
    expect(JSON.stringify(resultado.mudancas)).not.toContain("Segredo inalterado");
    expect(resultado.mudancas[1].depoisMarkdown).toContain("Nova");
    expect(resultado.mudancas[2].ancoraAtual).toBeNull();
  });
  it("combina movimento e alteração e encontra ancestral atual para removida", async () => {
    const { service } = criar([versao(1, [secao("a", [paragrafo("p", "Antes"), paragrafo("r", "Removida")]), secao("b", [])]), versao(2, [secao("a", []), secao("b", [paragrafo("p", "Depois")])])]);
    const resultado = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    const mudanca = resultado.mudancas.find((item) => item.identificador === "p");
    expect(resultado.mudancas.filter((item) => item.identificador === "p")).toHaveLength(1);
    expect(mudanca).toMatchObject({ situacao: "ALTERADA", caminhoAnterior: ["a", "Parágrafo"], ancoraAtual: "b" });
    expect(resultado.mudancas.find((item) => item.identificador === "r")?.ancoraAtual).toBe("a");
  });

  it("movimento puro só informa localização e destino, sem repetir o conteúdo", async () => {
    const peca = paragrafo("p", "Igual");
    const { service } = criar([versao(1, [secao("a", [peca]), secao("b", [])]), versao(2, [secao("a", []), secao("b", [peca])])]);
    const { mudancas } = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(mudancas).toEqual([expect.objectContaining({ situacao: "MOVIDA", caminhoAnterior: ["a", "Parágrafo"], caminho: ["b", "Parágrafo"], antesMarkdown: null, depoisMarkdown: null, ancoraAtual: "b" })]);
  });

  it("exporta formatação, fórmula, lista, valores e tabela legíveis", async () => {
    const antes = paragrafo("p", "Dano");
    const depois: LivroPecaDto = { ...antes, dados: { trechos: [{ tipo: "negrito", filhos: [{ tipo: "texto", texto: "Dano" }] }] } };
    const celula = (texto: string) => [{ tipo: "texto" as const, texto }];
    const tabela: LivroPecaDto = { ...paragrafo("t", ""), tipo: Tipo.TABELA, dados: { cabecalho: [celula("Valor")], linhas: [[celula("42")]], emPares: false } };
    const formula: LivroPecaDto = { ...paragrafo("f", "2 + 3"), tipo: Tipo.FORMULA };
    const lista: LivroPecaDto = { ...paragrafo("l", ""), tipo: Tipo.LISTA, dados: { ordenada: false, inicio: 1, itens: [[{ tipo: "paragrafo", trechos: celula("Primeiro") }]] } };
    const { service } = criar([versao(1, [antes]), versao(2, [depois, tabela, formula, lista])]);
    const { mudancas } = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(mudancas[0].depoisMarkdown).toBe("**Dano**");
    expect(mudancas[0].campos[0].texto?.some((trecho) => trecho.operacao === LivroTextoOperacaoEnum.FORMATACAO)).toBe(true);
    expect(mudancas[1].depoisMarkdown).toContain("| 42 |");
    expect(mudancas[2].depoisMarkdown).toContain("2 + 3");
    expect(mudancas[3].depoisMarkdown).toBe("- Primeiro");
  });

  it("container de origens alterado mantém sua tabela sem filhas iguais", async () => {
    const texto = (valor: string) => [{ tipo: "texto" as const, texto: valor }];
    const criarOrigens = (valor: string): LivroPecaDto => ({ ...paragrafo("o", ""), tipo: Tipo.ORIGENS, dados: { cabecalho: [texto("Formação")], linhas: [[texto(valor)]] }, filhos: [paragrafo("igual", "Não repetir")] });
    const { service } = criar([versao(1, [criarOrigens("Antiga")]), versao(2, [criarOrigens("Nova")])]);
    const { mudancas } = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(mudancas).toHaveLength(1);
    expect(mudancas[0].antesMarkdown).toContain("| Antiga |");
    expect(mudancas[0].depoisMarkdown).toContain("| Nova |");
    expect(mudancas[0].depoisMarkdown).not.toContain("Não repetir");
  });

  it.each([false, true])("preserva conteúdo %s ao atravessar uma seção existente movida entre subárvores novas/removidas", async (reverter) => {
    const antes = [secao("b", [paragrafo("igual", "Não repetir")])];
    const depois = [secao("n", [
      paragrafo("direto", "Agrupado na seção"),
      secao("b", [paragrafo("igual", "Não repetir"), secao("c", [paragrafo("profundo", "Conteúdo além da peça movida")])]),
    ])];
    const { service } = criar([versao(1, reverter ? depois : antes), versao(2, reverter ? antes : depois)]);
    const { mudancas } = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(mudancas.map((item) => item.identificador).sort()).toEqual(["b", "c", "n"]);
    const texto = mudancas.map((item) => reverter ? item.antesMarkdown : item.depoisMarkdown).join("\n");
    expect(texto.match(/Conteúdo além da peça movida/g)).toHaveLength(1);
    expect(texto.match(/Agrupado na seção/g)).toHaveLength(1);
    expect(texto).not.toContain("Não repetir");
    expect(mudancas.find((item) => item.identificador === "c")?.ancoraAtual).toBe(reverter ? "b" : "c");
  });

  it("preserva as posições do movimento entre irmãs com caminho idêntico", async () => {
    const a = paragrafo("a", "A");
    const b = paragrafo("b", "B");
    const { service } = criar([versao(1, [secao("s", [a, b])]), versao(2, [secao("s", [b, a])])]);
    const { mudancas } = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(mudancas).toHaveLength(1);
    expect(mudancas[0].caminhoAnterior).toEqual(mudancas[0].caminho);
    expect(mudancas[0].posicao).toMatchObject({ paiAntes: "s", paiDepois: "s" });
    expect(mudancas[0].posicao?.ordemAntes).not.toBe(mudancas[0].posicao?.ordemDepois);
  });

  it.each(["inicial", "melhorada"] as const)("apresenta mudança da categoria %s mesmo sem alteração textual", async (campo) => {
    const habilidade: LivroPecaDto = { ...paragrafo("h", ""), tipo: Tipo.HABILIDADE, dados: { nome: "Treinamento", glifo: null, custo: 1, reacao: false, inicial: false, melhorada: false, trechos: [{ tipo: "texto", texto: "Efeito preservado" }] } };
    const alterada: LivroPecaDto = { ...habilidade, dados: { ...habilidade.dados, [campo]: true } as LivroPecaDto["dados"] };
    const { service } = criar([versao(1, [habilidade]), versao(2, [alterada])]);
    const { mudancas } = await service.recuperarMudancasPublicadas({ codigo: "sistema" });
    expect(mudancas).toHaveLength(1);
    expect(mudancas[0].antesMarkdown).toContain("Categoria da habilidade:** Comum");
    expect(mudancas[0].depoisMarkdown).toContain(campo === "inicial" ? "Categoria da habilidade:** Inicial" : "Categoria da habilidade:** Melhorada");
    expect(mudancas[0].antesMarkdown).not.toBe(mudancas[0].depoisMarkdown);
  });
});
