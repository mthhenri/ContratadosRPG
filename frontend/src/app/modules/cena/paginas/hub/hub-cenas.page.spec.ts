import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import type { CenaAlteradaDto, CenaResumoDto } from '@contratados-rpg/shared/dtos/cena';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import {
  CenaStatusEnum,
  CenaTipoEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { CenaService } from '../../cena.service';
import { HubCenas } from './hub-cenas.page';

/**
 * Prova o hub de cenas (m7-23): os três blocos na ordem que o backend devolve, o tipo como chip em
 * toda cena, os controles de condução só para o mestre (abrir, reordenar, encerrar, "Nova cena") e
 * o tempo real — qualquer `cena:alterada` da campanha refaz a lista, e o recorte do jogador
 * continua sendo do backend (o dublê de jogador simplesmente não devolve planejadas).
 */
describe('HubCenas', () => {
  const CAMPANHA_ID = 9;
  const MESTRE = 1;
  const JOGADOR = 7;

  const cena = (
    id: number,
    nome: string,
    status: CenaStatusEnum,
    tipo: CenaTipoEnum = CenaTipoEnum.COMBATE,
  ): CenaResumoDto => ({ id, nome, tipo, status, temEncontro: tipo === CenaTipoEnum.COMBATE });

  const ativa = cena(1, 'Contenção no Setor 12', CenaStatusEnum.ATIVA);
  const planejadaA = cena(2, 'Galpão 7', CenaStatusEnum.PLANEJADA, CenaTipoEnum.INVESTIGACAO);
  const planejadaB = cena(3, 'Fuga pelos túneis', CenaStatusEnum.PLANEJADA, CenaTipoEnum.PERSEGUICAO);
  const encerrada = cena(4, 'Emboscada no Setor 4', CenaStatusEnum.ENCERRADA, CenaTipoEnum.FURTIVA);
  const listaDoMestre = [ativa, planejadaA, planejadaB, encerrada];

  const membros: CampanhaMembroResumoDto[] = [
    { usuarioId: MESTRE, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] as never },
    { usuarioId: JOGADOR, nome: 'Bia', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] as never },
  ];

  interface Opcoes {
    readonly usuarioId?: number;
    readonly cenas?: readonly CenaResumoDto[];
    readonly nova?: boolean;
  }

  function montar(opcoes: Opcoes = {}) {
    const { usuarioId = MESTRE, cenas = listaDoMestre, nova = false } = opcoes;
    const cenaAlterada$ = new Subject<CenaAlteradaDto>();
    const cenaService = {
      listarPorCampanha: vi.fn(() => of([...cenas])),
      reordenarCenas: vi.fn((_campanhaId: number, ordem: readonly number[]) =>
        of([
          ativa,
          ...ordem.map((id) => [planejadaA, planejadaB].find((item) => item.id === id)!),
          encerrada,
        ]),
      ),
      abrirCena: vi.fn(() => of({ ...planejadaA, campanhaId: CAMPANHA_ID, encontro: null })),
      encerrarCena: vi.fn(() => of({ ...ativa, campanhaId: CAMPANHA_ID, encontro: null })),
      criarCena: vi.fn(),
    };
    const reconexao$ = new Subject<void>();
    const tempoReal = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      reconexao: signal(0),
      reconexao$: reconexao$.asObservable(),
      cenaAlterada$,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CenaService, useValue: cenaService },
        {
          provide: CampanhaService,
          useValue: {
            recuperarCampanha: vi.fn(() => of({ id: CAMPANHA_ID, nome: 'Campanha de Teste' })),
            listarMembros: vi.fn(() => of(membros)),
          },
        },
        { provide: SessaoService, useValue: { usuario: () => ({ id: usuarioId }) } },
        { provide: TempoRealService, useValue: tempoReal },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ campanhaId: String(CAMPANHA_ID) }),
              queryParamMap: convertToParamMap(nova ? { nova: '1' } : {}),
            },
          },
        },
      ],
    });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(HubCenas);
    fixture.detectChanges();
    const raiz = fixture.nativeElement as HTMLElement;
    return { fixture, raiz, cenaService, tempoReal, cenaAlterada$, reconexao$, navegar };
  }

  const texto = (elemento: Element | null | undefined): string =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const bloco = (raiz: HTMLElement, rotulo: string) =>
    raiz.querySelector(`section[aria-label="${rotulo}"]`);
  const nomes = (elemento: Element | null) =>
    Array.from(elemento?.querySelectorAll('.cena-cartao__nome') ?? []).map((nome) => texto(nome));
  const botao = (elemento: Element | null, rotulo: string) =>
    Array.from(elemento?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
      (item) => texto(item) === rotulo || item.getAttribute('aria-label') === rotulo,
    );
  const assentar = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  describe('mestre', () => {
    it('mostra a ativa em destaque, as planejadas na ordem e o histórico de encerradas', () => {
      const { raiz } = montar();

      expect(texto(raiz.querySelector('.hub-cenas__titulo'))).toBe('Cenas');
      expect(texto(raiz.querySelector('.hub-cenas__campanha'))).toBe('Campanha de Teste');
      const emCena = bloco(raiz, 'Cena em andamento');
      expect(nomes(emCena)).toEqual(['Contenção no Setor 12']);
      expect(emCena?.querySelector('.cena-cartao--ativa')).not.toBeNull();
      expect(nomes(bloco(raiz, 'Cenas planejadas'))).toEqual(['Galpão 7', 'Fuga pelos túneis']);
      expect(nomes(bloco(raiz, 'Cenas encerradas'))).toEqual(['Emboscada no Setor 4']);
    });

    it('mostra o tipo como chip em toda cena listada', () => {
      const { raiz } = montar();

      const chips = Array.from(raiz.querySelectorAll('.cena-cartao app-chip')).map((chip) =>
        texto(chip),
      );
      expect(chips).toEqual(['Combate', 'Investigação', 'Perseguição', 'Furtiva']);
    });

    it('cada cartão leva ao painel da cena', () => {
      const { raiz } = montar();

      const destinos = Array.from(raiz.querySelectorAll('a.cena-cartao')).map((cartao) =>
        cartao.getAttribute('href'),
      );
      expect(destinos).toEqual([1, 2, 3, 4].map((id) => `/campanhas/${CAMPANHA_ID}/cenas/${id}`));
    });

    it('reordena as planejadas pelas setas, enviando a lista inteira', () => {
      const { raiz, fixture, cenaService } = montar();
      const planejadas = bloco(raiz, 'Cenas planejadas');

      expect(botao(planejadas, 'Subir Galpão 7')?.disabled).toBe(true);
      expect(botao(planejadas, 'Descer Fuga pelos túneis')?.disabled).toBe(true);

      botao(planejadas, 'Descer Galpão 7')!.click();
      fixture.detectChanges();

      expect(cenaService.reordenarCenas).toHaveBeenCalledWith(CAMPANHA_ID, [3, 2]);
      expect(nomes(bloco(raiz, 'Cenas planejadas'))).toEqual(['Fuga pelos túneis', 'Galpão 7']);
    });

    it('abrir uma planejada com cena ativa pede confirmação e, confirmada, entra na cena', async () => {
      const { raiz, cenaService, navegar } = montar();
      const confirmar = vi
        .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
        .mockResolvedValue(true);

      botao(bloco(raiz, 'Cenas planejadas'), 'Abrir')!.click();
      await assentar();

      expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Abrir cena' }));
      expect(cenaService.abrirCena).toHaveBeenCalledWith(planejadaA.id);
      expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID, 'cenas', planejadaA.id]);
    });

    it('abrir cancelado não chama o backend; sem cena ativa, abre sem perguntar', async () => {
      const cancelado = montar();
      vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(false);
      botao(bloco(cancelado.raiz, 'Cenas planejadas'), 'Abrir')!.click();
      await assentar();
      expect(cancelado.cenaService.abrirCena).not.toHaveBeenCalled();
      TestBed.resetTestingModule();

      const semAtiva = montar({ cenas: [planejadaA, planejadaB, encerrada] });
      const confirmar = vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar');
      botao(bloco(semAtiva.raiz, 'Cenas planejadas'), 'Abrir')!.click();
      await assentar();
      expect(confirmar).not.toHaveBeenCalled();
      expect(semAtiva.cenaService.abrirCena).toHaveBeenCalledWith(planejadaA.id);
    });

    it('encerra a cena ativa depois de confirmar e refaz a lista', async () => {
      const { raiz, cenaService } = montar();
      vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(true);

      botao(bloco(raiz, 'Cena em andamento'), 'Encerrar')!.click();
      await assentar();

      expect(cenaService.encerrarCena).toHaveBeenCalledWith(ativa.id);
      expect(cenaService.listarPorCampanha).toHaveBeenCalledTimes(2);
    });

    it('sem cena ativa nem planejadas, cada bloco diz o que fazer', () => {
      const { raiz } = montar({ cenas: [encerrada] });

      expect(texto(bloco(raiz, 'Cena em andamento'))).toContain('Nenhuma cena em andamento.');
      expect(texto(bloco(raiz, 'Cena em andamento'))).toContain(
        'Abra uma cena planejada ou crie uma nova.',
      );
      expect(texto(bloco(raiz, 'Cenas planejadas'))).toContain('Nenhuma cena planejada.');
    });

    describe('"Nova cena"', () => {
      it('o botão do cabeçalho abre o dialog, avisando que há uma cena ativa', () => {
        const { raiz, fixture } = montar();
        expect(raiz.querySelector('app-cena-criar-dialog')).toBeNull();

        botao(raiz.querySelector('.hub-cenas__cabecalho'), 'Nova cena')!.click();
        fixture.detectChanges();

        expect(raiz.querySelector('app-cena-criar-dialog')).not.toBeNull();
        expect(texto(raiz.querySelector('app-modal .modal__titulo'))).toBe('Nova cena');
      });

      it('chegando com `?nova=1` (do painel de uma cena), o dialog já abre e o parâmetro sai', () => {
        const { raiz, navegar } = montar({ nova: true });

        expect(raiz.querySelector('app-cena-criar-dialog')).not.toBeNull();
        expect(navegar).toHaveBeenCalledWith(
          [],
          expect.objectContaining({ queryParams: {}, replaceUrl: true }),
        );
      });

      it('aberta agora, entra na cena criada; planejada, fica no hub e refaz a lista', () => {
        const { fixture, raiz, cenaService, navegar } = montar();
        const pagina = fixture.componentInstance as unknown as {
          aoCriarCena(cena: { id: number; nome: string; status: CenaStatusEnum }): void;
        };
        const notificar = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar');

        pagina.aoCriarCena({ id: 50, nome: 'Nova', status: CenaStatusEnum.ATIVA });
        expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID, 'cenas', 50]);

        pagina.aoCriarCena({ id: 51, nome: 'Depois', status: CenaStatusEnum.PLANEJADA });
        fixture.detectChanges();
        expect(cenaService.listarPorCampanha).toHaveBeenCalledTimes(2);
        expect(notificar).toHaveBeenCalledWith(
          expect.objectContaining({ severidade: 'sucesso', resumo: 'Cena planejada' }),
        );
        expect(raiz.querySelector('app-cena-criar-dialog')).toBeNull();
      });
    });
  });

  describe('jogador', () => {
    /** O backend não envia planejadas a quem não é mestre (m7-22) — o dublê espelha isso. */
    const listaDoJogador = [ativa, encerrada];

    it('vê a cena ativa e o histórico, sem planejadas nem controles de condução', () => {
      const { raiz } = montar({ usuarioId: JOGADOR, cenas: listaDoJogador });

      expect(nomes(bloco(raiz, 'Cena em andamento'))).toEqual(['Contenção no Setor 12']);
      expect(nomes(bloco(raiz, 'Cenas encerradas'))).toEqual(['Emboscada no Setor 4']);
      expect(bloco(raiz, 'Cenas planejadas')).toBeNull();
      expect(botao(raiz, 'Nova cena')).toBeUndefined();
      expect(botao(raiz, 'Encerrar')).toBeUndefined();
      expect(botao(raiz, 'Abrir')).toBeUndefined();
    });

    it('sem cena ativa, espera o mestre', () => {
      const { raiz } = montar({ usuarioId: JOGADOR, cenas: [encerrada] });

      expect(texto(bloco(raiz, 'Cena em andamento'))).toContain(
        'Quando o mestre abrir uma cena, ela aparece aqui.',
      );
    });

    it('`?nova=1` não abre o dialog para quem não é mestre', () => {
      const { raiz } = montar({ usuarioId: JOGADOR, cenas: listaDoJogador, nova: true });

      expect(raiz.querySelector('app-cena-criar-dialog')).toBeNull();
    });
  });

  describe('tempo real', () => {
    it('entra na sala da campanha e sai dela ao deixar a tela', () => {
      const { tempoReal } = montar();

      expect(tempoReal.conectar).toHaveBeenCalled();
      expect(tempoReal.entrarSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
      TestBed.resetTestingModule();
      expect(tempoReal.sairSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    });

    it('o mestre abre outra cena: o jogador vê a nova surgir e a antiga ir para o histórico', () => {
      const { raiz, fixture, cenaService, cenaAlterada$ } = montar({
        usuarioId: JOGADOR,
        cenas: [ativa],
      });
      const novaAtiva = cena(2, 'Galpão 7', CenaStatusEnum.ATIVA, CenaTipoEnum.INVESTIGACAO);
      const antiga = { ...ativa, status: CenaStatusEnum.ENCERRADA };
      cenaService.listarPorCampanha.mockReturnValue(of([novaAtiva, antiga]));

      cenaAlterada$.next({ campanhaId: CAMPANHA_ID, cena: antiga });
      cenaAlterada$.next({ campanhaId: CAMPANHA_ID, cena: novaAtiva });
      fixture.detectChanges();

      expect(nomes(bloco(raiz, 'Cena em andamento'))).toEqual(['Galpão 7']);
      expect(nomes(bloco(raiz, 'Cenas encerradas'))).toEqual(['Contenção no Setor 12']);
    });

    it('ignora a `cena:alterada` de outra campanha', () => {
      const { cenaService, cenaAlterada$ } = montar();

      cenaAlterada$.next({ campanhaId: 999, cena: ativa });

      expect(cenaService.listarPorCampanha).toHaveBeenCalledTimes(1);
    });

    it('refaz a lista quando o socket reconecta (reconexao$, P-083)', () => {
      const { fixture, cenaService, reconexao$ } = montar();
      cenaService.listarPorCampanha.mockClear();

      reconexao$.next();
      fixture.detectChanges();

      expect(cenaService.listarPorCampanha).toHaveBeenCalledTimes(1);
    });

    it('abrir o hub depois de uma reconexão já ocorrida não duplica a carga inicial (P-083)', () => {
      const { cenaService } = montar();

      expect(cenaService.listarPorCampanha).toHaveBeenCalledTimes(1);
    });
  });

  it('mostra o esqueleto enquanto não sabe quem olha, sem piscar controles de mestre', () => {
    const { raiz, fixture } = montar();
    // `membros` é privado; voltar a `null` reproduz o instante em que eles ainda não chegaram.
    (fixture.componentInstance as unknown as { membros: { set(valor: null): void } }).membros.set(
      null,
    );
    fixture.detectChanges();

    expect(raiz.querySelector('.hub-cenas__esqueleto')?.getAttribute('role')).toBe('status');
    expect(botao(raiz, 'Nova cena')).toBeUndefined();
    expect(bloco(raiz, 'Cena em andamento')).toBeNull();
  });
});
