import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TipoCampanhaMembroPapelEnum, TipoPaginaCadernoEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { PaginaCadernoDto } from '@contratados-rpg/shared/dtos/pagina-caderno';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { EDITOR_MARKDOWN_FACTORY } from '../../../../shared/ui/editor-markdown/editor-markdown.component';
import { CampanhaService } from '../../../campanha/campanha.service';
import { PaginaCadernoService } from '../../pagina-caderno.service';
import { CadernoJanela } from './caderno-janela.page';

const USUARIO_ATIVO = 5;

const pagina: PaginaCadernoDto = {
  id: 11,
  campanhaId: 8,
  usuarioAutorId: USUARIO_ATIVO,
  autorNome: 'Lia',
  tipo: TipoPaginaCadernoEnum.PRIVADA,
  titulo: 'Primeira sessão',
  conteudoMarkdown: 'Uma pista',
  somenteLeitura: false,
  createdDate: '2026-08-10T10:00:00.000Z',
  updatedDate: '2026-08-10T10:00:00.000Z',
};

function membro(usuarioId: number, papel: TipoCampanhaMembroPapelEnum): CampanhaMembroResumoDto {
  return { usuarioId, papel, nome: `Membro ${usuarioId}` } as CampanhaMembroResumoDto;
}

/** Mestre e jogador usam o caderno na janela; espectador e não membro veem acesso negado. */
describe('CadernoJanela', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  function montar(opcoes: { membros?: CampanhaMembroResumoDto[]; falhar?: boolean } = {}) {
    const campanhaService = {
      recuperarCampanha: vi.fn(() =>
        opcoes.falhar
          ? throwError(() => new Error('403'))
          : of({ id: 8, nome: 'Operação Eclipse' }),
      ),
      listarMembros: vi.fn(() =>
        of(opcoes.membros ?? [membro(USUARIO_ATIVO, TipoCampanhaMembroPapelEnum.JOGADOR)]),
      ),
    };
    const api = {
      listarPaginas: vi.fn(() => of([{ ...pagina, conteudoMarkdown: undefined }])),
      recuperarPagina: vi.fn(() => of(pagina)),
      alterarPagina: vi.fn(() => of(pagina)),
      criarPagina: vi.fn(() => of(pagina)),
      listarPaginasEsquadrao: vi.fn(() => of([])),
      buscarCampanha: vi.fn(() => of({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 })),
    };
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      paginaEsquadraoCriada$: new Subject(),
      paginaEsquadraoAlterada$: new Subject(),
      paginaEsquadraoExcluida$: new Subject(),
      presencaEsquadraoCaderno$: new Subject(),
      enviarPresencaEsquadrao: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [CadernoJanela],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['campanhaId', '8']]) } },
        },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: PaginaCadernoService, useValue: api },
        { provide: TempoRealService, useValue: tempoReal },
        {
          provide: SessaoService,
          useValue: { usuario: () => ({ id: USUARIO_ATIVO, nome: 'Lia' }) },
        },
        {
          provide: EDITOR_MARKDOWN_FACTORY,
          useValue: () => ({
            criar: () => Promise.resolve(),
            destruir: vi.fn(),
            obterMarkdown: () => '',
            definirMarkdown: vi.fn(),
            definirSomenteLeitura: vi.fn(),
            aplicarAcao: vi.fn(),
            definirMargemInferiorRolagem: vi.fn(),
          }),
        },
      ],
    });
    const fixture = TestBed.createComponent(CadernoJanela);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { fixture, raiz, api, tempoReal, campanhaService };
  }

  it('jogador abre o próprio caderno com o nome da campanha e entra na sala da campanha', () => {
    const { raiz, api, tempoReal } = montar();

    expect(raiz.querySelector('.janela-externa-cabecalho__contexto')?.textContent).toContain(
      'Caderno · Operação Eclipse',
    );
    expect(api.listarPaginas).toHaveBeenCalledWith(8);
    expect(raiz.querySelector('[data-pagina-id="11"]')).not.toBeNull();
    expect(raiz.querySelector('[aria-label="Selecionar cadernos dos jogadores"]')).toBeNull();
    expect(tempoReal.conectar).toHaveBeenCalled();
    expect(tempoReal.entrarSalaCampanha).toHaveBeenCalledWith(8);
  });

  it('mestre vê também os cadernos dos jogadores', () => {
    const { raiz } = montar({
      membros: [
        membro(USUARIO_ATIVO, TipoCampanhaMembroPapelEnum.MESTRE),
        membro(9, TipoCampanhaMembroPapelEnum.JOGADOR),
      ],
    });

    expect(raiz.querySelector('[aria-label="Selecionar cadernos dos jogadores"]')).not.toBeNull();
  });

  it('espectador recebe acesso negado sem conteúdo nem sala', () => {
    const { raiz, api, tempoReal } = montar({
      membros: [membro(USUARIO_ATIVO, TipoCampanhaMembroPapelEnum.ESPECTADOR)],
    });

    expect(raiz.textContent).toContain('Não foi possível acessar o caderno desta campanha.');
    expect(raiz.querySelector('app-caderno-conteudo')).toBeNull();
    expect(api.listarPaginas).not.toHaveBeenCalled();
    expect(tempoReal.entrarSalaCampanha).not.toHaveBeenCalled();
  });

  it('REST negado (ou não membro) mostra acesso negado', () => {
    const { raiz } = montar({ falhar: true });
    expect(raiz.textContent).toContain('Não foi possível acessar o caderno desta campanha.');

    TestBed.resetTestingModule();
    const semVinculo = montar({ membros: [membro(99, TipoCampanhaMembroPapelEnum.JOGADOR)] });
    expect(semVinculo.raiz.querySelector('app-caderno-conteudo')).toBeNull();
  });

  it('pede confirmação ao fechar com rascunho não salvo e sai da sala ao ser destruída', () => {
    const { fixture, raiz, tempoReal } = montar();
    (raiz.querySelector('[aria-label="Criar página"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    const conteudo = raiz.querySelector<HTMLElement>('[aria-label="Título da página"]');
    expect(conteudo).not.toBeNull();
    fixture.componentInstance['store'].alterarRascunho({ titulo: '', conteudoMarkdown: 'x' });

    const evento = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);

    fixture.destroy();
    expect(tempoReal.sairSalaCampanha).toHaveBeenCalledWith(8);
  });

  it('resultado "Ficha" da busca abre as anotações numa aba nova', () => {
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const { fixture } = montar();

    fixture.componentInstance['abrirFicha'](44);

    expect(abrir).toHaveBeenCalledWith('/campanhas/8/ficha/44#anotacoes', '_blank', 'noopener');
  });
});
