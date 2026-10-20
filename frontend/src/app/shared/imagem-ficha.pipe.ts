import { Pipe, PipeTransform, inject } from "@angular/core";
import type { Observable } from "rxjs";
import { ImagemFichaService } from "../core/services/imagem-ficha.service";

@Pipe({ name: "imagemFicha", standalone: true })
export class ImagemFichaPipe implements PipeTransform {
  private readonly imagens = inject(ImagemFichaService);

  transform(url: string | null | undefined): Observable<string | null> {
    return this.imagens.observarImagem(url);
  }
}
