import { TipoUsuarioEnum } from '@contratados-rpg/shared/enums';
import { BuscaCampanhaFonteEnum } from '@contratados-rpg/shared/enums';
import { describe, expect, it, vi } from 'vitest';

import type { JwtPayload } from '../autenticacao/jwt-payload.interface';
import { PaginaCadernoController } from './pagina-caderno.controller';
import type { PaginaCadernoService } from './pagina-caderno.service';

const usuario: JwtPayload = {
  sub: 7,
  login: 'agente',
  tipo: TipoUsuarioEnum.NORMAL,
  tokenVersao: 1,
};

describe('PaginaCadernoController', () => {
  it('mescla campanha da rota na criação e repassa o usuário ativo', async () => {
    const criarPagina = vi.fn().mockResolvedValue({ id: 9 });
    const controller = new PaginaCadernoController({ criarPagina } as unknown as PaginaCadernoService);

    await controller.criar(3, { campanhaId: 999, titulo: 'Página', conteudoMarkdown: '' }, usuario);

    expect(criarPagina).toHaveBeenCalledWith(
      { campanhaId: 3, titulo: 'Página', conteudoMarkdown: '' },
      usuario,
    );
  });

  it('mescla id da rota na alteração', async () => {
    const alterarPagina = vi.fn().mockResolvedValue({ id: 9 });
    const controller = new PaginaCadernoController({ alterarPagina } as unknown as PaginaCadernoService);

    await controller.alterar(
      9,
      { id: 999, titulo: 'Página', conteudoMarkdown: 'Texto', updatedDate: '2026-08-14T12:00:00.000Z' },
      usuario,
    );

    expect(alterarPagina).toHaveBeenCalledWith(
      { id: 9, titulo: 'Página', conteudoMarkdown: 'Texto', updatedDate: '2026-08-14T12:00:00.000Z' },
      usuario,
    );
  });

  it('mescla campanha e paginação na busca', async () => {
    const buscarCampanha = vi.fn().mockResolvedValue({ itens: [] });
    const controller = new PaginaCadernoController({
      buscarCampanha,
    } as unknown as PaginaCadernoService);

    await controller.buscar(
      3,
      'contenção',
      [BuscaCampanhaFonteEnum.MEU_CADERNO, BuscaCampanhaFonteEnum.MINHAS_FICHAS],
      2,
      10,
      usuario,
    );

    expect(buscarCampanha).toHaveBeenCalledWith(
      {
        campanhaId: 3,
        termo: 'contenção',
        fontes: [BuscaCampanhaFonteEnum.MEU_CADERNO, BuscaCampanhaFonteEnum.MINHAS_FICHAS],
        pagina: 2,
        limite: 10,
      },
      usuario,
    );
  });
});
