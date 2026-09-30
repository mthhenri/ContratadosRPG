import type { FichaNpcDadosDto } from "@contratados-rpg/shared/dtos/ficha";
import { HabilidadeTipoNpcEnum } from "@contratados-rpg/shared/enums";
import { validarFichaNpc } from "@contratados-rpg/shared/regras/npc";
import { BusinessException } from "../../core/exceptions";

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
    return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function ehTexto(valor: unknown): valor is string {
    return typeof valor === "string";
}

function ehInteiroNaoNegativo(valor: unknown): boolean {
    return Number.isInteger(valor) && (valor as number) >= 0;
}

function ehRegistroSanidade(valor: unknown): boolean {
    return ehObjeto(valor) && ehTexto(valor.nome)
        && (valor.descricao === undefined || ehTexto(valor.descricao));
}

/** Valida a estrutura REST antes do motor puro; não recalcula snapshots nem duplica Categoria. */
export function validarDadosNpc(dados: FichaNpcDadosDto): void {
    if (!ehObjeto(dados) || !ehObjeto(dados.identidadeNarrativa)
        || !ehTexto(dados.identidadeNarrativa.nome) || !ehTexto(dados.identidadeNarrativa.funcao)
        || !ehObjeto(dados.atributos) || !ehObjeto(dados.energia)
        || !ehObjeto(dados.sanidade) || !Array.isArray(dados.sanidade.sequelas)
        || !Array.isArray(dados.sanidade.traumas) || !Array.isArray(dados.habilidades)
        || !ehObjeto(dados.condutaCombate)
        || !Object.values(dados.condutaCombate).every(ehTexto)
        || !["gatilhosFuga", "prioridadesAlvo", "reacaoFerimentoSevero"]
            .every((campo) => ehTexto(dados.condutaCombate[campo]))
        || (dados.anotacoes !== undefined && !ehTexto(dados.anotacoes))) {
        throw new BusinessException("Documento de NPC inválido");
    }
    if (!dados.sanidade.sequelas.every(ehRegistroSanidade)
        || !dados.sanidade.traumas.every((trauma: unknown) => ehObjeto(trauma)
            && ehRegistroSanidade(trauma) && typeof trauma.tratado === "boolean")) {
        throw new BusinessException("Registros de Sanidade do NPC inválidos");
    }
    if (![dados.vidaMaxima, dados.defesaBase, dados.bloquear, dados.esquivar,
        dados.energia.maxima].every(ehInteiroNaoNegativo)
        || !Number.isInteger(dados.vidaAtual) || !Number.isInteger(dados.energia.atual)
        || (dados.energia.recargaPorTurno !== null
            && !ehInteiroNaoNegativo(dados.energia.recargaPorTurno))
        || (dados.condicoes !== undefined && (!ehObjeto(dados.condicoes)
            || typeof dados.condicoes.morrendo !== "boolean"))) {
        throw new BusinessException("Recursos ou condições do NPC inválidos");
    }
    for (const habilidade of dados.habilidades) {
        if (!ehObjeto(habilidade) || !ehTexto(habilidade.nomeNeutro)
            || !ehTexto(habilidade.descricao)
            || (habilidade.nomeNarrativo !== undefined && !ehTexto(habilidade.nomeNarrativo))
            || (habilidade.restricao !== undefined && habilidade.restricao !== null
                && !ehTexto(habilidade.restricao))
            || (habilidade.tipo === HabilidadeTipoNpcEnum.ATIVA
                && habilidade.custoEnergia !== null
                && !ehInteiroNaoNegativo(habilidade.custoEnergia))
            || (habilidade.custoEnergia !== undefined && habilidade.custoEnergia !== null
                && !ehInteiroNaoNegativo(habilidade.custoEnergia))) {
            throw new BusinessException("Habilidade do NPC inválida");
        }
    }
    const { violacoes } = validarFichaNpc(dados);
    if (violacoes.length > 0) {
        throw new BusinessException("Ficha de NPC viola as regras do jogo", [...violacoes]);
    }
}
