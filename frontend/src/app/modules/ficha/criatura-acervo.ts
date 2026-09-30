import type { FichaResumoDto } from "@contratados-rpg/shared/dtos/ficha";
import { TipoFichaEnum } from "@contratados-rpg/shared/enums";
import type { ItemAcervo } from "./componentes/cartao-ficha-acervo/cartao-ficha-acervo.component";
import { nomePorte, rotuloComportamento, rotuloNivelAmeaca } from "./rotulos-criatura";

/** Mesmo recorte de apresentação no acervo e na listagem autorizada da campanha. */
export function montarItemCriatura(ficha: FichaResumoDto): ItemAcervo {
    return {
        id: ficha.id, tipo: TipoFichaEnum.CRIATURA, nome: ficha.nome, cor: ficha.cor ?? null,
        imagemUrl: ficha.imagemUrl, campanhaId: ficha.campanhaId, campanhaNome: ficha.campanhaNome,
        vidaAtual: ficha.vidaAtual, vidaMaxima: ficha.vidaMaxima, defesa: ficha.defesa,
        naTexto: ficha.na ? rotuloNivelAmeaca(ficha.na) : undefined, vd: ficha.vd,
        registroTexto: ficha.registro?.trim() || "SCP - ?????",
        classificacaoTexto: [ficha.porte ? nomePorte(ficha.porte) : null,
            ficha.comportamento ? rotuloComportamento(ficha.comportamento) : null]
            .filter(Boolean).join(" · "),
    };
}
