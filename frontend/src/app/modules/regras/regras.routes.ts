import { Routes } from "@angular/router";

export const regrasRoutes: Routes = [
    { path: "", pathMatch: "full", redirectTo: "sistema" },
    ...(["sistema", "guia"] as const).map((livro) => ({
        path: livro,
        data: { livro },
        loadComponent: () => import("./regras.page").then((pagina) => pagina.RegrasPage),
    })),
];
