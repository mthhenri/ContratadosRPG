import type { PipeTransform } from '@nestjs/common';
import { BuscaCampanhaFonteEnum } from '@contratados-rpg/shared/enums';

/** Normaliza uma query CSV/repetida; códigos e permissões são validados pela service. */
export class BuscaCampanhaFontesPipe
  implements PipeTransform<string | string[] | undefined, BuscaCampanhaFonteEnum[] | undefined>
{
  transform(valor: string | string[] | undefined): BuscaCampanhaFonteEnum[] | undefined {
    if (valor === undefined) {
      return undefined;
    }
    const valores = Array.isArray(valor) ? valor : [valor];
    return valores
      .flatMap((item) => item.split(','))
      .map((item) => item.trim())
      .filter((item) => item.length > 0) as BuscaCampanhaFonteEnum[];
  }
}
