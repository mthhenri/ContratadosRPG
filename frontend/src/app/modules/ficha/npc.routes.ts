import { Routes } from "@angular/router";
import { npcCriacaoSaidaGuard } from "./npc-criacao.guard";
import { mestreCriacaoNpcCampanhaGuard, npcVisualizacaoSaidaGuard } from "./npc-visualizacao.guard";

/** Literais precedem id; mestre é exigido só na criação, leitura é autorizada pela API. */
export const npcRoutes: Routes = [{
    path: "novo", canActivate: [mestreCriacaoNpcCampanhaGuard],
    canDeactivate: [npcCriacaoSaidaGuard],
    loadComponent: () => import("./paginas/criar-npc/criar-npc.page")
        .then((modulo) => modulo.NpcCriar),
}, {
    path: ":id", canDeactivate: [npcVisualizacaoSaidaGuard],
    loadComponent: () => import("./paginas/visualizar-npc/visualizar-npc.page")
        .then((modulo) => modulo.NpcVisualizar),
}];
