import { Component, input, output, signal } from "@angular/core";
import { Botao } from "../../../../../frontend/src/app/shared/ui/botao/botao.component";
import { Modal } from "../../../../../frontend/src/app/shared/ui/modal/modal.component";
import { Segmentado } from "../../../../../frontend/src/app/shared/ui/segmentado/segmentado.component";
import { SegmentadoItem } from "../../../../../frontend/src/app/shared/ui/segmentado/segmentado-item.component";
import { GuiaFormula } from "../../../../../frontend/src/app/shared/guia-formula/guia-formula.component";

@Component({
  selector: "app-guia-montador-poc",
  imports: [Botao, Modal, Segmentado, SegmentadoItem, GuiaFormula],
  templateUrl: "./guia.html",
  styleUrl: "./guia.scss",
})
export class GuiaMontadorPoc {
  readonly aberto = input.required<boolean>();
  readonly fechar = output<void>();
  readonly pagina = signal("COMEÇAR");
}
