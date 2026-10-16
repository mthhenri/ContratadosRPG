// Gera src/validators/transcricao-importacao.vetores.json a partir das funções TypeScript COMPILADAS (fonte da verdade).
// Uso (na raiz do repositório): npm run build --workspace=shared && node shared/tools/gerar-vetores-transcricao.cjs
// O app Python (desktop/transcriber) testa as mesmas regras contra este arquivo; mudou a regra? Regenere e confira os dois lados.
const fs = require("node:fs");
const path = require("node:path");
const raiz = path.resolve(__dirname, "..");
const v = require(path.join(raiz, "dist/validators/transcricao-importacao.validators.js"));

const textos = [
  "João", "  José   Silva ", "Jose\u0301", "ZÉ", "zé", "Ze", "a\u00a0b", "\ufeffabc", "a\u2003b", "tab\tinterno", "linha\nquebra",
  "zero\u200bwidth", "zwnj\u200cok", "zwj\u200dok", "x\u0085y", "x\u001fy", "😀😀", "Straße", "İstanbul", "ΟΔΥΣΣΕΥΣ", "ΑΣ", "ǅ", "ﬁsh", "多国語", "", "   ", "a".repeat(80), "a".repeat(81),
  "😀".repeat(80), "😀".repeat(81), "Ａｂｃ", "e\u0301\u0301", "ñ", "n\u0303",
];
const out = {};
out.normalizarRotulo = textos.map((entrada) => ({ entrada, esperado: v.normalizarRotuloTranscricao(entrada) }));
out.chaveTermo = textos.map((entrada) => ({ entrada, esperado: v.chaveTermoGlossario(entrada) }));
out.chaveParecida = textos.map((entrada) => ({ entrada, esperado: v.chaveParecidaTranscricao(entrada) }));
const entradasValidar = [...textos, null, 42, true, {}, []];
out.validarTermo = entradasValidar.map((entrada) => ({ entrada, esperado: v.validarTermoGlossario(entrada) }));
out.validarParticipante = [...entradasValidar, "a".repeat(255), "a".repeat(256)].map((entrada) => ({ entrada, esperado: v.validarRotuloParticipante(entrada) }));

const existentes = ["Zé", "Aragorn", "Joao", "ΑΣ"];
out.conflitoTermo = ["zé", "ZÉ", "Ze", "Aragorn", "ARAGORN ", "Gandalf", "joão", "ας", "ΑΣ", "Jo\u0301ao"].map((termo) => ({ termo, existentes, esperado: v.localizarConflitoTermo(termo, existentes) }));

const associacoes = [
  { nomeOrigem: "joao", participante: "João Silva" },
  { nomeOrigem: "maria_b", participante: "Maria B." },
  { nomeOrigem: "1-pedro", participante: "Pedro Um" },
  { nomeOrigem: "pedro", participante: "Pedro Sem Prefixo" },
];
const ambiguas = [{ nomeOrigem: "joao", participante: "João A" }, { nomeOrigem: "joão", participante: "João B" }];
const arquivos = ["1-joao.wav", "JOÃO.WAV", "02_maria_b.wav", "C:\\sessao\\1-joao.wav", "/tmp/sessao/1-joao.wav", "3-carlos.wav", "1.wav", "1-pedro.wav", "5-pedro.flac", "", ".wav", "a.b.c.wav", "João Çã 日本.wav"];
out.sugestao = [
  ...arquivos.map((arquivo) => ({ arquivo, associacoes, esperado: v.sugerirIdentidadeFaixa(arquivo, associacoes) })),
  { arquivo: "1-joao.wav", associacoes: ambiguas, esperado: v.sugerirIdentidadeFaixa("1-joao.wav", ambiguas) },
  { arquivo: "1-joao.wav", associacoes: [], esperado: v.sugerirIdentidadeFaixa("1-joao.wav", []) },
  { arquivo: "joao.wav", associacoes: [{ nomeOrigem: "joao", participante: "João" }, { nomeOrigem: "joão", participante: "João" }], esperado: v.sugerirIdentidadeFaixa("joao.wav", [{ nomeOrigem: "joao", participante: "João" }, { nomeOrigem: "joão", participante: "João" }]) },
];

const a = { nomeArquivo: "1-joao.wav", tamanhoBytes: 1000, duracaoMilissegundos: 5000 };
const listas = [
  [a, { ...a }, { ...a, nomeArquivo: "outro.wav", tamanhoBytes: 7 }],
  [a, { ...a, nomeArquivo: "1-JOAO.WAV" }],
  [a, { ...a, duracaoMilissegundos: 5001 }],
  [a, { ...a, nomeArquivo: "copia.wav" }],
  [a, { nomeArquivo: "2-maria.wav", tamanhoBytes: 99, duracaoMilissegundos: 123 }],
  [a, { ...a }, { ...a }, { ...a, nomeArquivo: "x.wav" }, { ...a, tamanhoBytes: 2 }],
  [],
];
out.duplicidade = listas.map((arquivosLista) => ({ arquivos: arquivosLista, esperado: v.detectarDuplicidadeArquivos(arquivosLista) }));

out.participantesSemFaixa = [
  { esperados: ["João", "Maria", "Zé"], faixas: ["joao", "ZE"], esperado: v.participantesSemFaixa(["João", "Maria", "Zé"], ["joao", "ZE"]) },
  { esperados: [], faixas: ["x"], esperado: [] },
  { esperados: ["Ana"], faixas: [], esperado: v.participantesSemFaixa(["Ana"], []) },
];
out.participanteParecido = [["Joao", ["João", "Maria"]], ["JOÃO", ["João"]], ["João", ["João"]], ["João", ["Joa\u0303o"]], ["Joao", ["João", "Joao"]], ["Joana", ["João"]], ["Joao", []]]
  .map(([participante, conhecidos]) => ({ participante, conhecidos, esperado: v.localizarParticipanteParecido(participante, conhecidos) }));
out.glossarioEfetivo = [["zé", "Aragorn", "Zé", "Ze", "aragorn"], ["b", "A", "c", "á"], ["á", "b", "A", "c"], [], ["  ", "x", " x "], ["ΑΣ", "ας"]]
  .map((termos) => ({ termos, esperado: v.montarGlossarioEfetivoTranscricao(termos) }));

const faixa = { identificador: "11111111-1111-4111-8111-111111111111", nomeArquivo: "1-joao.wav", participante: "João", identidadeConfirmada: true, deslocamentoMilissegundos: -250, silencioInicialMilissegundos: 1200 };
const base = { campanhaId: 7, sessaoId: 3, idioma: "pt", glossario: [{ campanhaId: 7, termo: "Aragorn" }, { campanhaId: 7, termo: "Zé" }, { campanhaId: 7, termo: "zé" }], faixas: [faixa] };
const entradasPacote = [
  base,
  { ...base, glossario: [{ campanhaId: 8, termo: "Segredo do outro" }] },
  { ...base, faixas: [{ ...faixa, identidadeConfirmada: false }] },
  { ...base, faixas: [] },
  { ...base, idioma: "pt br!" },
  { ...base, idioma: "" },
  { ...base, idioma: "pt-BR" },
  { ...base, faixas: [{ ...faixa, deslocamentoMilissegundos: 1.5 }] },
  { ...base, faixas: [{ ...faixa, deslocamentoMilissegundos: 9007199254740992 }] },
  { ...base, faixas: [faixa, { ...faixa }] },
  { ...base, faixas: [{ ...faixa, silencioInicialMilissegundos: -1 }] },
  { ...base, faixas: [{ ...faixa, silencioInicialMilissegundos: null, participante: "  Ana   Maria " }] },
  { ...base, campanhaId: 0 },
  { ...base, glossario: [{ campanhaId: 7, termo: "linha\nquebra" }] },
  { ...base, faixas: [{ ...faixa, participante: "   " }] },
];
out.pacote = entradasPacote.map((entrada) => ({ entrada, esperado: v.montarPacoteTrabalhoTranscricao(entrada) }));

const destino = path.join(raiz, "src/validators/transcricao-importacao.vetores.json");
fs.writeFileSync(destino, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log("vetores:", Object.entries(out).map(([k, lista]) => `${k}=${lista.length}`).join(" "));
