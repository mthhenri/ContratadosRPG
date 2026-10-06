import { CategoriaNpcEnum } from "../../enums";
import type { FichaNpcDadosDto, FichaNpcValidadaDto } from "../../dtos/ficha";
import { validarAtributosCategoria } from "./atributos";
import { validarVolumeHabilidades } from "./habilidades";
import { validarCompetenciasNpc, validarAjustesTesteNpc } from "./testes";

/**
 * Coerência conforme o guia de mestre — NPC > Categoria/Nível/Cooperação/Atributos/Volume.
 * Não recalcula snapshots editados, limita recursos atuais nem aplica efeitos de Sanidade.
 * Não exige faixa de Nível sugerida ou marcador para a exceção Civil autorizada pelo mestre.
 * Validação estrutural e permissões pertencem à integração de backend (m4-07).
 */
export function validarFichaNpc(dados: FichaNpcDadosDto): FichaNpcValidadaDto {
    if (!Object.values(CategoriaNpcEnum).includes(dados.categoria)) {
        return { violacoes: ["categoria: valor inválido"] };
    }
    const violacoes = [
        ...validarAtributosCategoria({ categoria: dados.categoria, atributos: dados.atributos }),
        ...validarVolumeHabilidades({ categoria: dados.categoria, habilidades: dados.habilidades }),
        ...validarCompetenciasNpc(dados),
        ...validarAjustesTesteNpc(dados),
    ];
    if (!Number.isInteger(dados.nivel) || dados.nivel < 0 || dados.nivel > 20) {
        violacoes.push("nível: deve ser inteiro entre 0 e 20");
    }
    if (!Number.isInteger(dados.cooperacao) || dados.cooperacao < 0 || dados.cooperacao > 10) {
        violacoes.push("cooperação: deve ser inteiro entre 0 e 10");
    }
    return { violacoes };
}
