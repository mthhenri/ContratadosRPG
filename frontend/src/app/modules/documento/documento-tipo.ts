import { TipoDocumentoEnum } from '@contratados-rpg/shared/enums';

import type { IconeNome } from '../../shared/icone/icone.component';

/** Ícone de cada tipo de documento — `anotacoes` para texto, `imagem` para imagem (m9-04). */
export function iconeTipoDocumento(tipo: TipoDocumentoEnum): IconeNome {
  return tipo === TipoDocumentoEnum.IMAGEM ? 'imagem' : 'anotacoes';
}

/** Rótulo curto do tipo, como aparece no cartão da lista e da busca. */
export function rotuloTipoDocumento(tipo: TipoDocumentoEnum): string {
  return tipo === TipoDocumentoEnum.IMAGEM ? 'Imagem' : 'Texto';
}
