import { Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";

import { Marca } from "../../marca/marca.component";
import { Botao } from "../botao/botao.component";

/** Cabeçalho compacto das rotas isoladas abertas em outra janela. */
@Component({
  selector: "app-janela-externa-cabecalho",
  imports: [Marca, RouterLink, Botao],
  templateUrl: "./janela-externa-cabecalho.component.html",
  styleUrl: "./janela-externa-cabecalho.component.scss",
})
export class JanelaExternaCabecalho {
  readonly contexto = input.required<string>();
  readonly voltarPara = input.required<string>();
  readonly rotuloVoltar = input.required<string>();
  protected fechar(): void {
    window.close();
  }
}
