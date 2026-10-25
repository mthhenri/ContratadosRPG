import { createHash } from "node:crypto";
import type {
  LivroRecuperacaoDto,
  LivroRecuperacaoEstadoDto,
} from "@contratados-rpg/shared/dtos/livro";
import {
  serializarCanonico,
  validarEstruturaConteudoLivro,
} from "./pacote-livros";

export function criarRecuperacao(
  valor: Omit<LivroRecuperacaoDto, "sha256">,
): LivroRecuperacaoDto {
  const corpo = {
    formato: valor.formato,
    criacaoData: valor.criacaoData,
    alvo: valor.alvo,
    estados: valor.estados,
  };
  return {
    ...corpo,
    sha256: createHash("sha256")
      .update(serializarCanonico(corpo))
      .digest("hex"),
  };
}

function registro(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor))
    throw new Error("Recuperação malformada.");
  return valor as Record<string, unknown>;
}
const inteiro = (valor: unknown): boolean =>
  Number.isSafeInteger(valor) && Number(valor) > 0;
const data = (valor: unknown): boolean =>
  typeof valor === "string" && Number.isFinite(Date.parse(valor));

/** Valida limites relacionais além do hash, antes de qualquer escrita. */
export function validarRecuperacao(valor: unknown): LivroRecuperacaoDto {
  const pacote = registro(valor);
  const { sha256, ...corpo } = pacote;
  if (
    Object.keys(pacote).sort().join(",") !==
      "alvo,criacaoData,estados,formato,sha256" ||
    pacote.formato !== 1 ||
    !data(pacote.criacaoData) ||
    typeof sha256 !== "string" ||
    criarRecuperacao(corpo as unknown as Omit<LivroRecuperacaoDto, "sha256">)
      .sha256 !== sha256
  )
    throw new Error("Recuperação incompatível ou integridade inválida.");
  const alvo = registro(pacote.alvo);
  if (
    !["localhost", "127.0.0.1"].includes(String(alvo.host)) ||
    !inteiro(alvo.porta) ||
    Number(alvo.porta) > 65535 ||
    alvo.nome !== "contratados_rpg" ||
    typeof alvo.sistemaIdentificador !== "string" ||
    !/^\d+$/.test(alvo.sistemaIdentificador) ||
    !inteiro(alvo.bancoOid)
  )
    throw new Error("Alvo de recuperação inválido.");
  if (
    !Array.isArray(pacote.estados) ||
    pacote.estados.length !== 2 ||
    pacote.estados
      .map((item) => registro(item).codigo)
      .sort()
      .join(",") !== "guia,sistema"
  )
    throw new Error("Conjunto da recuperação inválido.");
  const globais = {
    pecas: new Set<number>(),
    versoes: new Set<number>(),
    ancoras: new Set<number>(),
    identificadores: new Set<string>(),
  };
  for (const entrada of pacote.estados) {
    const estado = registro(entrada);
    for (const campo of ["pecas", "versoes", "ancoras"])
      if (!Array.isArray(estado[campo]))
        throw new Error("Coleção da recuperação inválida.");
    if (estado.livro === null) {
      if (
        ["pecas", "versoes", "ancoras"].some(
          (campo) => (estado[campo] as unknown[]).length,
        )
      )
        throw new Error("Livro ausente tem registros.");
      continue;
    }
    const livro = registro(estado.livro);
    if (
      livro.codigo !== estado.codigo ||
      livro.is_deleted !== false ||
      typeof livro.titulo !== "string" ||
      !Number.isInteger(livro.ordem)
    )
      throw new Error("Livro de recuperação inválido.");
    const conferirBase = (linha: Record<string, unknown>): void => {
      if (
        !inteiro(linha.id) ||
        !data(linha.created_date) ||
        !data(linha.updated_date) ||
        linha.is_deleted !== false ||
        !(linha.deleted_date === null || data(linha.deleted_date))
      )
        throw new Error("Registro da recuperação inválido.");
    };
    conferirBase(livro);
    for (const campo of ["pecas", "versoes", "ancoras"] as const)
      for (const valorLinha of estado[campo] as unknown[]) {
        const linha = registro(valorLinha);
        conferirBase(linha);
        if (linha.livro_id !== livro.id || globais[campo].has(Number(linha.id)))
          throw new Error("Escopo ou identidade de recuperação inválido.");
        globais[campo].add(Number(linha.id));
        if (campo === "pecas") {
          if (
            typeof linha.identificador !== "string" ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              linha.identificador,
            ) ||
            globais.identificadores.has(linha.identificador) ||
            !inteiro(linha.tipo_regra_peca_id) ||
            !inteiro(linha.revisao) ||
            !Number.isInteger(linha.ordem) ||
            Number(linha.ordem) < 0 ||
            !(linha.ancora === null || typeof linha.ancora === "string")
          )
            throw new Error("Peça da recuperação inválida.");
          registro(linha.dados);
          globais.identificadores.add(linha.identificador);
        } else if (campo === "ancoras") {
          if (
            !inteiro(linha.regra_peca_id) ||
            typeof linha.ancora !== "string" ||
            !linha.ancora.trim()
          )
            throw new Error("Âncora da recuperação inválida.");
        } else {
          if (
            !inteiro(linha.tipo_livro_versao_situacao_id) ||
            !inteiro(linha.usuario_id) ||
            !inteiro(linha.formato) ||
            typeof linha.numero !== "string" ||
            !data(linha.publicacao_data) ||
            !(linha.nota === null || typeof linha.nota === "string")
          )
            throw new Error("Versão da recuperação inválida.");
          const conteudo = validarEstruturaConteudoLivro(linha.conteudo);
          if (
            conteudo.codigo !== estado.codigo ||
            conteudo.numero !== linha.numero ||
            conteudo.formato !== linha.formato
          )
            throw new Error(
              "Metadados da fotografia de recuperação divergentes.",
            );
        }
      }
    const tipado = estado as unknown as LivroRecuperacaoEstadoDto;
    const ids = new Set(tipado.pecas.map((peca) => peca.id));
    if (
      tipado.pecas.some(
        (peca) => peca.peca_pai_id !== null && !ids.has(peca.peca_pai_id),
      ) ||
      tipado.ancoras.some((ancora) => !ids.has(ancora.regra_peca_id))
    )
      throw new Error("Referência externa à recuperação.");
    const pais = new Map(
      tipado.pecas.map((peca) => [peca.id, peca.peca_pai_id]),
    );
    for (const peca of tipado.pecas) {
      const vistos = new Set<number>();
      let atual: number | null = peca.id;
      while (atual !== null) {
        if (vistos.has(atual))
          throw new Error("Ciclo na árvore de recuperação.");
        vistos.add(atual);
        atual = pais.get(atual) ?? null;
      }
    }
  }
  return valor as LivroRecuperacaoDto;
}
