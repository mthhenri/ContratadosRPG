import { TestBed } from '@angular/core/testing';
import { TipoPaginaCadernoEnum } from '@contratados-rpg/shared/enums';
import { Subject, of } from 'rxjs';
import * as Y from 'yjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TempoRealService } from '../../core/services/tempo-real.service';
import { CadernoEsquadraoColaborativoService } from './caderno-esquadrao-colaborativo.service';
import { PaginaCadernoService } from './pagina-caderno.service';

describe('CadernoEsquadraoColaborativoService', () => {
  const pagina = {
    id: 31,
    campanhaId: 3,
    usuarioAutorId: null,
    autorNome: null,
    tipo: TipoPaginaCadernoEnum.ESQUADRAO,
    titulo: 'Plano',
    conteudoMarkdown: 'Ponto de encontro',
    somenteLeitura: false,
    createdDate: '2026-08-27T12:00:00.000Z',
    updatedDate: '2026-08-27T12:00:00.000Z',
  };
  let servico: CadernoEsquadraoColaborativoService;
  let api: { recuperarEstadoPaginaEsquadrao: ReturnType<typeof vi.fn>; alterarPaginaEsquadrao: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    const documento = new Y.Doc();
    documento.getText('titulo').insert(0, pagina.titulo);
    const estado = btoa(String.fromCharCode(...Y.encodeStateAsUpdate(documento)));
    api = {
      recuperarEstadoPaginaEsquadrao: vi.fn(() => of({ pagina, estado })),
      alterarPaginaEsquadrao: vi.fn(() => of({ campanhaId: 3, paginaId: 31, atualizacao: estado, pagina })),
    };
    TestBed.configureTestingModule({
      providers: [
        CadernoEsquadraoColaborativoService,
        { provide: PaginaCadernoService, useValue: api },
        {
          provide: TempoRealService,
          useValue: {
            paginaEsquadraoAtualizada$: new Subject(),
            paginaEsquadraoExcluida$: new Subject(),
            conectar: vi.fn(),
            entrarSalaCampanha: vi.fn(),
          },
        },
      ],
    });
    servico = TestBed.inject(CadernoEsquadraoColaborativoService);
  });

  afterEach(() => vi.useRealTimers());

  it('envia um delta CRDT ao alterar o título, sem substituir o documento', () => {
    servico.abrir(31);
    servico.definirConteudoMarkdown('Ponto de encontro');
    servico.definirTitulo('Plano revisado');
    vi.advanceTimersByTime(180);

    expect(api.alterarPaginaEsquadrao).toHaveBeenCalledWith(
      31,
      expect.objectContaining({ titulo: 'Plano revisado', conteudoMarkdown: 'Ponto de encontro' }),
    );
    expect(servico.documento()?.getText('titulo').toString()).toBe('Plano revisado');
  });
});
