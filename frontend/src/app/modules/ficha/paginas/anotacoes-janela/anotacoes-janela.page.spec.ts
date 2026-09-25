import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaAlteradaDto } from '@contratados-rpg/shared/dtos/ficha';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { AnotacoesFichaEditor } from '../../componentes/anotacoes-ficha-editor/anotacoes-ficha-editor.component';
import { FichaService } from '../../ficha.service';
import { AnotacoesJanela } from './anotacoes-janela.page';

const USUARIO_ATIVO = 5;

function ficha(sobrescrever: { usuarioId?: number; anotacoes?: string; vidaAtual?: number } = {}) {
  return {
    id: 42,
    campanhaId: 8,
    usuarioId: sobrescrever.usuarioId ?? USUARIO_ATIVO,
    nome: 'Corvo',
    cor: null,
    imagemUrl: null,
    imagemFoco: null,
    oculta: false,
    dados: {
      anotacoes: sobrescrever.anotacoes ?? 'Vista no cais.',
      estado: { vidaAtual: sobrescrever.vidaAtual ?? 10 },
    },
  } as unknown as FichaAlteradaDto;
}

function membro(usuarioId: number, papel: TipoCampanhaMembroPapelEnum): CampanhaMembroResumoDto {
  return { usuarioId, papel } as CampanhaMembroResumoDto;
}

/** Dono ou mestre editam; o resto vê acesso negado; o save da janela respeita o remoto (m3-17). */
describe('AnotacoesJanela', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function montar(opcoes: {
    tipo?: string | null;
    documento?: FichaAlteradaDto;
    falhar?: boolean;
    membros?: CampanhaMembroResumoDto[];
  } = {}) {
    const fichaAlterada$ = new Subject<FichaAlteradaDto>();
    const documento = opcoes.documento ?? ficha();
    // Estado "do servidor": o eco dispara nova busca pelo REST, que devolve o que estiver aqui.
    const servidor = { atual: documento };
    const recuperar = vi.fn(() =>
      opcoes.falhar ? throwError(() => new Error('403')) : of(servidor.atual),
    );
    const fichaService = {
      recuperarFicha: recuperar,
      recuperarFichaCriatura: recuperar,
      alterarFicha: vi.fn((_id: number, dto: object) => of({ ...documento, ...dto })),
      alterarFichaCriatura: vi.fn((_id: number, dto: object) => of({ ...documento, ...dto })),
    };
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      reconexao: signal(0),
    };
    TestBed.configureTestingModule({
      imports: [AnotacoesJanela],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => '42' },
              queryParamMap: { get: (chave: string) => (chave === 'tipo' ? opcoes.tipo ?? null : null) },
            },
          },
        },
        { provide: FichaService, useValue: fichaService },
        {
          provide: CampanhaService,
          useValue: { listarMembros: vi.fn(() => of(opcoes.membros ?? [])) },
        },
        { provide: SessaoService, useValue: { usuario: signal({ id: USUARIO_ATIVO }) } },
        { provide: TempoRealService, useValue: tempoReal },
      ],
    });
    const fixture = TestBed.createComponent(AnotacoesJanela);
    fixture.detectChanges();
    const editor = () =>
      fixture.debugElement.query(By.css('app-anotacoes-ficha-editor'))
        ?.componentInstance as AnotacoesFichaEditor | undefined;
    return { fixture, fichaService, tempoReal, fichaAlterada$, editor, servidor };
  }

  it('dono vê as anotações, o contexto e entra na sala da ficha', () => {
    const { fixture, editor, tempoReal } = montar();
    const raiz = fixture.nativeElement as HTMLElement;

    expect(editor()?.valor()).toBe('Vista no cais.');
    expect(raiz.textContent).toContain('Anotações de Corvo');
    expect(tempoReal.entrarSalaFicha).toHaveBeenCalledWith(42);
    const voltar = raiz.querySelector('a[app-botao]') as HTMLAnchorElement;
    expect(voltar.textContent?.trim()).toBe('Voltar à ficha');
    expect(voltar.getAttribute('href')).toBe('/fichas/42');
  });

  it('mestre da campanha edita a ficha de outro jogador', () => {
    const { editor } = montar({
      documento: ficha({ usuarioId: 9 }),
      membros: [membro(USUARIO_ATIVO, TipoCampanhaMembroPapelEnum.MESTRE)],
    });

    expect(editor()).toBeDefined();
  });

  it('outro jogador (mesmo com a ficha legível) recebe acesso negado, sem conteúdo', () => {
    const { fixture, editor, tempoReal } = montar({
      documento: ficha({ usuarioId: 9 }),
      membros: [membro(USUARIO_ATIVO, TipoCampanhaMembroPapelEnum.JOGADOR)],
    });
    const raiz = fixture.nativeElement as HTMLElement;

    expect(editor()).toBeUndefined();
    expect(raiz.textContent).toContain('Não foi possível acessar as anotações desta ficha.');
    expect(raiz.textContent).not.toContain('Vista no cais.');
    expect(tempoReal.entrarSalaFicha).not.toHaveBeenCalled();
  });

  it('REST negado (espectador, sem acesso) mostra acesso negado', () => {
    const { fixture, editor } = montar({ falhar: true });

    expect(editor()).toBeUndefined();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Não foi possível acessar as anotações desta ficha.',
    );
  });

  it('ao receber o eco (sem anotações) busca o documento completo e mostra o texto novo', () => {
    const { fixture, editor, fichaAlterada$, fichaService, servidor } = montar();
    servidor.atual = ficha({ anotacoes: 'Escrito na aba principal.' });

    // Payload real do broadcast: sem `anotacoes` (omitida para a sala inteira).
    const eco = ficha();
    delete (eco.dados as { anotacoes?: string }).anotacoes;
    fichaAlterada$.next(eco);
    fixture.detectChanges();

    expect(fichaService.recuperarFicha).toHaveBeenCalledTimes(2);
    expect(editor()?.valor()).toBe('Escrito na aba principal.');
  });

  it('salvar na janela preserva a Vida alterada na aba principal durante o debounce', () => {
    vi.useFakeTimers();
    const { fixture, editor, fichaService, fichaAlterada$, servidor } = montar();

    editor()!.salvar.emit('Anotado na janela.');
    servidor.atual = ficha({ vidaAtual: 3 });
    fichaAlterada$.next(ficha({ vidaAtual: 3 }));
    fixture.detectChanges();
    vi.advanceTimersByTime(500);

    expect(fichaService.alterarFicha).toHaveBeenCalledTimes(1);
    const [id, dto] = fichaService.alterarFicha.mock.calls[0] as unknown as [
      number,
      { dados: { anotacoes: string; estado: { vidaAtual: number } } },
    ];
    expect(id).toBe(42);
    expect(dto.dados.anotacoes).toBe('Anotado na janela.');
    expect(dto.dados.estado.vidaAtual).toBe(3);
  });

  it('criatura busca pela rota de criatura, volta à ficha dela e salva pelo serviço dela', () => {
    vi.useFakeTimers();
    const { fixture, editor, fichaService } = montar({ tipo: 'criatura' });

    expect(fichaService.recuperarFichaCriatura).toHaveBeenCalledWith(42);
    const voltar = (fixture.nativeElement as HTMLElement).querySelector('a[app-botao]');
    expect(voltar?.getAttribute('href')).toBe('/fichas/criatura/42');

    editor()!.salvar.emit('Rastro no cais.');
    vi.advanceTimersByTime(500);

    expect(fichaService.alterarFichaCriatura).toHaveBeenCalledTimes(1);
    expect(fichaService.alterarFicha).not.toHaveBeenCalled();
  });
});
