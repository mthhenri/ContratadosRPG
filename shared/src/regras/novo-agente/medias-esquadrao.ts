import type {
  FichaMediasEsquadraoCalcularDto,
  FichaMediasEsquadraoDto,
} from "../../dtos/ficha";

/**
 * sistema-v4.1.5.md, “Iniciando um Novo Agente”: médias do conjunto autorizado.
 * Preserva o AVG anterior: nulos não entram no divisor; zero entra. O arredondamento
 * e as reduções continuam nas funções canônicas de Nível/Prestígio inicial.
 */
export function calcularMediasEsquadrao(dto: FichaMediasEsquadraoCalcularDto): FichaMediasEsquadraoDto {
  let somaNivel = 0;
  let quantidadeNivel = 0;
  let somaPrestigio = 0;
  let quantidadePrestigio = 0;
  for (const ficha of dto.fichas) {
    if (ficha.nivel != null) {
      somaNivel += ficha.nivel;
      quantidadeNivel++;
    }
    if (ficha.prestigio != null) {
      somaPrestigio += ficha.prestigio;
      quantidadePrestigio++;
    }
  }
  return {
    mediaNivel: quantidadeNivel === 0 ? 0 : somaNivel / quantidadeNivel,
    mediaPrestigio: quantidadePrestigio === 0 ? 0 : somaPrestigio / quantidadePrestigio,
    quantidade: dto.fichas.length,
  };
}
