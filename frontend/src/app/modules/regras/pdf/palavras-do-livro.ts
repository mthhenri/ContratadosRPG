/**
 * Palavras que o livro mostra, para conferir que o PDF não perdeu nenhuma. Usada pelos testes e
 * pela conferência dos livros publicados; não entra na aplicação.
 */

/** Metadados: nunca aparecem como texto. `subtitulo`: o autor tirou o "Nova Era" (25/11/2026). */
const METADADOS = new Set(["tipo", "ancora", "glifo", "variante", "empilhamento", "id", "subtitulo",
    "referenciaImagem", "motivo", "identificador", "destino", "peca"]);

/** Tipos cujo registro bruto de tabela é só a fonte da projeção estruturada. */
const COM_PROJECAO = new Set(["classe", "arquetipos", "subclasse", "origens", "termos", "equipamentos",
    "modificacoes", "amplificadores", "modulos", "niveis-ameaca", "identidade", "atributos", "faixas"]);

type Objeto = Record<string, unknown>;

function ignorar(objeto: Objeto, chave: string): boolean {
    const tipo = objeto["tipo"];
    if (METADADOS.has(chave)) return true;
    if (chave === "cabecalho" || chave === "linhas") {
        return COM_PROJECAO.has(tipo as string) || (tipo === "grade" && !!objeto["referencia"])
            || (tipo === "tabela" && !!objeto["pares"]);
    }
    if (tipo === "capa" && chave === "versao") return true;
    if (tipo === "habilidade-criatura" && chave === "rotulo") return true;
    if ((tipo === "equipamentos" || tipo === "modificacoes") && chave === "categoria") return true;
    if (tipo === "roteiro" && chave === "filhos") return !!objeto["conclusao"];
    if (tipo === "generico" && chave === "origemMarkdown") {
        return !!(objeto["trechos"] as unknown[]).length || !!(objeto["filhos"] as unknown[] | undefined)?.length;
    }
    // Rótulo "DANO" é o nome da coluna da tabela.
    return chave === "rotulo" && objeto[chave] === "DANO";
}

export function palavrasDoLivro(valor: unknown, saida: string[] = []): string[] {
    if (typeof valor === "string") {
        saida.push(...valor.replace(/[⬢⬡⬥⬦◈◻■□▢∅⇒]/g, " ").split(/\s+/).filter(Boolean));
    } else if (Array.isArray(valor)) {
        valor.forEach((item) => palavrasDoLivro(item, saida));
    } else if (valor && typeof valor === "object") {
        const objeto = valor as Objeto;
        Object.entries(objeto).forEach(([chave, item]) => {
            if (!ignorar(objeto, chave)) palavrasDoLivro(item, saida);
        });
    }
    return saida;
}

/** Palavras do livro que não aparecem em nada do que foi desenhado. */
export function palavrasPerdidas(blocos: unknown, desenhado: readonly string[]): string[] {
    const texto = desenhado.join(" ").toLocaleUpperCase("pt-BR");
    const colado = desenhado.join("").toLocaleUpperCase("pt-BR");
    return [...new Set(palavrasDoLivro(blocos))].filter((palavra) => {
        const procurada = palavra.toLocaleUpperCase("pt-BR");
        // Palavra partida entre estilos ou linhas aparece só no texto colado.
        return !texto.includes(procurada) && !colado.includes(procurada);
    });
}
