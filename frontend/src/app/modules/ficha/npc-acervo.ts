import type { FichaResumoDto } from "@contratados-rpg/shared/dtos/ficha";
import { TipoFichaEnum } from "@contratados-rpg/shared/enums";
import { obterReferenciaCategoria } from "@contratados-rpg/shared/regras/npc";
import type { ItemAcervo } from "./componentes/cartao-ficha-acervo/cartao-ficha-acervo.component";

/** Projeção de apresentação única para as entradas da ficha; permissões vêm da API. */
export function montarItemNpc(ficha: FichaResumoDto): ItemAcervo {
    return {
        id: ficha.id, tipo: TipoFichaEnum.NPC, nome: ficha.nome, cor: ficha.cor ?? null,
        imagemUrl: ficha.imagemUrl, campanhaId: ficha.campanhaId, campanhaNome: ficha.campanhaNome,
        nivel: ficha.nivel, vidaAtual: ficha.vidaAtual, vidaMaxima: ficha.vidaMaxima,
        energiaAtual: ficha.energiaAtual, energiaMaxima: ficha.energiaMaxima,
        categoriaTexto: ficha.categoria
            ? obterReferenciaCategoria({ categoria: ficha.categoria }).rotulo : undefined,
    };
}
