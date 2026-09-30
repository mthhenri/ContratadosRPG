import { CanActivateFn, CanDeactivateFn } from "@angular/router";
import { mestreCampanhaGuard } from "../../core/guards/mestre-campanha.guard";
import type { NpcVisualizar } from "./paginas/visualizar-npc/visualizar-npc.page";

/** Reusa a guarda existente no segmento que contém campanhaId, apenas para criação. */
export const mestreCriacaoNpcCampanhaGuard: CanActivateFn = (rota, estado) =>
    mestreCampanhaGuard(rota.pathFromRoot.find((item) =>
        item.paramMap.get("campanhaId") !== null) ?? rota, estado);

export const npcVisualizacaoSaidaGuard: CanDeactivateFn<NpcVisualizar> =
    (pagina) => pagina.podeSair();
