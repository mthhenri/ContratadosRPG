import type {
    FichaAtributosDto, NpcAtributosCriacaoConsultarDto, NpcAtributosCriacaoDto,
} from "../../dtos/ficha";
import { CategoriaNpcEnum } from "../../enums";
import { obterPontosELimitePorCategoria, validarAtributosCategoria } from "./atributos";

/** Guia > NPC > Atributos: base 1 removível até zero, exceções Civil e pontos da Categoria. */
export function consultarAtributosCriacao(
    dto: NpcAtributosCriacaoConsultarDto,
): NpcAtributosCriacaoDto {
    const violacoes = [...validarAtributosCategoria(dto)];
    let distribuidos = 0;
    const atributos = Object.entries(dto.atributos) as [keyof FichaAtributosDto, number][];
    for (const [chave, valor] of atributos) {
        const bloqueado = dto.categoria === CategoriaNpcEnum.CIVIL
            && ((chave === "luta" && !dto.lutaCivilLiberada)
                || (chave === "pontaria" && !dto.pontariaCivilLiberada));
        if (bloqueado && valor !== 0) violacoes.push(`${chave}: Civil inicia em 0 sem liberação`);
        distribuidos += valor - (bloqueado ? 0 : 1);
    }
    const restantes = obterPontosELimitePorCategoria(dto).pontosDistribuir - distribuidos;
    if (restantes !== 0) violacoes.push(restantes > 0
        ? `Distribua os ${restantes} pontos restantes` : "Distribuição excede os pontos da Categoria");
    return { distribuidos, restantes, violacoes };
}
