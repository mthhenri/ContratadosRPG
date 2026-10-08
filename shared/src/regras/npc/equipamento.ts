import { CategoriaNpcEnum, ItemCategoriaEnum, PatenteEnum } from "../../enums";
import type {
    FichaNpcDadosDto, NpcLimiteModificacoesObterDto, NpcCategoriaConsultarDto,
    NpcDefesasCalcularDto,
} from "../../dtos/ficha";
import { calcularBonusDefesaEquipamento, type DefesaDto } from "../agente";
import { LIMITES_MODIFICACAO, listarModificacoesDisponiveis, verificarConflitoModificacao,
    type CarrinhoItemDto, type LimiteModificacoesDto } from "../compras";

/**
 * Faixa de patentes do agente equivalente a cada Categoria de NPC (Guia de Mestre v4.2.0 —
 * "Patente Equivalente"). O autor decidiu (investigação `npc-ataques-equipamentos`) que o
 * mestre escolhe, por NPC, qual patente da faixa vale — nem piso nem teto fixo por Categoria.
 * Civil não tem patente equivalente (fica abaixo do piso do enum `PatenteEnum`).
 */
export const PATENTES_EQUIVALENTES_POR_CATEGORIA:
    Readonly<Record<CategoriaNpcEnum, readonly PatenteEnum[]>> = {
    [CategoriaNpcEnum.CIVIL]: [],
    [CategoriaNpcEnum.OPERATIVO]: [PatenteEnum.AGENTE, PatenteEnum.OPERADOR],
    [CategoriaNpcEnum.VETERANO]: [PatenteEnum.EXPERIENTE, PatenteEnum.VETERANO],
    [CategoriaNpcEnum.ELITE]: [
        PatenteEnum.FORCA_TAREFA, PatenteEnum.FORCA_TAREFA_ESPECIAL,
        PatenteEnum.OPERACOES_ESPECIAIS,
    ],
    [CategoriaNpcEnum.LENDARIO]: [PatenteEnum.LIDER_OPERACIONAL],
};

/**
 * Categorias de item vetadas à Categoria Civil do NPC — mesma dupla já decidida para o Civil
 * jogador (`civil-guia-criacao`, Sistema v4.1.3 "Equipamento Inicial"), reaplicada aqui por
 * decisão própria do autor para o NPC, não herança de `ClasseEnum`.
 */
export const CATEGORIAS_VETADAS_NPC_CIVIL: readonly ItemCategoriaEnum[] = [
    ItemCategoriaEnum.PROTECOES,
    ItemCategoriaEnum.EXPLOSIVOS,
];

/** Soma o motor de equipamento aos snapshots manuais, sem recalcular nem persistir a base. */
export function calcularDefesasNpc(dados: NpcDefesasCalcularDto): DefesaDto {
    const bonus = calcularBonusDefesaEquipamento(dados.inventario ?? []);
    return {
        defesa: dados.defesaBase + bonus.defesa,
        bloqueio: dados.bloquear + bonus.bloqueio,
        esquiva: dados.esquivar + bonus.esquiva,
    };
}

/** Patentes válidas para a Categoria informada — `[]` para Civil (sem patente equivalente). */
export function listarPatentesEquivalentes(
    dto: NpcCategoriaConsultarDto,
): readonly PatenteEnum[] {
    return PATENTES_EQUIVALENTES_POR_CATEGORIA[dto.categoria];
}

/**
 * Limite de modificações da patente equivalente escolhida — lido direto de `LIMITES_MODIFICACAO`
 * (`shared/regras/compras`), sem passar por `obterLimiteModificacoes`/Prestígio (o NPC não tem
 * Prestígio). Ausência de `patenteEquivalente` devolve `null`: nenhuma modificação permitida até
 * o mestre escolher — nunca assume piso ou teto da faixa silenciosamente.
 */
export function obterLimiteModificacoesNpc(
    dto: NpcLimiteModificacoesObterDto,
): LimiteModificacoesDto | null {
    if (!dto.patenteEquivalente) return null;
    const limite = LIMITES_MODIFICACAO[dto.patenteEquivalente];
    return {
        patente: dto.patenteEquivalente,
        maxEmpilhamentos: limite.maxEmpilhamentos,
        maxModificacoes: limite.maxModificacoes,
    };
}

/**
 * Empilhamentos de modificação de um item — cada empilhamento conta no limite da patente,
 * conforme `LimiteModificacoesDto.maxModificacoes` ("contando cada empilhamento").
 */
export function contarEmpilhamentosModificacoes(item: CarrinhoItemDto): number {
    return item.modificacoes.reduce((total, modificacao) => total + modificacao.empilhamentos, 0);
}

/**
 * Violações do limite de modificação de um item contra a patente equivalente escolhida: sem
 * `patenteEquivalente`, nenhuma modificação é permitida; com ela, cada modificação respeita
 * `maxEmpilhamentos` e o total do item respeita `maxModificacoes`.
 */
function validarLimiteModificacoesItem(
    item: CarrinhoItemDto, limite: LimiteModificacoesDto | null,
): readonly string[] {
    if (item.modificacoes.length === 0) return [];
    if (!limite) {
        return [`inventário: "${item.nome}" tem modificação sem patente equivalente escolhida`];
    }
    const violacoes: string[] = [];
    const definicoes = listarModificacoesDisponiveis(item);
    for (const modificacao of item.modificacoes) {
        const definicao = definicoes.find((entrada) => entrada.nome === modificacao.nome);
        if (definicao && (modificacao.empilhamentos < definicao.empilhamentosIniciais
            || modificacao.empilhamentos > definicao.empilhamentoMaximo)) {
            violacoes.push(`inventário: "${item.nome}" tem empilhamento fora do catálogo (${modificacao.nome})`);
        }
        if (verificarConflitoModificacao({ item, modificacao: modificacao.nome }).bloqueada) {
            violacoes.push(`inventário: "${item.nome}" tem conflito de modificação (${modificacao.nome})`);
        }
    }
    const excedeuEmpilhamento = item.modificacoes.some(
        (modificacao) => modificacao.empilhamentos > limite.maxEmpilhamentos,
    );
    if (excedeuEmpilhamento) {
        violacoes.push(
            `inventário: "${item.nome}" tem modificação acima do empilhamento da patente (${limite.maxEmpilhamentos})`,
        );
    }
    if (contarEmpilhamentosModificacoes(item) > limite.maxModificacoes) {
        violacoes.push(
            `inventário: "${item.nome}" excede o limite de modificações da patente (${limite.maxModificacoes})`,
        );
    }
    return violacoes;
}

/**
 * Coerência de `patenteEquivalente`/`inventario` com a Categoria do NPC. Não reusa
 * `calcularResumoCompras`/`calcularTotaisCarrinho` (gasto, peso, Vontade) — o NPC não tem
 * dinheiro nem orçamento; o mestre atribui equipamento diretamente (Guia — "não é obrigação
 * utilizá-lo ao máximo").
 */
export function validarEquipamentoNpc(dados: FichaNpcDadosDto): readonly string[] {
    const violacoes: string[] = [];
    if (dados.patenteEquivalente !== undefined) {
        if (dados.categoria === CategoriaNpcEnum.CIVIL) {
            violacoes.push("patente equivalente: Categoria Civil não tem patente equivalente");
        } else {
            const faixa = listarPatentesEquivalentes({ categoria: dados.categoria });
            if (!faixa.includes(dados.patenteEquivalente)) {
                violacoes.push("patente equivalente: fora da faixa da Categoria");
            }
        }
    }
    const temItemVetado = dados.inventario?.some(
        (item) => CATEGORIAS_VETADAS_NPC_CIVIL.includes(item.categoria),
    );
    if (dados.categoria === CategoriaNpcEnum.CIVIL && temItemVetado) {
        violacoes.push("inventário: Categoria Civil não pode ter Proteções ou Explosivos");
    }
    const limite = obterLimiteModificacoesNpc({ patenteEquivalente: dados.patenteEquivalente });
    dados.inventario?.forEach(
        (item) => violacoes.push(...validarLimiteModificacoesItem(item, limite)),
    );
    return violacoes;
}
