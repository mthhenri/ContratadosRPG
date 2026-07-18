import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { ArquetipoEnum, ClasseEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import {
  CampanhaAlteradaDto,
  CampanhaMembroEntradaDto,
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { CampanhaDetalhe } from './detalhe.page';
import { CampanhaService } from '../../campanha.service';
import { CampanhaContextoService } from '../../campanha-contexto.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../../ficha/ficha.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';

/**
 * Prova o comportamento de frontend da m2-12 na tela de detalhe: só o mestre vê as ações de
 * editar/excluir; a edição chama `alterarCampanha` e reflete o resultado na tela e no seletor da
 * topbar (`CampanhaContextoService`); a exclusão exige confirmação e leva de volta à lista
 * (`/painel`). A autoridade é sempre o backend (§14) — aqui é só a camada de apresentação.
 */
describe('CampanhaDetalhe', () => {
  const CAMPANHA_ID = 8;

  const campanhaBase: CampanhaRecuperadaDto = {
    id: CAMPANHA_ID,
    nome: 'Contenção Delta',
    descricao: 'Operação em curso',
    codigoConvite: 'DEF456',
  };

  function membrosCom(usuarioId: number, papel: TipoCampanhaMembroPapelEnum): CampanhaMembroResumoDto[] {
    return [{ usuarioId, nome: 'Agente', papel }];
  }

  function montar(opts: {
    usuarioId: number;
    membros: CampanhaMembroResumoDto[];
    fichas?: FichaResumoDto[];
    alterarRetorno?: Observable<CampanhaAlteradaDto>;
  }) {
    const campanhaService = {
      recuperarCampanha: vi.fn(() => of({ ...campanhaBase })),
      listarMembros: vi.fn(() => of(opts.membros)),
      alterarCampanha: vi.fn(() => opts.alterarRetorno ?? of({ ...campanhaBase } as CampanhaAlteradaDto)),
      excluirCampanha: vi.fn(() => of(undefined)),
      regenerarConvite: vi.fn(() => of({ id: CAMPANHA_ID, codigoConvite: 'NOVO' })),
      removerMembro: vi.fn(() => of({ campanhaId: CAMPANHA_ID, usuarioId: 0 })),
      transferirMestre: vi.fn(() =>
        of({ campanhaId: CAMPANHA_ID, mestreAnteriorUsuarioId: 0, novoMestreUsuarioId: 0 }),
      ),
    };
    const fichaService = {
      listarFichas: vi.fn(() => of(opts.fichas ?? [])),
      criarFicha: vi.fn(() => of({ id: 42, campanhaId: CAMPANHA_ID, usuarioId: opts.usuarioId, nome: 'Novo agente' })),
      recuperarFicha: vi.fn((id: number) => {
        const ficha = (opts.fichas ?? []).find((item) => item.id === id);
        return of({
          id,
          campanhaId: CAMPANHA_ID,
          usuarioId: ficha?.usuarioId ?? 0,
          nome: ficha?.nome ?? '',
          dados: {
            nivel: ficha?.nivel ?? 1,
            classe: ficha?.classe ?? ClasseEnum.COMBATENTE,
            estado: {
              vidaAtual: ficha?.vidaAtual ?? 0,
              vidaMaxima: ficha?.vidaMaxima,
              energiaAtual: ficha?.energiaAtual ?? 0,
              energiaMaxima: ficha?.energiaMaxima,
            },
          },
        });
      }),
      alterarFicha: vi.fn((id: number, dto: { nome: string; dados: unknown }) =>
        of({ id, campanhaId: CAMPANHA_ID, usuarioId: 0, nome: dto.nome, dados: dto.dados }),
      ),
    };
    const contextoService = { definir: vi.fn(), limpar: vi.fn() };
    const sessaoService = { usuario: () => ({ id: opts.usuarioId, login: 'x', nome: 'x' }) };

    // Stub do tempo real (m2-16, trazido da extinta FichaLista; +m2-16c item 1: `ficha:alterada`):
    // `Subject`s controláveis para os eventos da sala e um Signal de reconexão.
    const fichaCriada$ = new Subject<FichaResumoDto>();
    const membroEntrou$ = new Subject<CampanhaMembroEntradaDto>();
    const fichaAlterada$ = new Subject<unknown>();
    const reconexao = signal(0);
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      fichaCriada$: fichaCriada$.asObservable(),
      membroEntrou$: membroEntrou$.asObservable(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      reconexao,
      conectado: signal(true),
    };

    TestBed.configureTestingModule({
      imports: [CampanhaDetalhe],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) } } } },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
        { provide: CampanhaContextoService, useValue: contextoService },
        { provide: SessaoService, useValue: sessaoService },
        { provide: TempoRealService, useValue: tempoRealService },
      ],
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(CampanhaDetalhe);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      campanhaService,
      fichaService,
      contextoService,
      tempoRealService,
      fichaCriada$,
      membroEntrou$,
      fichaAlterada$,
      reconexao,
      navegar,
    };
  }

  const mestre = () => ({ usuarioId: 1, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });
  const jogador = () => ({ usuarioId: 2, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });

  // Campanha com o mestre (id 1) e um jogador (id 2) — base da gestão de membros (m2-13).
  const membrosDois = (): CampanhaMembroResumoDto[] => [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
  ];

  it('mostra as ações de editar/excluir só para o mestre', () => {
    const { raiz } = montar(mestre());
    expect(raiz.querySelector('.detalhe__acoes')).not.toBeNull();
  });

  it('esconde as ações de editar/excluir do jogador', () => {
    const { raiz } = montar(jogador());
    expect(raiz.querySelector('.detalhe__acoes')).toBeNull();
  });

  it('edita nome/descrição e reflete o resultado na tela e na topbar', () => {
    const alterada: CampanhaAlteradaDto = {
      id: CAMPANHA_ID,
      nome: 'Contenção Ômega',
      descricao: 'Nova diretriz',
      codigoConvite: 'DEF456',
    };
    const { fixture, raiz, campanhaService, contextoService } = montar({
      ...mestre(),
      alterarRetorno: of(alterada),
    });

    // Abre o formulário de edição.
    (raiz.querySelectorAll('.detalhe__acoes button')[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    const nome = raiz.querySelector('input.detalhe__entrada') as HTMLInputElement;
    nome.value = 'Contenção Ômega';
    nome.dispatchEvent(new Event('input'));
    const descricao = raiz.querySelector('textarea.detalhe__entrada') as HTMLTextAreaElement;
    descricao.value = 'Nova diretriz';
    descricao.dispatchEvent(new Event('input'));

    (raiz.querySelector('.detalhe__edicao') as HTMLFormElement).dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(campanhaService.alterarCampanha).toHaveBeenCalledWith(CAMPANHA_ID, {
      nome: 'Contenção Ômega',
      descricao: 'Nova diretriz',
    });
    expect(contextoService.definir).toHaveBeenCalledWith({
      id: CAMPANHA_ID,
      nome: 'Contenção Ômega',
      codigoConvite: 'DEF456',
    });
    expect((raiz.querySelector('.card__titulo') as HTMLElement).textContent?.trim()).toBe('Contenção Ômega');
    expect(raiz.querySelector('.detalhe__edicao')).toBeNull();
  });

  it('exclui a campanha após confirmação e navega de volta à lista', () => {
    const { fixture, raiz, campanhaService, navegar } = montar(mestre());

    // "Excluir" (2ª ação) abre a confirmação inline — sem excluir ainda.
    (raiz.querySelectorAll('.detalhe__acoes button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.querySelector('.detalhe__exclusao')).not.toBeNull();
    expect(campanhaService.excluirCampanha).not.toHaveBeenCalled();

    // Confirma a exclusão.
    (raiz.querySelector('.detalhe__exclusao .botao--primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campanhaService.excluirCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(navegar).toHaveBeenCalledWith(['/painel']);
  });

  it('cancela a exclusão sem chamar o backend', () => {
    const { fixture, raiz, campanhaService } = montar(mestre());

    (raiz.querySelectorAll('.detalhe__acoes button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.detalhe__exclusao .botao--secundario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('.detalhe__exclusao')).toBeNull();
    expect(raiz.querySelector('.detalhe__acoes')).not.toBeNull();
    expect(campanhaService.excluirCampanha).not.toHaveBeenCalled();
  });

  it('mostra a gestão só na linha do jogador (nunca na própria do mestre)', () => {
    const { raiz } = montar({ usuarioId: 1, membros: membrosDois() });
    // Um único conjunto de ações (transferir/remover), na linha do jogador.
    expect(raiz.querySelectorAll('.detalhe__membro-acoes')).toHaveLength(1);
  });

  it('esconde a gestão de membros do jogador comum', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois() });
    expect(raiz.querySelector('.detalhe__membro-acoes')).toBeNull();
  });

  it('remove um jogador após confirmação e o tira da lista', () => {
    const { fixture, raiz, campanhaService } = montar({ usuarioId: 1, membros: membrosDois() });

    // Botão "remover" (2ª ação da linha do jogador) abre a confirmação — sem remover ainda.
    (raiz.querySelectorAll('.detalhe__membro-acoes button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(raiz.querySelector('.detalhe__membro-confirmacao')).not.toBeNull();
    expect(campanhaService.removerMembro).not.toHaveBeenCalled();

    (raiz.querySelector('.detalhe__membro-confirmacao .botao--primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campanhaService.removerMembro).toHaveBeenCalledWith(CAMPANHA_ID, 2);
    const nomes = Array.from(raiz.querySelectorAll('.detalhe__membro-nome')).map((el) =>
      el.textContent?.trim(),
    );
    expect(nomes).toEqual(['Mestre']);
  });

  it('transfere o mestre e perde as ações de gestão na hora', () => {
    const { fixture, raiz, campanhaService } = montar({ usuarioId: 1, membros: membrosDois() });

    // Após transferir, o usuário 1 vira JOGADOR e o 2 vira MESTRE.
    campanhaService.listarMembros.mockReturnValue(
      of([
        { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
        { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.MESTRE },
      ]),
    );

    // Botão "transferir" (1ª ação) abre a confirmação; confirmar promove o jogador.
    (raiz.querySelectorAll('.detalhe__membro-acoes button')[0] as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.detalhe__membro-confirmacao .botao--primario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(campanhaService.transferirMestre).toHaveBeenCalledWith(CAMPANHA_ID, 2);
    // Perdeu o papel: some a gestão de membros e as ações de editar/excluir da campanha.
    expect(raiz.querySelector('.detalhe__membro-acoes')).toBeNull();
    expect(raiz.querySelector('.detalhe__acoes')).toBeNull();
  });

  it('cancela a ação de membro sem chamar o backend', () => {
    const { fixture, raiz, campanhaService } = montar({ usuarioId: 1, membros: membrosDois() });

    (raiz.querySelectorAll('.detalhe__membro-acoes button')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    (raiz.querySelector('.detalhe__membro-confirmacao .botao--secundario') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(raiz.querySelector('.detalhe__membro-confirmacao')).toBeNull();
    expect(raiz.querySelector('.detalhe__membro-acoes')).not.toBeNull();
    expect(campanhaService.removerMembro).not.toHaveBeenCalled();
  });

  // m2-16 — fichas dos membros vivem inline no detalhe (a extinta FichaLista aposentada).
  describe('fichas inline (m2-16)', () => {
    const fichas: FichaResumoDto[] = [
      {
        id: 3,
        usuarioId: 1,
        nome: 'Kane',
        classe: ClasseEnum.COMBATENTE,
        arquetipo: ArquetipoEnum.LUTADOR,
        nivel: 2,
        vidaAtual: 0,
        vidaMaxima: 49,
        energiaAtual: 10,
        energiaMaxima: 27,
        morrendo: true,
        machucado: false,
        inconsciente: false,
      },
      {
        id: 4,
        usuarioId: 2,
        nome: 'Vera',
        classe: ClasseEnum.SUPORTE,
        arquetipo: ArquetipoEnum.PARAMEDICO,
        nivel: 1,
        vidaAtual: 15,
        vidaMaxima: 34,
        energiaAtual: 18,
        energiaMaxima: 18,
        morrendo: false,
        machucado: true,
        inconsciente: false,
      },
      {
        id: 5,
        usuarioId: 2,
        nome: 'Zeta',
        classe: ClasseEnum.ESPECIALISTA,
        arquetipo: ArquetipoEnum.ACADEMICO,
        nivel: 3,
        vidaAtual: 40,
        vidaMaxima: 40,
        energiaAtual: 5,
        energiaMaxima: 20,
        morrendo: false,
        machucado: false,
        inconsciente: true,
      },
    ];

    it('mostra as fichas de cada membro agrupadas sob a sua linha', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const blocos = raiz.querySelectorAll('.detalhe__membro');
      const fichasMestre = blocos[0].querySelectorAll('.detalhe__ficha-card');
      const fichasJogador = blocos[1].querySelectorAll('.detalhe__ficha-card');
      expect(fichasMestre).toHaveLength(1);
      expect(fichasMestre[0].textContent).toContain('Kane');
      expect(fichasJogador).toHaveLength(2);
      expect(raiz.textContent).toContain('Suporte - Paramédico · Nível 1');
    });

    it('mostra "Classe - Arquétipo" no mini-card quando a ficha tem arquétipo', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      expect(raiz.textContent).toContain('Combatente - Lutador · Nível 2');
      expect(raiz.textContent).toContain('Especialista - Acadêmico · Nível 3');
    });

    it('mostra "Classe-base - Subclasse" para as subclasses de Experimento (sem arquétipo)', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [
          { ...fichas[0], classe: ClasseEnum.EXPERIMENTO_BESTIAL, arquetipo: null },
          { ...fichas[0], id: 99, classe: ClasseEnum.EXPERIMENTO_ARTIFICIAL, arquetipo: null },
          { ...fichas[0], id: 98, classe: ClasseEnum.EXPERIMENTO_HIBRIDO, arquetipo: null },
        ],
      });

      expect(raiz.textContent).toContain('Combatente - Experimento Bestial · Nível 2');
      expect(raiz.textContent).toContain('Especialista - Experimento Artificial · Nível 2');
      expect(raiz.textContent).toContain('Suporte - Experimento Híbrido · Nível 2');
    });

    it('mostra só "Civil" quando a ficha não tem classe jogável nem arquétipo', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [{ ...fichas[0], classe: ClasseEnum.CIVIL, arquetipo: null }],
      });

      expect(raiz.textContent).toContain('Civil · Nível 2');
    });

    it('vira grid dinâmica pela quantidade de fichas: 1 mantém a linha, 2 vira grid-2, 3+ vira grid-3', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [...fichas, { ...fichas[2], id: 6, nome: 'Orin' }],
      });

      const listas = raiz.querySelectorAll('.detalhe__fichas-lista');
      const listaMestre = listas[0]; // 1 ficha (Kane) — sem grid
      const listaJogador = listas[1]; // 3 fichas (Vera, Zeta, Orin) — grid-3

      expect(listaMestre.classList.contains('detalhe__fichas-lista--grid-2')).toBe(false);
      expect(listaMestre.classList.contains('detalhe__fichas-lista--grid-3')).toBe(false);
      expect(listaJogador.classList.contains('detalhe__fichas-lista--grid-2')).toBe(false);
      expect(listaJogador.classList.contains('detalhe__fichas-lista--grid-3')).toBe(true);
    });

    it('mantém grid-2 quando o membro tem exatamente 2 fichas', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const listas = raiz.querySelectorAll('.detalhe__fichas-lista');
      const listaJogador = listas[1]; // Vera + Zeta

      expect(listaJogador.classList.contains('detalhe__fichas-lista--grid-2')).toBe(true);
      expect(listaJogador.classList.contains('detalhe__fichas-lista--grid-3')).toBe(false);
    });

    it('não mostra o bloco de fichas para um membro sem nenhuma visível', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [fichas[0]],
      });

      const blocos = raiz.querySelectorAll('.detalhe__membro');
      expect(blocos[0].querySelector('.detalhe__membro-fichas')).not.toBeNull();
      expect(blocos[1].querySelector('.detalhe__membro-fichas')).toBeNull();
    });

    it('mostra Vida/Energia e a condição ativa em cada mini-card (m2-16b)', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const cartoes = raiz.querySelectorAll('.detalhe__ficha-card');
      const [kane, vera, zeta] = Array.from(cartoes);

      expect(kane.textContent).toContain('Vida 0/49');
      expect(kane.textContent).toContain('Energia 10/27');
      expect(kane.querySelector('[data-condicao="morrendo"].detalhe__ficha-condicao--ativa')).not.toBeNull();
      expect(kane.querySelector('[data-condicao="machucado"].detalhe__ficha-condicao--ativa')).toBeNull();

      expect(vera.textContent).toContain('Vida 15/34');
      expect(vera.querySelector('[data-condicao="machucado"].detalhe__ficha-condicao--ativa')).not.toBeNull();

      expect(zeta.textContent).toContain('Energia 5/20');
      expect(zeta.querySelector('[data-condicao="inconsciente"].detalhe__ficha-condicao--ativa')).not.toBeNull();
    });

    it('sempre mostra as 3 condições, esmaecidas quando nenhuma está marcada (item 3)', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [
          {
            id: 8,
            usuarioId: 1,
            nome: 'Sem Condições',
            classe: ClasseEnum.COMBATENTE,
            arquetipo: ArquetipoEnum.LUTADOR,
            nivel: 1,
            vidaAtual: 20,
            vidaMaxima: 20,
            energiaAtual: 10,
            energiaMaxima: 10,
            morrendo: false,
            machucado: false,
            inconsciente: false,
          },
        ],
      });

      const cartao = raiz.querySelector('.detalhe__ficha-card')!;
      expect(cartao.querySelectorAll('.detalhe__ficha-condicao')).toHaveLength(3);
      expect(cartao.querySelectorAll('.detalhe__ficha-condicao--ativa')).toHaveLength(0);
    });

    it('destaca o cartão quando a Vida está zerada/negativa, mesmo sem Morrendo marcado (item 4)', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [
          {
            id: 9,
            usuarioId: 1,
            nome: 'No Chão',
            classe: ClasseEnum.COMBATENTE,
            arquetipo: ArquetipoEnum.LUTADOR,
            nivel: 1,
            vidaAtual: 0,
            vidaMaxima: 20,
            energiaAtual: 10,
            energiaMaxima: 10,
            morrendo: false,
            machucado: false,
            inconsciente: false,
          },
        ],
      });

      const cartao = raiz.querySelector('.detalhe__ficha-card')!;
      expect(cartao.classList.contains('detalhe__ficha-card--critico')).toBe(true);
    });

    it('não destaca o cartão quando a Vida está positiva', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
      // Vera tem vidaAtual 15 (positiva) no fixture — não deve ganhar o destaque de crítico.
      const cartoes = Array.from(raiz.querySelectorAll('.detalhe__ficha-card'));
      const vera = cartoes.find((c) => c.textContent?.includes('Vida 15/34'));
      expect(vera?.classList.contains('detalhe__ficha-card--critico')).toBe(false);
    });

    it('cada ficha liga à sua tela de visualização', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const primeiraFichaLink = raiz.querySelector('.detalhe__ficha-link') as HTMLAnchorElement;
      expect(primeiraFichaLink.getAttribute('href')).toBe(`/painel/${CAMPANHA_ID}/ficha/3`);
    });

    it('alterna o disclosure de fichas do membro (efeito só visual no mobile)', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const toggle = raiz.querySelector('.detalhe__fichas-toggle') as HTMLButtonElement;
      expect(toggle.classList.contains('detalhe__fichas-toggle--aberto')).toBe(false);

      toggle.click();
      fixture.detectChanges();
      expect(toggle.classList.contains('detalhe__fichas-toggle--aberto')).toBe(true);
      expect(raiz.querySelector('.detalhe__fichas-lista--aberta')).not.toBeNull();

      toggle.click();
      fixture.detectChanges();
      expect(toggle.classList.contains('detalhe__fichas-toggle--aberto')).toBe(false);
    });

    it('"Nova ficha" abre o assistente de criação, sem criar de imediato', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 1, membros: membrosDois() });

      expect(raiz.querySelector('app-ficha-criar-dialog')).toBeNull();

      (raiz.querySelector('.detalhe__nova-ficha') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('app-ficha-criar-dialog')).not.toBeNull();
      expect(fichaService.criarFicha).not.toHaveBeenCalled();
    });

    it('confirmar no assistente cria a ficha e navega para ela', () => {
      const { fixture, raiz, fichaService, navegar } = montar({
        usuarioId: 1,
        membros: membrosDois(),
      });

      (raiz.querySelector('.detalhe__nova-ficha') as HTMLButtonElement).click();
      fixture.detectChanges();
      (raiz.querySelector('app-ficha-criar-dialog .botao--primario') as HTMLButtonElement).click();

      expect(fichaService.criarFicha).toHaveBeenCalledTimes(1);
      expect(fichaService.criarFicha).toHaveBeenCalledWith(
        expect.objectContaining({ campanhaId: CAMPANHA_ID }),
      );
      expect(navegar).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'ficha', 42]);
      fixture.detectChanges();
      expect(raiz.querySelector('app-ficha-criar-dialog')).toBeNull();
    });

    it('entra na sala da campanha ao abrir e a esquece ao destruir', () => {
      const { fixture, tempoRealService } = montar({ usuarioId: 1, membros: membrosDois() });

      expect(tempoRealService.conectar).toHaveBeenCalled();
      expect(tempoRealService.entrarSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
      fixture.destroy();
      expect(tempoRealService.sairSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    });

    it('refaz o fetch de membros/fichas ao receber ficha:criada ou membro:entrou', () => {
      const { fichaService, campanhaService, fichaCriada$, membroEntrou$ } = montar({
        usuarioId: 1,
        membros: membrosDois(),
      });
      expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
      expect(campanhaService.listarMembros).toHaveBeenCalledTimes(1);

      fichaCriada$.next({
        id: 9,
        usuarioId: 2,
        nome: 'Nova',
        classe: ClasseEnum.COMBATENTE,
        arquetipo: ArquetipoEnum.LUTADOR,
        nivel: 0,
        vidaAtual: 20,
        vidaMaxima: 20,
        energiaAtual: 10,
        energiaMaxima: 10,
        morrendo: false,
        machucado: false,
        inconsciente: false,
      });
      expect(fichaService.listarFichas).toHaveBeenCalledTimes(2);
      expect(campanhaService.listarMembros).toHaveBeenCalledTimes(2);

      membroEntrou$.next({ campanhaId: CAMPANHA_ID, usuarioId: 3 });
      expect(fichaService.listarFichas).toHaveBeenCalledTimes(3);
      expect(campanhaService.listarMembros).toHaveBeenCalledTimes(3);
    });

    it('ressincroniza membros/fichas ao reconectar (§9)', () => {
      const { fixture, fichaService, reconexao } = montar({ usuarioId: 1, membros: membrosDois() });
      expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);

      reconexao.set(1);
      fixture.detectChanges();

      expect(fichaService.listarFichas).toHaveBeenCalledTimes(2);
    });

    // Item 1 — ficha:alterada propagado à tela de campanha.
    describe('tempo real de ficha:alterada (item 1)', () => {
      it('entra na sala ficha:<id> de cada ficha visível após o fetch', () => {
        const { tempoRealService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

        expect(tempoRealService.entrarSalaFicha).toHaveBeenCalledWith(3);
        expect(tempoRealService.entrarSalaFicha).toHaveBeenCalledWith(4);
        expect(tempoRealService.entrarSalaFicha).toHaveBeenCalledWith(5);
      });

      it('sai de todas as salas de ficha ao destruir', () => {
        const { fixture, tempoRealService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

        fixture.destroy();

        expect(tempoRealService.sairSalaFicha).toHaveBeenCalledWith(3);
        expect(tempoRealService.sairSalaFicha).toHaveBeenCalledWith(4);
        expect(tempoRealService.sairSalaFicha).toHaveBeenCalledWith(5);
      });

      it('refaz o fetch ao receber ficha:alterada (Vida/Energia/condição mudou em outra aba)', () => {
        const { fichaService, campanhaService, fichaAlterada$ } = montar({
          usuarioId: 1,
          membros: membrosDois(),
          fichas,
        });
        expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);

        fichaAlterada$.next({ id: 3, campanhaId: CAMPANHA_ID, usuarioId: 1, nome: 'Kane', dados: {} });

        expect(fichaService.listarFichas).toHaveBeenCalledTimes(2);
        expect(campanhaService.listarMembros).toHaveBeenCalledTimes(2);
      });
    });

    // Item 8 — estado vazio por membro, só quando a visão é autoritativa.
    describe('estado vazio por membro (item 8)', () => {
      it('mostra "ainda sem ficha" na própria linha quando você não tem nenhuma', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas: [] });

        const blocoMestre = raiz.querySelectorAll('.detalhe__membro')[0];
        expect(blocoMestre.querySelector('.detalhe__sem-fichas')?.textContent).toContain(
          'Você ainda não tem uma ficha',
        );
      });

      it('mestre vê "ainda sem ficha" também na linha de outro membro (visão autoritativa)', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas: [] });

        const blocoJogador = raiz.querySelectorAll('.detalhe__membro')[1];
        expect(blocoJogador.querySelector('.detalhe__sem-fichas')?.textContent).toContain(
          'Ainda sem ficha',
        );
      });

      it('jogador comum NÃO afirma ausência na linha de outro membro (pode só estar oculta)', () => {
        const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas: [] });

        const blocoMestre = raiz.querySelectorAll('.detalhe__membro')[0];
        expect(blocoMestre.querySelector('.detalhe__sem-fichas')).toBeNull();
        // Mas a própria linha do jogador (a dele mesmo) continua autoritativa.
        const blocoJogador = raiz.querySelectorAll('.detalhe__membro')[1];
        expect(blocoJogador.querySelector('.detalhe__sem-fichas')).not.toBeNull();
      });
    });

    // Item 9 — "Atualizado há Xs".
    describe('legenda de frescor "Atualizado há Xs" (item 9)', () => {
      it('mostra "Atualizado agora" logo após o primeiro fetch', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois() });
        expect(raiz.querySelector('.detalhe__secao-atualizado')?.textContent).toBe('Atualizado agora');
      });

      it('avança pra segundos depois que o relógio interno tica', () => {
        vi.useFakeTimers();
        try {
          const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois() });
          vi.advanceTimersByTime(11_000);
          fixture.detectChanges();
          expect(raiz.querySelector('.detalhe__secao-atualizado')?.textContent).toMatch(/Atualizado há \d+s/);
        } finally {
          vi.useRealTimers();
        }
      });
    });

    // m2-16g: ações rápidas de Vida/Energia direto no mini-card, sem abrir a ficha.
    describe('ações rápidas de Vida/Energia no mini-card (m2-16g)', () => {
      it('mostra os passos − / + só pra dono ou mestre — mestre vê em qualquer ficha', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

        // Kane (dono: mestre), Vera e Zeta (dona: jogador) — o mestre ajusta as três.
        expect(raiz.querySelector('[aria-label="Aumentar Vida de Kane"]')).not.toBeNull();
        expect(raiz.querySelector('[aria-label="Aumentar Vida de Vera"]')).not.toBeNull();
        expect(raiz.querySelector('[aria-label="Aumentar Vida de Zeta"]')).not.toBeNull();
      });

      it('jogador comum só vê os passos nas próprias fichas, nunca na do mestre', () => {
        const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });

        expect(raiz.querySelector('[aria-label="Aumentar Vida de Vera"]')).not.toBeNull();
        expect(raiz.querySelector('[aria-label="Aumentar Vida de Zeta"]')).not.toBeNull();
        expect(raiz.querySelector('[aria-label="Aumentar Vida de Kane"]')).toBeNull();
      });

      it('clique em + soma 1 na Vida na hora (otimista, sem esperar a rede)', () => {
        const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

        const botaoMais = raiz.querySelector(
          '[aria-label="Aumentar Vida de Vera"]',
        ) as HTMLButtonElement;
        botaoMais.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
        botaoMais.dispatchEvent(new MouseEvent('pointerup'));
        fixture.detectChanges();

        const cartaoVera = [...raiz.querySelectorAll('.detalhe__ficha-card')].find((cartao) =>
          cartao.textContent?.includes('Vera'),
        );
        expect(cartaoVera?.textContent).toContain('Vida 16/34');
      });

      it('desabilita o passo de reduzir Vida quando a Vida já está em 0', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

        const botaoMenos = raiz.querySelector(
          '[aria-label="Reduzir Vida de Kane"]',
        ) as HTMLButtonElement;
        expect(botaoMenos.disabled).toBe(true);
      });

      it('agenda a persistência em lote: busca o documento completo e grava só depois do debounce', () => {
        vi.useFakeTimers();
        try {
          const { fixture, raiz, fichaService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

          const botaoMais = raiz.querySelector(
            '[aria-label="Aumentar Vida de Vera"]',
          ) as HTMLButtonElement;
          botaoMais.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
        botaoMais.dispatchEvent(new MouseEvent('pointerup'));
          fixture.detectChanges();
          botaoMais.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
        botaoMais.dispatchEvent(new MouseEvent('pointerup'));
          fixture.detectChanges();

          vi.advanceTimersByTime(300);
          expect(fichaService.alterarFicha).not.toHaveBeenCalled();

          vi.advanceTimersByTime(300);
          expect(fichaService.recuperarFicha).toHaveBeenCalledWith(4);
          expect(fichaService.alterarFicha).toHaveBeenCalledTimes(1);
          expect(fichaService.alterarFicha).toHaveBeenCalledWith(
            4,
            expect.objectContaining({
              dados: expect.objectContaining({
                estado: expect.objectContaining({ vidaAtual: 17 }),
              }),
            }),
          );
        } finally {
          vi.useRealTimers();
        }
      });
    });
  });
});
