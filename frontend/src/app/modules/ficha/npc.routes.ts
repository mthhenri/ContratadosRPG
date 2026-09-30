import { Routes } from "@angular/router";
import { npcCriacaoSaidaGuard } from "./npc-criacao.guard";

/** A criação é dedicada; a consulta de NPC chega em m4-08b. */
export const npcRoutes: Routes = [{
    path: "novo", canDeactivate: [npcCriacaoSaidaGuard],
    loadComponent: () => import("./paginas/criar-npc/criar-npc.page")
        .then((modulo) => modulo.NpcCriar),
}];
