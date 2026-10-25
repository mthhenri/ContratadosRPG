import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import knex, { type Knex } from "knex";
import type {
  LivroPacoteItemDto,
  LivroPecaDto,
  LivroRecuperacaoAlvoDto,
  LivroRecuperacaoDto,
  LivroRecuperacaoEstadoDto,
  LivroVersaoConteudoDto,
} from "@contratados-rpg/shared/dtos/livro";
import { validarConfiguracaoResetDev } from "../database/reset-dev.guard";
import { TransacaoService } from "../../src/database/transacao.service";
import { LivroRepository } from "../../src/modules/livro/livro.repository";
import { RegraPecaRepository } from "../../src/modules/livro/regra-peca.repository";
import { LivroVersaoRepository } from "../../src/modules/livro/livro-versao.repository";
import { ImportacaoPacoteRepository } from "../../src/modules/livro/transporte/importacao-pacote.repository";
import { adaptarFotografiaTrabalho } from "../../src/modules/livro/transporte/importacao-links";
import {
  serializarCanonico,
  validarConteudoLivro,
  validarEstruturaConteudoLivro,
  validarPacoteLivros,
} from "../../src/modules/livro/transporte/pacote-livros";
import {
  criarRecuperacao,
  validarRecuperacao,
} from "../../src/modules/livro/transporte/recuperacao-pacote";
import { RAIZ_DO_REPOSITORIO } from "../../src/modules/livro/importador/ler-fontes-regras";
import { LivroPendenciaGravidadeEnum, TipoLivroVersaoSituacaoEnum } from "@contratados-rpg/shared/enums";
import { validarArvoreLivro } from "@contratados-rpg/shared/livro";
interface DependenciasFerramenta {
  readonly conectar?: (configuracao: Knex.Config) => Knex;
  readonly preservar?: (recuperacao: LivroRecuperacaoDto) => Promise<string>;
  readonly informar?: (mensagem: string) => void;
}
function lerArgumentos(argumentos: readonly string[]) {
  const permitidos = /^(--arquivo=.+|--usuario=\d+|--simular|--substituir)$/;
  if (
    argumentos.some((argumento) => !permitidos.test(argumento)) ||
    new Set(argumentos.map((argumento) => argumento.split("=")[0])).size !==
      argumentos.length
  )
    throw new Error("Argumentos desconhecidos ou repetidos.");
  const arquivo = argumentos
    .find((argumento) => argumento.startsWith("--arquivo="))
    ?.slice(10);
  const usuarioId = Number(
    argumentos
      .find((argumento) => argumento.startsWith("--usuario="))
      ?.slice(10),
  );
  if (!Number.isSafeInteger(usuarioId) || usuarioId < 1)
    throw new Error("Informe --usuario=<id> de um administrador local.");
  if (!arquivo) throw new Error("Informe --arquivo=<caminho>.");
  return {
    arquivo: resolve(arquivo),
    usuarioId,
    simular: argumentos.includes("--simular"),
    substituir: argumentos.includes("--substituir"),
  };
}
async function preservarRecuperacao(
  recuperacao: LivroRecuperacaoDto,
): Promise<string> {
  const diretorio = join(
    RAIZ_DO_REPOSITORIO,
    ".artifacts",
    "livros-exportacao-publicada-e-importacao-dev",
    "recuperacoes",
  );
  await mkdir(diretorio, { recursive: true });
  const caminho = join(
    diretorio,
    `recuperacao-${Date.now()}-${randomUUID()}.json`,
  );
  await writeFile(caminho, JSON.stringify(recuperacao, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
  const conferida = validarRecuperacao(
    JSON.parse(await readFile(caminho, "utf8")),
  );
  if (conferida.sha256 !== recuperacao.sha256)
    throw new Error("Arquivo de recuperação divergiu após escrita.");
  return caminho;
}
async function conferirPreservacao(
  recuperacao: LivroRecuperacaoDto,
  preservar: (valor: LivroRecuperacaoDto) => Promise<string>,
): Promise<string> {
  const caminho = await preservar(recuperacao);
  const gravada = validarRecuperacao(
    JSON.parse(await readFile(caminho, "utf8")),
  );
  if (gravada.sha256 !== recuperacao.sha256)
    throw new Error("Recuperação gravada não corresponde ao estado afetado.");
  return caminho;
}
function arvoreEstado(
  estado: LivroRecuperacaoEstadoDto,
): readonly LivroPecaDto[] {
  const montar = (pai: number | null): readonly LivroPecaDto[] =>
    estado.pecas
      .filter((peca) => !peca.is_deleted && peca.peca_pai_id === pai)
      .sort(
        (antes, depois) => antes.ordem - depois.ordem || antes.id - depois.id,
      )
      .map((peca) => ({
        identificador: peca.identificador,
        ancora: peca.ancora,
        ordem: peca.ordem,
        dados: peca.dados,
        // Só o tipo traduzido do repositório é comparado abaixo; ids do ambiente não viajam.
        tipo: "" as LivroPecaDto["tipo"],
        filhos: montar(peca.id),
      }));
  return montar(null);
}
function conferirRestaurabilidade(
  antes: LivroRecuperacaoEstadoDto,
  atual: LivroRecuperacaoEstadoDto,
): void {
  if (!antes.livro) return;
  if (antes.livro.id !== atual.livro?.id)
    throw new Error("Livro da recuperação não corresponde ao alvo atual.");
}
/** Guard obrigatório antes de conectar, ler/gravar recuperação ou simular. */
export async function executarPacoteLocal(
  entrada: {
    argumentos: readonly string[];
    ambiente: NodeJS.ProcessEnv;
    restaurar: boolean;
  },
  dependencias: DependenciasFerramenta = {},
): Promise<void> {
  const argumentos = lerArgumentos(entrada.argumentos);
  const configuracao = validarConfiguracaoResetDev(entrada.ambiente);
  const valor: unknown = JSON.parse(await readFile(argumentos.arquivo, "utf8"));
  const pacote = entrada.restaurar ? null : validarPacoteLivros(valor);
  const recuperacao = entrada.restaurar ? validarRecuperacao(valor) : null;
  const trabalhos = pacote?.livros.map((item) =>
    adaptarFotografiaTrabalho(item.conteudo),
  );
  // A conexão nasce exclusivamente dos valores que o guard acabou de conferir.
  const conexao = (dependencias.conectar ?? knex)({
    client: "pg",
    connection: {
      host: configuracao.host,
      port: configuracao.porta,
      database: configuracao.nome,
      user: configuracao.usuario,
      password: configuracao.senha,
    },
    pool: { min: 0, max: 2 },
  });
  const informar = dependencias.informar ?? console.log;
  try {
    const repositorio = new ImportacaoPacoteRepository(conexao);
    await new TransacaoService(conexao).executar(async () => {
      if (
        (
          await repositorio.recuperarAdministrador({
            usuarioId: argumentos.usuarioId,
          })
        ).length !== 1
      )
        throw new Error("Usuário local não é administrador ativo.");
      await repositorio.bloquearConjunto();
      const [identidade] = await repositorio.recuperarIdentidade();
      const alvo: LivroRecuperacaoAlvoDto = {
        host: configuracao.host,
        porta: configuracao.porta,
        nome: configuracao.nome,
        ...identidade,
      };
      if (
        recuperacao &&
        serializarCanonico(recuperacao.alvo) !== serializarCanonico(alvo)
      )
        throw new Error("Recuperação pertence a outro alvo local.");
      const estados: LivroRecuperacaoEstadoDto[] = [];
      for (const codigo of ["sistema", "guia"])
        estados.push((await repositorio.recuperarEstado({ codigo }))[0]);
      if (recuperacao) {
        const situacoes = new Map(
          (await repositorio.listarSituacoes()).map((situacao) => [
            situacao.id,
            situacao.codigo,
          ]),
        );
        for (const estado of recuperacao.estados)
          for (const versao of estado.versoes) {
            const situacao = situacoes.get(
              versao.tipo_livro_versao_situacao_id,
            );
            if (!situacao)
              throw new Error(
                "Situação da fotografia de recuperação inválida.",
              );
            if (situacao === TipoLivroVersaoSituacaoEnum.PUBLICADA)
              validarConteudoLivro(versao.conteudo);
          }
        const tipos = new Map(
          (await repositorio.listarTipos()).map((tipo) => [
            tipo.id,
            tipo.codigo,
          ]),
        );
        for (const estado of recuperacao.estados) {
          const montar = (pai: number | null): readonly LivroPecaDto[] =>
            estado.pecas
              .filter((peca) => peca.peca_pai_id === pai)
              .map((peca) => ({
                identificador: peca.identificador,
                ancora: peca.ancora,
                ordem: peca.ordem,
                tipo: tipos.get(peca.tipo_regra_peca_id)!,
                dados: peca.dados,
                filhos: montar(peca.id),
              }));
          if (
            estado.pecas.some((peca) => !tipos.has(peca.tipo_regra_peca_id)) ||
            validarArvoreLivro({ pecas: montar(null), modo: "trabalho" }).some(
              (pendencia) => pendencia.gravidade === LivroPendenciaGravidadeEnum.ESTRUTURAL,
            )
          )
            throw new Error("Árvore de trabalho da recuperação inválida.");
          // Trabalho legítimo pode ter links ainda sem âncora; a projeção para validar forma
          // preenche apenas esse campo opcional, sem corrigir nem alterar o backup.
          const projetar = (valor: unknown): unknown => {
            if (Array.isArray(valor)) return valor.map(projetar);
            if (!valor || typeof valor !== "object") return valor;
            const registro = valor as Record<string, unknown>;
            return Object.fromEntries(
              Object.entries(
                registro.tipo === "link-interno"
                  ? { ...registro, ancora: registro.ancora ?? "" }
                  : registro,
              ).map(([chave, item]) => [chave, projetar(item)]),
            );
          };
          validarEstruturaConteudoLivro({
            formato: 1,
            codigo: estado.codigo,
            titulo: estado.livro?.titulo ?? "",
            subtitulo: "",
            numero: "recuperacao",
            pecas: projetar(montar(null)),
          });
        }
        for (const estado of recuperacao.estados)
          conferirRestaurabilidade(
            estado,
            estados.find((item) => item.codigo === estado.codigo)!,
          );
        informar(
          `Recuperação ${recuperacao.criacaoData}; alvo ${alvo.host}:${alvo.porta}/${alvo.nome}; livros sistema e guia.`,
        );
        if (argumentos.simular) return;
        if (!argumentos.substituir)
          throw new Error("Restauração exige --substituir.");
        const caminho = await conferirPreservacao(
          criarRecuperacao({
            formato: 1,
            criacaoData: new Date().toISOString(),
            alvo,
            estados,
          }),
          dependencias.preservar ?? preservarRecuperacao,
        );
        informar(`Recuperação anterior à restauração: ${caminho}`);
        for (const estado of recuperacao.estados) {
          const atual = estados.find((item) => item.codigo === estado.codigo)!;
          if (atual.livro) await desativar(repositorio, atual.livro.id);
          if (!estado.livro) {
            if (atual.livro)
              await repositorio.desativarLivro({ id: atual.livro.id });
            continue;
          }
          await repositorio.alterarLivro({
            id: estado.livro.id,
            titulo: estado.livro.titulo,
            ordem: estado.livro.ordem,
          });
          for (const peca of estado.pecas)
            if ((await repositorio.restaurarPeca(peca)) !== 1)
              throw new Error(
                "Peça original ausente ou identidade divergente.",
              );
          for (const ancora of estado.ancoras)
            if ((await repositorio.restaurarAncora(ancora)) !== 1)
              throw new Error("Âncora original ausente.");
          for (const versao of estado.versoes)
            if ((await repositorio.restaurarVersao(versao)) !== 1)
              throw new Error("Fotografia original ausente ou divergente.");
        }
        informar(
          "Estado editorial anterior restaurado; registros posteriores permanecem excluídos logicamente.",
        );
        return;
      }
      const livros = new LivroRepository(conexao);
      const pecas = new RegraPecaRepository(conexao);
      const versoes = new LivroVersaoRepository(conexao);
      const alteracoes: {
        item: LivroPacoteItemDto;
        trabalho: LivroVersaoConteudoDto;
        estado: LivroRecuperacaoEstadoDto;
      }[] = [];
      informar(
        `Origem declarada: exportação ${pacote!.exportacaoData}; integridade ${pacote!.sha256} (não comprova procedência).`,
      );
      for (const [indice, item] of pacote!.livros.entries()) {
        const estado = estados.find((atual) => atual.codigo === item.codigo)!;
        const trabalho = trabalhos![indice];
        const atuais = estado.livro
          ? await pecas.listarArvore({ livroId: estado.livro.id })
          : [];
        const tipos = new Map(
          atuais.map((peca) => [peca.identificador, peca.tipo]),
        );
        const completar = (
          arvore: readonly LivroPecaDto[],
        ): readonly LivroPecaDto[] =>
          arvore.map((peca) => ({
            ...peca,
            tipo: tipos.get(peca.identificador)!,
            filhos: completar(peca.filhos),
          }));
        const atual = estado.livro
          ? await versoes.recuperarVersaoAtual({
              livroId: estado.livro.id,
              situacao: TipoLivroVersaoSituacaoEnum.PUBLICADA,
            })
          : null;
        const ancoras = estado.livro
          ? await pecas.listarAncorasAntigas({ livroId: estado.livro.id })
          : [];
        const porId = new Map(
          atuais.map((peca) => [peca.identificador, peca.ancora]),
        );
        const mapa = Object.fromEntries(
          ancoras.map((ancora) => [
            ancora.ancora,
            porId.get(ancora.identificador),
          ]),
        );
        const equivalente =
          !!atual &&
          estado.livro?.titulo === item.titulo &&
          estado.livro.ordem === item.ordem &&
          atual.numero === item.numero &&
          atual.formato === item.formato &&
          atual.nota === item.nota &&
          instanteMicrossegundos(atual.publicacaoData) ===
            instanteMicrossegundos(item.publicacaoData) &&
          serializarCanonico(atual.conteudo) ===
            serializarCanonico(item.conteudo) &&
          serializarCanonico(completar(arvoreEstado(estado))) ===
            serializarCanonico(
              ordenarTrabalho(
                trabalho.pecas,
                new Map(atuais.map((peca) => [peca.identificador, peca.id])),
              ),
            ) &&
          serializarCanonico(mapa) ===
            serializarCanonico(item.conteudo.ancorasAntigas ?? {}) &&
          estado.versoes.filter((versao) => !versao.is_deleted).length === 1;
        informar(
          `${item.codigo}: local ${atual?.numero ?? "(ausente)"} -> recebida ${item.numero}; ${contar(trabalho.pecas)} peça(s); ${equivalente ? "equivalente, sem alteração" : estado.livro ? "substituir: edições/trabalho e histórico locais serão descartados" : "criar livro"}.`,
        );
        if (!equivalente) alteracoes.push({ item, trabalho, estado });
        const conferir = async (
          arvore: readonly LivroPecaDto[],
        ): Promise<void> => {
          for (const peca of arvore) {
            const [existente] = await repositorio.recuperarIdentificador({
              identificador: peca.identificador,
            });
            if (existente && existente.livro_id !== estado.livro?.id)
              throw new Error(
                "UUID pertence a outro livro, inclusive registro inativo.",
              );
            await conferir(peca.filhos);
          }
        };
        await conferir(trabalho.pecas);
      }
      if (argumentos.simular || !alteracoes.length) return;
      if (
        !argumentos.substituir &&
        alteracoes.some(({ estado }) => estado.livro)
      )
        throw new Error("Livro existente exige --substituir.");
      const caminho = await conferirPreservacao(
        criarRecuperacao({
          formato: 1,
          criacaoData: new Date().toISOString(),
          alvo,
          estados,
        }),
        dependencias.preservar ?? preservarRecuperacao,
      );
      informar(`Recuperação verificada: ${caminho}`);
      for (const { item, trabalho, estado } of alteracoes) {
        const revividos = estado.livro
          ? []
          : await repositorio.reviverLivro({ codigo: item.codigo });
        if (revividos.length > 1)
          throw new Error(
            "Mais de um livro inativo com esse código; substituição ambígua recusada.",
          );
        const livro =
          estado.livro ??
          revividos[0] ??
          (await livros.criarLivro({
            codigo: item.codigo,
            titulo: item.titulo,
            ordem: item.ordem,
          }));
        await desativar(repositorio, livro.id);
        await repositorio.alterarLivro({
          id: livro.id,
          titulo: item.titulo,
          ordem: item.ordem,
        });
        const porAncora = new Map<string, number>();
        const gravar = async (
          arvore: readonly LivroPecaDto[],
          pai: number | null,
        ): Promise<void> => {
          for (const peca of arvore) {
            const [gravada] = await repositorio.gravarPeca({
              livroId: livro.id,
              pecaPaiId: pai,
              peca,
            });
            if (!gravada) throw new Error("Colisão de identidade de peça.");
            if (peca.ancora) porAncora.set(peca.ancora, gravada.id);
            await gravar(peca.filhos, gravada.id);
          }
        };
        await gravar(trabalho.pecas, null);
        for (const [antiga, atual] of Object.entries(
          item.conteudo.ancorasAntigas ?? {},
        )) {
          const regraPecaId = porAncora.get(atual);
          if (!regraPecaId) throw new Error("Âncora antiga sem destino.");
          await pecas.criarAncoraAntiga({ regraPecaId, ancora: antiga });
        }
        await repositorio.gravarPublicacao({
          livroId: livro.id,
          item,
          usuarioId: argumentos.usuarioId,
        });
      }
      informar(
        "Pacote importado. Execute regras:exportar e revise os arquivos gerados.",
      );
    });
  } finally {
    await conexao.destroy();
  }
}
async function desativar(
  repositorio: ImportacaoPacoteRepository,
  livroId: number,
): Promise<void> {
  await repositorio.desativarAncoras({ livroId });
  await repositorio.desativarPecas({ livroId });
  await repositorio.desativarVersoes({ livroId });
}
function contar(pecas: readonly LivroPecaDto[]): number {
  return pecas.reduce((total, peca) => total + 1 + contar(peca.filhos), 0);
}
function ordenarTrabalho(
  pecas: readonly LivroPecaDto[],
  identidades: ReadonlyMap<string, number>,
): readonly LivroPecaDto[] {
  return [...pecas]
    .sort(
      (antes, depois) =>
        antes.ordem - depois.ordem ||
        (identidades.get(antes.identificador) ?? 0) -
          (identidades.get(depois.identificador) ?? 0),
    )
    .map((peca) => ({
      ...peca,
      filhos: ordenarTrabalho(peca.filhos, identidades),
    }));
}
function instanteMicrossegundos(valor: string): bigint {
  const fracao = /\.(\d+)/.exec(valor)?.[1] ?? "";
  return (
    BigInt(Date.parse(valor)) * 1000n +
    BigInt(fracao.padEnd(6, "0").slice(3, 6))
  );
}
