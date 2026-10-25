import type {
  LivroPecaDto,
  LivroVersaoConteudoDto,
} from "@contratados-rpg/shared/dtos/livro";
import { validarArvoreLivro } from "@contratados-rpg/shared/livro";

/** Converte destinos congelados em identidades estáveis editáveis na Oficina. */
export function adaptarFotografiaTrabalho(
  conteudo: LivroVersaoConteudoDto,
): LivroVersaoConteudoDto {
  const destinos = new Map<string, string>();
  const percorrer = (pecas: readonly LivroPecaDto[]): void => {
    for (const peca of pecas) {
      if (peca.ancora) destinos.set(peca.ancora, peca.identificador);
      percorrer(peca.filhos);
    }
  };
  percorrer(conteudo.pecas);
  const adaptar = (valor: unknown): unknown => {
    if (Array.isArray(valor)) return valor.map(adaptar);
    if (!valor || typeof valor !== "object") return valor;
    const registro = valor as Record<string, unknown>;
    if (registro.tipo === "link-interno") {
      const original =
        typeof registro.ancora === "string" ? registro.ancora : "";
      const ancora = conteudo.ancorasAntigas?.[original] ?? original;
      const identificador = destinos.get(ancora);
      if (!identificador)
        throw new Error(`Link interno sem destino: ${original}.`);
      if (registro.identificador && registro.identificador !== identificador)
        throw new Error("Identidade de link divergente da âncora.");
      return { ...registro, identificador, ancora };
    }
    return Object.fromEntries(
      Object.entries(registro).map(([chave, item]) => [chave, adaptar(item)]),
    );
  };
  const trabalho = adaptar(conteudo) as LivroVersaoConteudoDto;
  const pendencias = validarArvoreLivro({
    pecas: trabalho.pecas,
    modo: "trabalho",
  });
  if (pendencias.length)
    throw new Error(
      `Trabalho inválido: ${pendencias.map((item) => item.mensagem).join("; ")}`,
    );
  return trabalho;
}
