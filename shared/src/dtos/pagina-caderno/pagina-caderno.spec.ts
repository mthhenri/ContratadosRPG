import { describe, expect, it } from 'vitest';

import { BuscaCampanhaFonteEnum, BuscaCampanhaResultadoTipoEnum } from '../../enums';
import {
  BUSCA_CAMPANHA_LIMITE_MAXIMO,
  BUSCA_CAMPANHA_TERMO_MAXIMO,
  PAGINA_CADERNO_CONTEUDO_MAXIMO,
  PAGINA_CADERNO_TITULO_MAXIMO,
} from '../../validators';

describe('contratos de página de caderno', () => {
  it('preserva os códigos públicos das fontes e dos tipos de resultado', () => {
    expect(Object.values(BuscaCampanhaFonteEnum)).toEqual([
      'MEU_CADERNO',
      'CADERNOS_JOGADORES',
      'MINHAS_FICHAS',
      'FICHAS_CAMPANHA',
    ]);
    expect(Object.values(BuscaCampanhaResultadoTipoEnum)).toEqual([
      'PAGINA_CADERNO',
      'ANOTACAO_FICHA',
    ]);
  });

  it('expõe os mesmos limites usados pelas três camadas', () => {
    expect({
      titulo: PAGINA_CADERNO_TITULO_MAXIMO,
      conteudo: PAGINA_CADERNO_CONTEUDO_MAXIMO,
      termo: BUSCA_CAMPANHA_TERMO_MAXIMO,
      limite: BUSCA_CAMPANHA_LIMITE_MAXIMO,
    }).toEqual({ titulo: 120, conteudo: 100_000, termo: 200, limite: 50 });
  });
});
