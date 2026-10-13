import { TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";
import type {
  LivroImportadoDto,
  LivroInternoImportarDto,
  LivroPecaDto,
} from "@contratados-rpg/shared/dtos/livro";
import { validarArvoreLivro } from "@contratados-rpg/shared/livro";
import type { LivroRepository } from "../livro.repository";
import type { LivroVersaoRepository } from "../livro-versao.repository";
import type { RegraPecaRepository } from "../regra-peca.repository";

export interface DependenciasImportacao {
  readonly livros: LivroRepository;
  readonly pecas: RegraPecaRepository;
  readonly versoes: LivroVersaoRepository;
  readonly executarEmTransacao: <TResultado>(operacao: () => Promise<TResultado>) => Promise<TResultado>;
}

const NOTA_DA_IMPORTACAO = "Importação inicial dos documentos de regras (m11-03).";

function contarPecas(pecas: readonly LivroPecaDto[]): number {
  return pecas.reduce((total, peca) => total + 1 + contarPecas(peca.filhos), 0);
}

function conferirArvore({ conteudo }: LivroInternoImportarDto): void {
  const pendencias = [
    ...validarArvoreLivro({ pecas: conteudo.pecas, modo: "trabalho" }),
    ...validarArvoreLivro({ pecas: conteudo.pecas, modo: "fotografia" }),
  ];
  if (pendencias.length) {
    const resumo = pendencias
      .slice(0, 10)
      .map((pendencia) => `${pendencia.caminho.join(" > ")}: ${pendencia.mensagem}`)
      .join("\n - ");
    throw new Error(
      `A árvore de ${conteudo.codigo} tem ${pendencias.length} pendência(s):\n - ${resumo}`,
    );
  }
}

async function gravarLivro(
  dependencias: DependenciasImportacao,
  dto: LivroInternoImportarDto,
): Promise<LivroImportadoDto | null> {
  const { conteudo } = dto;
  const { livros, pecas, versoes } = dependencias;
  const livro =
    (await livros.recuperarLivro({ codigo: conteudo.codigo })) ??
    (await livros.criarLivro({
      codigo: conteudo.codigo,
      titulo: conteudo.titulo,
      ordem: dto.ordemDoLivro,
    }));

  const existentes = await pecas.listarArvore({ livroId: livro.id });
  if (existentes.length > 0) {
    if (!dto.refazer && dto.pularSeJaImportado) return null;
    if (!dto.refazer) {
      throw new Error(
        `O livro "${conteudo.codigo}" já tem ${existentes.length} peça(s); nada foi alterado. ` +
          "Para refazer em desenvolvimento, use --refazer.",
      );
    }
    for (const raiz of existentes.filter((peca) => peca.pecaPaiId === null)) {
      await pecas.removerPeca({ id: raiz.id, revisao: raiz.revisao });
    }
    // Sem isto o livro ficaria com duas fotografias de identificadores disjuntos.
    await versoes.removerVersoes({ livroId: livro.id });
  }

  const gravar = async (peca: LivroPecaDto, pecaPaiId: number | null): Promise<void> => {
    const criada = await pecas.criarPeca({
      livroId: livro.id,
      pecaPaiId,
      tipo: peca.tipo,
      identificador: peca.identificador,
      ancora: peca.ancora,
      ordem: peca.ordem,
      dados: peca.dados,
    });
    if (!criada) throw new Error(`Não foi possível gravar a peça ${peca.identificador}.`);
    for (const filha of peca.filhos) await gravar(filha, criada.id);
  };
  for (const raiz of conteudo.pecas) await gravar(raiz, null);

  const versao = await versoes.criarVersao({
    livroId: livro.id,
    situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
    numero: conteudo.numero,
    formato: conteudo.formato,
    conteudo,
    usuarioId: dto.usuarioId,
    nota: NOTA_DA_IMPORTACAO,
  });
  return {
    livroId: livro.id,
    codigo: conteudo.codigo,
    numero: conteudo.numero,
    pecas: contarPecas(conteudo.pecas),
    versaoId: versao.id,
  };
}

/**
 * Importa os livros convertidos. Valida a árvore de TODOS, nos dois modos, antes de tocar o banco, e
 * grava todos numa única transação: ou entram todos ou nenhum, então uma falha no segundo livro
 * nunca deixa o primeiro importado sem o outro. Não repetível por engano: se um livro já tem
 * peças, aborta sem alterar nada, salvo `refazer`.
 */
export async function importarLivros(
  dependencias: DependenciasImportacao,
  dtos: readonly LivroInternoImportarDto[],
): Promise<LivroImportadoDto[]> {
  dtos.forEach(conferirArvore);
  return dependencias.executarEmTransacao(async () => {
    const importados: LivroImportadoDto[] = [];
    for (const dto of dtos) {
      const importado = await gravarLivro(dependencias, dto);
      if (importado) importados.push(importado);
    }
    return importados;
  });
}

export async function importarLivro(
  dependencias: DependenciasImportacao,
  dto: LivroInternoImportarDto,
): Promise<LivroImportadoDto> {
  const [importado] = await importarLivros(dependencias, [dto]);
  if (!importado) throw new Error(`O livro "${dto.conteudo.codigo}" já estava importado; nada foi alterado.`);
  return importado;
}
