import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import knex, { type Knex } from "knex";
import { describe, expect, it } from "vitest";
import type {
  LivroPacoteItemDto,
  LivroRecuperacaoDto,
} from "@contratados-rpg/shared/dtos/livro";
import {
  TipoRegraPecaEnum as Tipo,
  TipoLivroVersaoSituacaoEnum as Situacao,
  TipoUsuarioEnum,
} from "@contratados-rpg/shared/enums";
import { executarPacoteLocal } from "./importar-pacote-runtime";
import {
  criarPacoteLivros,
  serializarCanonico,
} from "../../src/modules/livro/transporte/pacote-livros";
import { criarRecuperacao } from "../../src/modules/livro/transporte/recuperacao-pacote";
import { ImportacaoPacoteRepository } from "../../src/modules/livro/transporte/importacao-pacote.repository";
import { LivroRepository } from "../../src/modules/livro/livro.repository";
import { RegraPecaRepository } from "../../src/modules/livro/regra-peca.repository";
import { LivroVersaoRepository } from "../../src/modules/livro/livro-versao.repository";
import { LivroService } from "../../src/modules/livro/livro.service";
import { TransacaoService } from "../../src/database/transacao.service";

describe.runIf(process.env.TESTAR_POSTGRES_PACOTE === "1")(
  "pacote PostgreSQL isolado porta 5434",
  () => {
    it("valida guard, prévia, recuperação, rollback, repetição, trabalho, republicação e restauração real", async () => {
      expect(process.env.DB_PORT).toBe("5434");
      const ambiente: NodeJS.ProcessEnv = {
        ...process.env,
        APP_AMBIENTE: "development",
        DB_HOST: "127.0.0.1",
        DB_NOME: "contratados_rpg",
        DB_USUARIO: "postgres",
        ARMAZENAMENTO_PROVEDOR: "local",
      };
      const conexao: Knex = knex({
        client: "pg",
        connection: {
          host: ambiente.DB_HOST,
          port: 5434,
          database: ambiente.DB_NOME,
          user: ambiente.DB_USUARIO,
          password: ambiente.DB_SENHA,
        },
      });
      const diretorio = resolve(
        "../.artifacts/livros-exportacao-publicada-e-importacao-dev/teste-pacote-" +
          randomUUID(),
      );
      await mkdir(diretorio, { recursive: true });
      const repositorio = new ImportacaoPacoteRepository(conexao);
      const estados = async () =>
        Promise.all(
          ["sistema", "guia"].map(
            async (codigo) =>
              (await repositorio.recuperarEstado({ codigo }))[0],
          ),
        );
      const baseline = await estados();
      const [admin] = (
        await conexao.raw<{ rows: { id: number }[] }>(
          "SELECT usuario.id FROM usuario INNER JOIN tipo_usuario ON tipo_usuario.id=usuario.tipo_usuario_id AND tipo_usuario.is_deleted=false WHERE usuario.is_deleted=false AND tipo_usuario.codigo='ADMIN' ORDER BY usuario.id DESC LIMIT 1",
        )
      ).rows;
      const usuarioId = admin.id;
      const backups: string[] = [];
      const preservar = async (recuperacao: LivroRecuperacaoDto) => {
        const arquivo = resolve(
          diretorio,
          `recuperacao-${backups.length}.json`,
        );
        await writeFile(arquivo, JSON.stringify(recuperacao));
        backups.push(arquivo);
        return arquivo;
      };
      const executar = (
        arquivo: string,
        flags: string[] = [],
        restaurar = false,
        usuario = usuarioId,
        gravar = preservar,
      ) =>
        executarPacoteLocal(
          {
            ambiente,
            argumentos: [
              `--arquivo=${arquivo}`,
              `--usuario=${usuario}`,
              ...flags,
            ],
            restaurar,
          },
          { preservar: gravar, informar: () => undefined },
        );
      const livros: LivroPacoteItemDto[] = ["sistema", "guia"].map(
        (codigo, indice) => {
          const identificador = randomUUID();
          return {
            codigo,
            titulo: codigo,
            ordem: indice + 1,
            numero: "9.9",
            formato: 1,
            publicacaoData: "2026-10-22T12:00:00.123456Z",
            nota: "## Nota\nMarkdown integral",
            conteudo: {
              codigo,
              titulo: codigo,
              subtitulo: "",
              numero: "9.9",
              formato: 1,
              ancorasAntigas: { antiga: "secao" },
              pecas: [
                {
                  identificador,
                  ancora: "secao",
                  ordem: 0,
                  tipo: Tipo.SECAO,
                  dados: { titulo: "Seção", nivel: 1, glifo: null },
                  filhos: [
                    {
                      identificador: randomUUID(),
                      ancora: null,
                      ordem: 0,
                      tipo: Tipo.PARAGRAFO,
                      dados: {
                        trechos: [
                          {
                            tipo: "negrito",
                            filhos: [
                              {
                                tipo: "link-interno",
                                texto: "Vínculo",
                                ancora: "secao",
                              },
                            ],
                          },
                        ],
                      },
                      filhos: [],
                    },
                  ],
                },
              ],
            },
          };
        },
      );
      const arquivo = resolve(diretorio, "pacote.json");
      // Ordem de array diferente da posição editorial: o banco ordena por ordem/id.
      for (const item of livros) {
        const raiz = item.conteudo.pecas[0];
        (raiz.filhos as unknown[]).unshift({
          identificador: randomUUID(),
          ancora: null,
          ordem: 1,
          tipo: Tipo.PARAGRAFO,
          dados: { trechos: [{ tipo: "texto", texto: "Segundo parágrafo" }] },
          filhos: [],
        });
      }
      await writeFile(arquivo, JSON.stringify(criarPacoteLivros(livros)));
      const logico = (valor: unknown): string =>
        serializarCanonico(
          JSON.parse(JSON.stringify(valor), (chave, item: unknown) =>
            chave === "updated_date" ? undefined : item,
          ),
        );
      const baselineLogico = logico(baseline);
      const outros = async () =>
        (
          await conexao.raw<{ rows: { campanhas: string; fichas: string; usuarios: string }[] }>(
            "SELECT (SELECT count(*) FROM campanha WHERE is_deleted=false) AS campanhas, (SELECT count(*) FROM ficha WHERE is_deleted=false) AS fichas, (SELECT count(*) FROM usuario WHERE is_deleted=false) AS usuarios",
          )
        ).rows;
      const dadosAlheios = await outros();
      let restaurou = false;
      try {
        await executar(arquivo, ["--simular"]);
        expect(backups).toHaveLength(0);
        expect(logico(await estados())).toBe(baselineLogico);
        await expect(executar(arquivo)).rejects.toThrow(/substituir/);
        await expect(
          executar(arquivo, ["--simular"], false, 0),
        ).rejects.toThrow(/usuario/);
        await expect(
          executar(arquivo, ["--simular"], false, 2147483647),
        ).rejects.toThrow(/administrador/);
        await expect(
          executar(arquivo, ["--substituir"], false, usuarioId, () => Promise.reject(new Error("falha ao preservar"))),
        ).rejects.toThrow(/preservar/);
        expect(logico(await estados())).toBe(baselineLogico);
        await conexao.raw(
          "CREATE OR REPLACE FUNCTION fn_teste_pacote_falhar() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.livro_id = (SELECT id FROM livro WHERE codigo='guia' AND is_deleted=false) THEN RAISE EXCEPTION 'falha segundo livro'; END IF; RETURN NEW; END $$",
        );
        await conexao.raw(
          "CREATE TRIGGER trg_teste_pacote_falhar BEFORE INSERT ON livro_versao FOR EACH ROW EXECUTE FUNCTION fn_teste_pacote_falhar()",
        );
        await expect(executar(arquivo, ["--substituir"])).rejects.toThrow(
          /falha segundo/,
        );
        expect(logico(await estados())).toBe(baselineLogico);
        await conexao.raw(
          "DROP TRIGGER trg_teste_pacote_falhar ON livro_versao",
        );
        await conexao.raw("DROP FUNCTION fn_teste_pacote_falhar()");
        await executar(arquivo, ["--substituir"]);
        const primeira = logico(await estados());
        const quantidadeBackups = backups.length;
        await executar(arquivo);
        expect(logico(await estados())).toBe(primeira);
        expect(backups).toHaveLength(quantidadeBackups);
        const livro = (await new LivroRepository(conexao).recuperarLivro({
          codigo: "sistema",
        }))!;
        const pecas = new RegraPecaRepository(conexao);
        const versoes = new LivroVersaoRepository(conexao);
        const trabalho = await pecas.listarArvore({ livroId: livro.id });
        expect(trabalho.map((peca) => peca.identificador)).toContain(
          livros[0].conteudo.pecas[0].identificador,
        );
        expect(
          (await pecas.listarAncorasAntigas({ livroId: livro.id }))[0].ancora,
        ).toBe("antiga");
        const secao = trabalho.find((peca) => peca.ancora === "secao")!;
        await pecas.alterarDados({
          id: secao.id,
          revisao: secao.revisao,
          dados: { titulo: "Editada", nivel: 1, glifo: null },
        });
        await expect(executar(arquivo)).rejects.toThrow(/substituir/);
        await executar(arquivo, ["--substituir"]); // mesmo número e fotografia, trabalho divergente.
        const atualSecao = (
          await pecas.listarArvore({ livroId: livro.id })
        ).find((peca) => peca.id === secao.id)!;
        await pecas.alterarDados({
          id: secao.id,
          revisao: atualSecao.revisao,
          dados: { titulo: "", nivel: 1, glifo: null },
        });
        const servicoRascunho = new LivroService(
          new LivroRepository(conexao),
          pecas,
          versoes,
          new TransacaoService(conexao),
        );
        const rascunho = await servicoRascunho.publicar(
          {
            codigo: "sistema",
            numero: "rascunho-teste",
            situacao: Situacao.RASCUNHO,
          },
          {
            sub: usuarioId,
            login: "teste",
            tipo: TipoUsuarioEnum.ADMIN,
            tokenVersao: 1,
          },
        );
        expect(rascunho.pendencias.length).toBeGreaterThan(0);
        const indiceIncompleto = backups.length;
        await executar(arquivo, ["--substituir"]);
        await executar(backups[indiceIncompleto], ["--substituir"], true);
        const restauradoIncompleto = await versoes.recuperarVersao({
          id: rascunho.versao.id,
        });
        expect(restauradoIncompleto?.conteudo.pecas[0].dados).toEqual({
          titulo: "",
          nivel: 1,
          glifo: null,
        });
        await executar(arquivo, ["--substituir"]);
        const mudouConteudo = structuredClone(livros);
        (
          mudouConteudo[0].conteudo.pecas[0].dados as { titulo: string }
        ).titulo = "Conteúdo diferente, número igual";
        const caminhoMudou = resolve(diretorio, "mesmo-numero-diferente.json");
        await writeFile(
          caminhoMudou,
          JSON.stringify(criarPacoteLivros(mudouConteudo)),
        );
        await expect(executar(caminhoMudou)).rejects.toThrow(/substituir/);
        await executar(caminhoMudou, ["--substituir"]);
        expect(
          (
            await versoes.recuperarVersaoAtual({
              livroId: livro.id,
              situacao: Situacao.PUBLICADA,
            })
          )?.conteudo,
        ).toEqual(mudouConteudo[0].conteudo);
        const mudouData = mudouConteudo.map((item, indice) =>
          indice
            ? item
            : { ...item, publicacaoData: "2026-10-22T12:00:00.123457Z" },
        );
        const caminhoData = resolve(diretorio, "microssegundo-diferente.json");
        await writeFile(
          caminhoData,
          JSON.stringify(criarPacoteLivros(mudouData)),
        );
        await expect(executar(caminhoData)).rejects.toThrow(/substituir/);
        const serviço = new LivroService(
          new LivroRepository(conexao),
          pecas,
          versoes,
          new TransacaoService(conexao),
        );
        const publicada = await serviço.publicar(
          {
            codigo: "sistema",
            numero: "10",
            situacao: Situacao.PUBLICADA,
            nota: "teste local",
          },
          {
            sub: usuarioId,
            login: "teste",
            tipo: TipoUsuarioEnum.ADMIN,
            tokenVersao: 1,
          },
        );
        expect(publicada.pendencias).toEqual([]);
        const republicada = await versoes.recuperarVersao({
          id: publicada.versao.id,
        });
        expect(republicada?.conteudo.pecas[0].identificador).toBe(
          secao.identificador,
        );
        expect(republicada?.conteudo.ancorasAntigas).toEqual({
          antiga: "secao",
        });
        const recuperacao = JSON.parse(
          await readFile(backups[1], "utf8"),
        ) as LivroRecuperacaoDto;
        const origemDiferente = resolve(diretorio, "outro-alvo.json");
        await writeFile(
          origemDiferente,
          JSON.stringify(
            criarRecuperacao({
              ...recuperacao,
              alvo: {
                ...recuperacao.alvo,
                bancoOid: recuperacao.alvo.bancoOid + 1,
              },
            }),
          ),
        );
        await expect(
          executar(origemDiferente, ["--substituir"], true),
        ).rejects.toThrow(/outro alvo/);
        await executar(backups[1], ["--substituir"], true);
        restaurou = true;
        expect(logico(await estados())).toBe(baselineLogico);
        expect(await outros()).toEqual(dadosAlheios);
      } finally {
        await conexao.raw(
          "DROP TRIGGER IF EXISTS trg_teste_pacote_falhar ON livro_versao",
        );
        await conexao.raw("DROP FUNCTION IF EXISTS fn_teste_pacote_falhar()");
        if (!restaurou && backups.length)
          await executar(backups[0], ["--substituir"], true);
        await conexao.destroy();
      }
    }, 180000);
  },
);
