import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LivroPecaDto, LivroVersaoConteudoDto } from "@contratados-rpg/shared/dtos/livro";
import { exportarLivroEmMarkdown } from "@contratados-rpg/shared/livro";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { converterRegrasEmPecas } from "../importador/converter-regras-em-pecas";
import { lerFontesDeRegras } from "../importador/ler-fontes-regras";
import { conferirArquivoGerado, montarArquivoGerado } from "./arquivo-gerado";
import { aplicarArquivosGerados } from "./exportar-livros";

const ESCAPE = /\\(.)/g;
const ESPACOS = /\s+/g;
const normalizar = (texto: string): string =>
  texto.replace(ESCAPE, "$1").replace(/<br>/g, " ").replace(ESPACOS, " ").trim();

/** Campos de `dados` que não são texto de leitura (discriminadores, apresentação) ou que a fonte repete. */
const CHAVES_IGNORADAS = new Set(["tipo", "identificador", "apresentacao", "variante"]);
/**
 * Campos que o Markdown não repete por serem redundantes: a tabela de layout da fonte repete as peças
 * filhas (ver o comentário do exportador) e o rótulo da habilidade de criatura já traz a categoria
 * ("Imobilidade Absoluta [Passiva]"); o exportador só a acrescenta quando o rótulo não a tem.
 */
const REPETIDOS: Readonly<Record<string, readonly string[]>> = {
  CLASSE: ["cabecalho", "linhas"],
  ORIGENS: ["cabecalho", "linhas"],
  HABILIDADE_CRIATURA: ["categoria"],
};

function coletarTextos(valor: unknown, ignoradas: ReadonlySet<string>, saida: string[]): void {
  if (typeof valor === "string") saida.push(valor);
  else if (Array.isArray(valor)) valor.forEach((item) => coletarTextos(item, ignoradas, saida));
  else if (typeof valor === "object" && valor !== null) {
    for (const [chave, conteudo] of Object.entries(valor)) {
      if (!ignoradas.has(chave)) coletarTextos(conteudo, ignoradas, saida);
    }
  }
}

/** Todo texto de toda peça, sem os campos de estrutura. */
function textosDoLivro(pecas: readonly LivroPecaDto[], saida: string[] = []): string[] {
  for (const peca of pecas) {
    const repetidos = new Set([...CHAVES_IGNORADAS, ...(REPETIDOS[peca.tipo] ?? [])]);
    coletarTextos(peca.dados, repetidos, saida);
    textosDoLivro(peca.filhos, saida);
  }
  return saida;
}

describe("exportação dos livros de regras (m11-10)", () => {
  const conteudos: LivroVersaoConteudoDto[] = [];
  const temporarios: string[] = [];

  beforeAll(async () => {
    const fontes = await lerFontesDeRegras(undefined, (especificador) => import(/* @vite-ignore */ especificador));
    for (const fonte of fontes) conteudos.push(converterRegrasEmPecas(fonte.documento));
  });

  afterEach(async () => {
    await Promise.all(temporarios.splice(0).map((pasta) => rm(pasta, { recursive: true, force: true })));
  });

  it.each(["sistema", "guia"])("o Markdown de %s traz todo o texto de todas as peças", (codigo) => {
    const conteudo = conteudos.find((candidato) => candidato.codigo === codigo)!;
    const exportado = normalizar(exportarLivroEmMarkdown(conteudo));
    const ausentes = textosDoLivro(conteudo.pecas)
      .map(normalizar)
      .filter((texto) => texto.length > 0 && !exportado.includes(texto));
    expect(ausentes.slice(0, 10)).toEqual([]);
  });

  it("é determinístico: a mesma fotografia gera o mesmo arquivo, com o nome da versão", () => {
    const [sistema] = conteudos;
    const primeiro = montarArquivoGerado(sistema);
    expect(montarArquivoGerado(sistema)).toEqual(primeiro);
    expect(primeiro.nome).toBe(`sistema-v${sistema.numero}.md`);
    expect(montarArquivoGerado(conteudos[1]).nome).toBe(`guia_de_mestre-v${conteudos[1].numero}.md`);
  });

  it("o cabeçalho confere; editar o corpo à mão ou tirar a marca é acusado", () => {
    const { texto } = montarArquivoGerado(conteudos[0]);
    expect(conferirArquivoGerado(texto)).toEqual({ ok: true, livro: "sistema", versao: conteudos[0].numero });
    expect(conferirArquivoGerado(texto.replace(/\n/g, "\r\n")).ok).toBe(true);
    expect(conferirArquivoGerado(texto.replace("Contratados", "Contratados!"))).toMatchObject({ ok: false });
    expect(conferirArquivoGerado(texto.slice(texto.indexOf("\n\n") + 2))).toMatchObject({ ok: false });
  });

  describe("gravação em docs/core", () => {
    async function pastaTemporaria(): Promise<string> {
      const pasta = await mkdtemp(join(tmpdir(), "regras-exportar-"));
      temporarios.push(pasta);
      return pasta;
    }

    it("é idempotente e troca o arquivo de uma versão anterior pelo da atual", async () => {
      const pasta = await pastaTemporaria();
      const arquivos = conteudos.map(montarArquivoGerado);
      await writeFile(join(pasta, "sistema-v4.0.0.md"), "antigo", "utf8");
      await writeFile(join(pasta, "outro-livro.md"), "nao mexer", "utf8");

      const primeira = await aplicarArquivosGerados(arquivos, pasta);
      expect([...primeira.gravados].sort()).toEqual(arquivos.map((arquivo) => arquivo.nome).sort());
      expect(primeira.removidos).toEqual(["sistema-v4.0.0.md"]);
      expect((await readdir(pasta)).sort()).toEqual([...arquivos.map((arquivo) => arquivo.nome), "outro-livro.md"].sort());

      const segunda = await aplicarArquivosGerados(arquivos, pasta);
      expect(segunda.gravados).toEqual([]);
      expect(segunda.removidos).toEqual([]);
      expect(segunda.iguais).toHaveLength(arquivos.length);
    });

    it("conferir não escreve e acusa arquivo ausente, alterado ou sobrando", async () => {
      const pasta = await pastaTemporaria();
      const arquivos = conteudos.map(montarArquivoGerado);
      await aplicarArquivosGerados(arquivos, pasta);
      expect((await aplicarArquivosGerados(arquivos, pasta, { conferir: true })).divergencias).toEqual([]);

      await writeFile(join(pasta, arquivos[0].nome), `${arquivos[0].texto}editado`, "utf8");
      await rm(join(pasta, arquivos[1].nome));
      await writeFile(join(pasta, "sistema-v1.0.0.md"), "velho", "utf8");
      const conferencia = await aplicarArquivosGerados(arquivos, pasta, { conferir: true });
      expect(conferencia.divergencias).toHaveLength(3);
      expect(await readFile(join(pasta, arquivos[0].nome), "utf8")).toContain("editado");
      expect(await readdir(pasta)).toContain("sistema-v1.0.0.md");
    });
  });
});
