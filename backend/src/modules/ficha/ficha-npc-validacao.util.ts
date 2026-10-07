import type { FichaNpcDadosDto } from "@contratados-rpg/shared/dtos/ficha";
import type { CarrinhoItemDto } from "@contratados-rpg/shared/regras/compras";
import {
    FragmentoModuloEnum, FragmentoTipoEnum, HabilidadeTipoNpcEnum, ItemCategoriaEnum,
    ModificacaoEfeitoTipoEnum, PatenteEnum,
} from "@contratados-rpg/shared/enums";
import { validarFichaNpc, validarCompetenciasNpc } from "@contratados-rpg/shared/regras/npc";
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

function ehNumeroNaoNegativo(valor: unknown): boolean {
    return typeof valor === "number" && Number.isFinite(valor) && valor >= 0;
}

function ehRegistroSanidade(valor: unknown): boolean {
    return ehObjeto(valor) && ehTexto(valor.nome)
        && (valor.descricao === undefined || ehTexto(valor.descricao));
}

function ehEfeitoModificacao(valor: unknown): boolean {
    return ehObjeto(valor)
        && Object.values(ModificacaoEfeitoTipoEnum)
            .includes(valor.tipo as ModificacaoEfeitoTipoEnum)
        && ["valor", "faces", "duracaoTurnos"].every((campo) => valor[campo] === undefined
            || (typeof valor[campo] === "number" && Number.isFinite(valor[campo])))
        && ["tipoDano", "variante", "condicao", "atributoDt"].every(
            (campo) => valor[campo] === undefined || ehTexto(valor[campo]),
        );
}

function ehModificacaoAplicada(valor: unknown): boolean {
    return ehObjeto(valor) && ehTexto(valor.nome)
        && ehInteiroNaoNegativo(valor.empilhamentos) && (valor.empilhamentos as number) > 0
        && (valor.descricao === undefined || ehTexto(valor.descricao))
        && (valor.efeitos === undefined
            || (Array.isArray(valor.efeitos) && valor.efeitos.every(ehEfeitoModificacao)))
        && (valor.empilhamentoMaximo === undefined
            || (ehInteiroNaoNegativo(valor.empilhamentoMaximo)
                && (valor.empilhamentoMaximo as number) > 0))
        && ["ignoraLimiteTotal", "ignoraLimiteProprio"].every(
            (campo) => valor[campo] === undefined || typeof valor[campo] === "boolean",
        )
        && (valor.pesoCustom === undefined || ehNumeroNaoNegativo(valor.pesoCustom))
        && (valor.itemAlvo === undefined || valor.itemAlvo === null || ehTexto(valor.itemAlvo))
        && (valor.origemFragmento === undefined || (ehObjeto(valor.origemFragmento)
            && Object.values(FragmentoTipoEnum)
                .includes(valor.origemFragmento.tipo as FragmentoTipoEnum)
            && Object.values(FragmentoModuloEnum)
                .includes(valor.origemFragmento.modulo as FragmentoModuloEnum)));
}

/** Estrutura mínima de `CarrinhoItemDto` (shared/regras/compras) — reusado, sem redefinir. */
function ehItemCarrinho(valor: unknown): valor is CarrinhoItemDto {
    return ehObjeto(valor) && ehTexto(valor.nome)
        && Object.values(ItemCategoriaEnum).includes(valor.categoria as ItemCategoriaEnum)
        && ehNumeroNaoNegativo(valor.custo) && ehNumeroNaoNegativo(valor.peso)
        && ehInteiroNaoNegativo(valor.quantidade) && typeof valor.guardada === "boolean"
        && Array.isArray(valor.modificacoes) && valor.modificacoes.every(ehModificacaoAplicada)
        && ["apelido", "descricao", "dano", "informacao", "resistencia", "bonus", "id",
            "containerId"].every((campo) => valor[campo] === undefined || ehTexto(valor[campo]))
        && ["equipado", "recarregada"].every(
            (campo) => valor[campo] === undefined || typeof valor[campo] === "boolean",
        )
        && (valor.categoriaEmprestada === undefined
            || Object.values(ItemCategoriaEnum)
                .includes(valor.categoriaEmprestada as ItemCategoriaEnum))
        && (valor.modulo === undefined
            || Object.values(FragmentoModuloEnum).includes(valor.modulo as FragmentoModuloEnum))
        && (valor.contagemMunicao === undefined || (ehObjeto(valor.contagemMunicao)
            && ehInteiroNaoNegativo(valor.contagemMunicao.atual)
            && ehInteiroNaoNegativo(valor.contagemMunicao.maxima)
            && (valor.contagemMunicao.atual as number) <= (valor.contagemMunicao.maxima as number)
            && ["CENA", "DISPARO"].includes(valor.contagemMunicao.unidade as string)));
}

/** Valida a estrutura REST antes do motor puro; não recalcula snapshots nem duplica Categoria. */
export function validarDadosNpc(dados: FichaNpcDadosDto, criacao = false): void {
    if (!ehObjeto(dados) || !ehObjeto(dados.identidadeNarrativa)
        || !ehTexto(dados.identidadeNarrativa.nome) || !ehTexto(dados.identidadeNarrativa.funcao)
        || !ehObjeto(dados.atributos) || !ehObjeto(dados.energia)
        || !ehObjeto(dados.sanidade) || !Array.isArray(dados.sanidade.sequelas)
        || !Array.isArray(dados.sanidade.traumas) || !Array.isArray(dados.habilidades)
        || !ehObjeto(dados.condutaCombate)
        || !Object.values(dados.condutaCombate).every(ehTexto)
        || !["gatilhosFuga", "prioridadesAlvo", "reacaoFerimentoSevero"]
            .every((campo) => ehTexto(dados.condutaCombate[campo]))
        || (dados.anotacoes !== undefined && !ehTexto(dados.anotacoes))
        || (dados.patenteEquivalente !== undefined
            && !Object.values(PatenteEnum).includes(dados.patenteEquivalente))
        || (dados.inventario !== undefined && !Array.isArray(dados.inventario))) {
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
    if (dados.inventario !== undefined && !dados.inventario.every(ehItemCarrinho)) {
        throw new BusinessException("Item de inventário do NPC inválido");
    }
    const violacoes = [...validarFichaNpc(dados).violacoes];
    if (criacao && violacoes.length === 0) violacoes.push(...validarCompetenciasNpc(dados, true));
    if (violacoes.length > 0) {
        throw new BusinessException("Ficha de NPC viola as regras do jogo", [...violacoes]);
    }
}
