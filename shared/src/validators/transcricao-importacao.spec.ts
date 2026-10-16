import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TRANSCRICAO_TERMO_MAXIMO,
  chaveParecidaTranscricao,
  chaveTermoGlossario,
  detectarDuplicidadeArquivos,
  localizarConflitoTermo,
  localizarParticipanteParecido,
  montarGlossarioEfetivoTranscricao,
  montarPacoteTrabalhoTranscricao,
  normalizarRotuloTranscricao,
  participantesSemFaixa,
  sugerirIdentidadeFaixa,
  validarRotuloParticipante,
  validarTermoGlossario,
} from "./transcricao-importacao.validators";

const COMPOSTO = "Jos\u00e9"; // é precomposto
const DECOMPOSTO = "Jose\u0301"; // e + acento combinante

describe("normalizarRotuloTranscricao", () => {
  it("unifica a forma Unicode, apara e colapsa espaços, sem mexer em caixa nem acento", () => {
    expect(normalizarRotuloTranscricao(`  ${DECOMPOSTO}\u00a0\u00a0 Silva  `)).toBe(`${COMPOSTO} Silva`);
    expect(normalizarRotuloTranscricao("Zé")).toBe("Zé");
    expect(normalizarRotuloTranscricao("ZÉ")).toBe("ZÉ");
  });
});

describe("chaveTermoGlossario (acento distingue, caixa não)", () => {
  it("ignora caixa e a forma Unicode", () => {
    expect(chaveTermoGlossario("ZÉ ")).toBe(chaveTermoGlossario("zé"));
    expect(chaveTermoGlossario(DECOMPOSTO)).toBe(chaveTermoGlossario(COMPOSTO.toUpperCase()));
  });
  it("não funde acento diferente", () => {
    expect(chaveTermoGlossario("Zé")).not.toBe(chaveTermoGlossario("Ze"));
  });
});

describe("chaveParecidaTranscricao (ignora caixa e acento)", () => {
  it("aproxima João, JOÃO, joao e a forma decomposta", () => {
    const chaves = new Set(["João", "JOÃO", "joao", "Joa\u0303o", "  joão  "].map(chaveParecidaTranscricao));
    expect(chaves.size).toBe(1);
  });
  it("mantém nomes diferentes distintos", () => {
    expect(chaveParecidaTranscricao("Joana")).not.toBe(chaveParecidaTranscricao("Joao"));
  });
});

describe("validarTermoGlossario", () => {
  it("devolve o valor normalizado quando válido", () => {
    expect(validarTermoGlossario(`  ${DECOMPOSTO}   Silva `)).toEqual({ valido: true, valor: `${COMPOSTO} Silva` });
  });
  it.each([
    ["", "VAZIO"],
    ["   ", "VAZIO"],
    [null, "TIPO"],
    [42, "TIPO"],
    ["a".repeat(TRANSCRICAO_TERMO_MAXIMO + 1), "LONGO"],
    ["linha\noutra", "CONTROLE"],
    ["com\ttab", "CONTROLE"],
    ["zero\u200bwidth", "CONTROLE"],
    ["nulo\u0000", "CONTROLE"],
  ])("recusa %j como %s", (entrada, motivo) => {
    expect(validarTermoGlossario(entrada)).toMatchObject({ valido: false, motivo });
  });
  it("conta pontos de código, não unidades UTF-16", () => {
    expect(validarTermoGlossario("😀".repeat(TRANSCRICAO_TERMO_MAXIMO)).valido).toBe(true);
    expect(validarTermoGlossario("😀".repeat(TRANSCRICAO_TERMO_MAXIMO + 1))).toMatchObject({ valido: false, motivo: "LONGO" });
  });
});

describe("validarRotuloParticipante", () => {
  it("aceita até 255 pontos de código e recusa acima", () => {
    expect(validarRotuloParticipante("a".repeat(255)).valido).toBe(true);
    expect(validarRotuloParticipante("a".repeat(256))).toMatchObject({ valido: false, motivo: "LONGO" });
  });
  it("mesmas regras de vazio e controle", () => {
    expect(validarRotuloParticipante("  ")).toMatchObject({ valido: false, motivo: "VAZIO" });
    expect(validarRotuloParticipante("a\u200bb")).toMatchObject({ valido: false, motivo: "CONTROLE" });
  });
  it("mant\u00e9m ZWNJ e ZWJ, que fazem parte de nomes leg\u00edtimos (por exemplo, em persa)", () => {
    expect(validarRotuloParticipante("\u0645\u06cc\u200c\u062e\u0648\u0627\u0647\u0645").valido).toBe(true);
  });
});

describe("localizarConflitoTermo", () => {
  const existentes = ["Zé", "Aragorn"];
  it("caixa diferente é duplicata e aponta o termo existente", () => {
    expect(localizarConflitoTermo("zé", existentes)).toEqual({ tipo: "DUPLICADO", existente: "Zé" });
    expect(localizarConflitoTermo("ARAGORN ", existentes)).toEqual({ tipo: "DUPLICADO", existente: "Aragorn" });
  });
  it("acento diferente não é duplicata: é só um parecido não bloqueante", () => {
    expect(localizarConflitoTermo("Ze", existentes)).toEqual({ tipo: "PARECIDO", existente: "Zé" });
  });
  it("sem conflito devolve null", () => {
    expect(localizarConflitoTermo("Gandalf", existentes)).toBeNull();
  });
  it("duplicata tem prioridade sobre parecido", () => {
    expect(localizarConflitoTermo("Ze", ["Zé", "ze"])).toEqual({ tipo: "DUPLICADO", existente: "ze" });
  });
});

describe("sugerirIdentidadeFaixa", () => {
  const associacoes = [
    { nomeOrigem: "joao", participante: "João Silva" },
    { nomeOrigem: "maria_b", participante: "Maria B." },
  ];
  it("associação conhecida sugere, ignorando prefixo numérico, extensão, caixa e acento", () => {
    expect(sugerirIdentidadeFaixa("1-joao.wav", associacoes)).toEqual({ origem: "ASSOCIACAO", participante: "João Silva", candidatos: ["João Silva"] });
    expect(sugerirIdentidadeFaixa("JOÃO.WAV", associacoes).participante).toBe("João Silva");
    expect(sugerirIdentidadeFaixa("02_maria_b.wav", associacoes).participante).toBe("Maria B.");
  });
  it("aceita caminho do Windows e do Linux", () => {
    expect(sugerirIdentidadeFaixa("C:\\sessao\\1-joao.wav", associacoes).participante).toBe("João Silva");
    expect(sugerirIdentidadeFaixa("/tmp/sessao/1-joao.wav", associacoes).participante).toBe("João Silva");
  });
  it("desconhecida não chuta", () => {
    expect(sugerirIdentidadeFaixa("3-carlos.wav", associacoes)).toEqual({ origem: "DESCONHECIDA", participante: null, candidatos: [] });
    expect(sugerirIdentidadeFaixa("1.wav", associacoes).origem).toBe("DESCONHECIDA");
    expect(sugerirIdentidadeFaixa("1-joao.wav", []).origem).toBe("DESCONHECIDA");
  });
  it("duas associações para pessoas diferentes são ambíguas e não escolhem", () => {
    const ambiguas = [
      { nomeOrigem: "joao", participante: "João A" },
      { nomeOrigem: "joão", participante: "João B" },
    ];
    expect(sugerirIdentidadeFaixa("1-joao.wav", ambiguas)).toEqual({ origem: "AMBIGUA", participante: null, candidatos: ["João A", "João B"] });
  });
  it("a mesma pessoa em duas associações não é ambígua", () => {
    const mesma = [
      { nomeOrigem: "joao", participante: "João" },
      { nomeOrigem: "joão", participante: "João" },
    ];
    expect(sugerirIdentidadeFaixa("joao.wav", mesma).origem).toBe("ASSOCIACAO");
  });
  it("o nome completo tem prioridade sobre o nome sem prefixo numérico", () => {
    const duas = [
      { nomeOrigem: "1-joao", participante: "João Um" },
      { nomeOrigem: "joao", participante: "João Sem Prefixo" },
    ];
    expect(sugerirIdentidadeFaixa("1-joao.wav", duas).participante).toBe("João Um");
  });
});

describe("detectarDuplicidadeArquivos", () => {
  const a = { nomeArquivo: "1-joao.wav", tamanhoBytes: 1000, duracaoMilissegundos: 5000 };
  it("mesmo nome, tamanho e duração é duplicado", () => {
    expect(detectarDuplicidadeArquivos([a, { ...a }, { ...a, nomeArquivo: "outro.wav", tamanhoBytes: 7 }]))
      .toEqual([{ tipo: "DUPLICADO", indices: [0, 1] }]);
  });
  it("caixa do nome não esconde duplicata", () => {
    expect(detectarDuplicidadeArquivos([a, { ...a, nomeArquivo: "1-JOAO.WAV" }])).toEqual([{ tipo: "DUPLICADO", indices: [0, 1] }]);
  });
  it("mesmo nome com conteúdo diferente avisa que o arquivo foi alterado", () => {
    expect(detectarDuplicidadeArquivos([a, { ...a, duracaoMilissegundos: 5001 }]))
      .toEqual([{ tipo: "MESMO_NOME_DIFERENTE", indices: [0, 1] }]);
  });
  it("nome diferente com mesmo tamanho e duração sugere cópia renomeada", () => {
    expect(detectarDuplicidadeArquivos([a, { ...a, nomeArquivo: "copia.wav" }]))
      .toEqual([{ tipo: "POSSIVEL_COPIA_RENOMEADA", indices: [0, 1] }]);
  });
  it("arquivos distintos não geram achado", () => {
    expect(detectarDuplicidadeArquivos([a, { nomeArquivo: "2-maria.wav", tamanhoBytes: 99, duracaoMilissegundos: 123 }])).toEqual([]);
  });
});

describe("participantesSemFaixa", () => {
  it("lista quem era esperado e não tem faixa, comparando sem caixa e sem acento", () => {
    expect(participantesSemFaixa(["João", "Maria", "Zé"], ["joao", "ZE"])).toEqual(["Maria"]);
  });
  it("sem esperados não há faltantes", () => {
    expect(participantesSemFaixa([], ["x"])).toEqual([]);
  });
});

describe("montarGlossarioEfetivoTranscricao", () => {
  it("ordena de forma determinística e remove duplicata por chave, mantendo acento distinto", () => {
    const resultado = montarGlossarioEfetivoTranscricao(["zé", "Aragorn", "Zé", "Ze", "aragorn"]);
    expect(resultado).toEqual({ versao: 1, termos: ["Aragorn", "Ze", "Zé"] });
  });
  it("a ordem de entrada não muda o resultado", () => {
    const base = ["b", "A", "c", "á"];
    expect(montarGlossarioEfetivoTranscricao([...base].reverse())).toEqual(montarGlossarioEfetivoTranscricao(base));
  });
});

describe("montarPacoteTrabalhoTranscricao", () => {
  const faixa = {
    identificador: "11111111-1111-4111-8111-111111111111",
    nomeArquivo: "1-joao.wav",
    participante: "João",
    identidadeConfirmada: true,
    deslocamentoMilissegundos: -250,
    silencioInicialMilissegundos: 1200,
  };
  const base = { campanhaId: 7, sessaoId: 3, idioma: "pt", glossario: [{ campanhaId: 7, termo: "Aragorn" }], faixas: [faixa] };
  it("monta o pacote sem alterar offsets nem aplicar silêncio", () => {
    const r = montarPacoteTrabalhoTranscricao(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.pacote.glossario).toEqual(["Aragorn"]);
      expect(r.pacote.faixas[0].deslocamentoMilissegundos).toBe(-250);
      expect(r.pacote.faixas[0].silencioInicialMilissegundos).toBe(1200);
      expect(r.pacote.faixas[0]).not.toHaveProperty("identidadeConfirmada");
    }
  });
  it("recusa termo de outra campanha, sem vazar o termo", () => {
    const r = montarPacoteTrabalhoTranscricao({ ...base, glossario: [{ campanhaId: 8, termo: "Segredo do outro" }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(JSON.stringify(r.erros)).not.toContain("Segredo do outro");
  });
  it("recusa faixa sem identidade confirmada", () => {
    const r = montarPacoteTrabalhoTranscricao({ ...base, faixas: [{ ...faixa, identidadeConfirmada: false }] });
    expect(r).toMatchObject({ ok: false });
  });
  it("recusa pacote sem faixas e idioma inválido", () => {
    expect(montarPacoteTrabalhoTranscricao({ ...base, faixas: [] }).ok).toBe(false);
    expect(montarPacoteTrabalhoTranscricao({ ...base, idioma: "pt br!" }).ok).toBe(false);
    expect(montarPacoteTrabalhoTranscricao({ ...base, idioma: "" }).ok).toBe(false);
  });
  it("recusa offset não inteiro ou fora do intervalo seguro", () => {
    expect(montarPacoteTrabalhoTranscricao({ ...base, faixas: [{ ...faixa, deslocamentoMilissegundos: 1.5 }] }).ok).toBe(false);
    expect(montarPacoteTrabalhoTranscricao({ ...base, faixas: [{ ...faixa, deslocamentoMilissegundos: Number.MAX_SAFE_INTEGER + 1 }] }).ok).toBe(false);
  });
  it("recusa duas faixas com o mesmo identificador", () => {
    expect(montarPacoteTrabalhoTranscricao({ ...base, faixas: [faixa, { ...faixa }] }).ok).toBe(false);
  });
});

describe("localizarParticipanteParecido (D-06b)", () => {
  it("João já existe e Joao é parecido: aponta o existente", () => {
    expect(localizarParticipanteParecido("Joao", ["João", "Maria"])).toBe("João");
    expect(localizarParticipanteParecido("JOÃO", ["João"])).toBe("João");
  });
  it("o mesmo rótulo (mesma pessoa) não é parecido, nem na forma Unicode decomposta", () => {
    expect(localizarParticipanteParecido("João", ["João"])).toBeNull();
    expect(localizarParticipanteParecido("João", ["João"])).toBeNull();
  });
  it("se o rótulo exato já existe, ignora variantes parecidas", () => {
    expect(localizarParticipanteParecido("Joao", ["João", "Joao"])).toBeNull();
  });
  it("nome diferente ou lista vazia não é parecido", () => {
    expect(localizarParticipanteParecido("Joana", ["João"])).toBeNull();
    expect(localizarParticipanteParecido("Joao", [])).toBeNull();
  });
});

describe("vetores compartilhados com o app Python", () => {
  // O mesmo arquivo é testado em desktop/transcriber/tests/test_regras_transcricao.py. Mudou a regra? Regenere com
  // `node shared/tools/gerar-vetores-transcricao.cjs` e confira os dois lados.
  // Os vetores são JSON sem tipo: `never` deixa cada campo servir de argumento sem recorrer a `any`.
  type Caso = Record<string, never>;
  const vetores = JSON.parse(readFileSync(join(__dirname, "transcricao-importacao.vetores.json"), "utf8")) as Record<string, Caso[]>;

  it("cobre todas as funções puras", () => {
    expect(Object.keys(vetores).sort()).toEqual(["chaveParecida", "chaveTermo", "conflitoTermo", "duplicidade", "glossarioEfetivo",
      "normalizarRotulo", "pacote", "participanteParecido", "participantesSemFaixa", "sugestao", "validarParticipante", "validarTermo"]);
  });
  it.each(["normalizarRotulo", "chaveTermo", "chaveParecida"] as const)("%s", (nome) => {
    const funcao = { normalizarRotulo: normalizarRotuloTranscricao, chaveTermo: chaveTermoGlossario, chaveParecida: chaveParecidaTranscricao }[nome];
    for (const caso of vetores[nome]) expect(funcao(caso.entrada)).toBe(caso.esperado);
  });
  it("validarTermo e validarParticipante", () => {
    for (const caso of vetores.validarTermo) expect(validarTermoGlossario(caso.entrada)).toEqual(caso.esperado);
    for (const caso of vetores.validarParticipante) expect(validarRotuloParticipante(caso.entrada)).toEqual(caso.esperado);
  });
  it("conflito de termo, sugestão, duplicidade, faltantes e parecido", () => {
    for (const caso of vetores.conflitoTermo) expect(localizarConflitoTermo(caso.termo, caso.existentes)).toEqual(caso.esperado);
    for (const caso of vetores.sugestao) expect(sugerirIdentidadeFaixa(caso.arquivo, caso.associacoes)).toEqual(caso.esperado);
    for (const caso of vetores.duplicidade) expect(detectarDuplicidadeArquivos(caso.arquivos)).toEqual(caso.esperado);
    for (const caso of vetores.participantesSemFaixa) expect(participantesSemFaixa(caso.esperados, caso.faixas)).toEqual(caso.esperado);
    for (const caso of vetores.participanteParecido) expect(localizarParticipanteParecido(caso.participante, caso.conhecidos)).toEqual(caso.esperado);
  });
  it("glossário efetivo e pacote do motor", () => {
    for (const caso of vetores.glossarioEfetivo) expect(montarGlossarioEfetivoTranscricao(caso.termos)).toEqual(caso.esperado);
    for (const caso of vetores.pacote) expect(montarPacoteTrabalhoTranscricao(caso.entrada)).toEqual(caso.esperado);
  });
});
