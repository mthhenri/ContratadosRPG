import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import {
  ArquetipoEnum,
  ClasseEnum,
  RolagemVisibilidadeEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import {
  CampanhaAlteradaDto,
  CampanhaMembroEntradaDto,
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaDetalhe } from './detalhe.page';
import { CampanhaService } from '../../campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';

/**
 * Prova o redesenho m2-19 da visão do mestre em `/painel/:id`: banner de alerta condicional,
 * tira de estatísticas (Membros/Fichas/Convite/Alertas), tira de rolagens recentes com "Ver
 * tudo", coluna "Membros" simplificada (sem fichas) e coluna "Esquadrão" (grid achatado de todas
 * as fichas, com o nome do dono em cada card) — mais o menu kebab de ações da campanha no
 * cabeçalho, que substitui o antigo card "Identidade". Toda a permissão continua arbitrada pelo
 * backend (§14); aqui é só a camada de apresentação.
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

  function rolagem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
    return {
      id: 1,
      fichaId: 3,
      campanhaId: CAMPANHA_ID,
      usuarioId: 1,
      nomeAutor: 'Mestre',
      nomeFicha: 'Kane',
      rotulo: '1d20+5',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 5, total: 17 },
      createdDate: new Date().toISOString(),
      ...sobrescritas,
    };
  }

  function montar(opts: {
    usuarioId: number;
    membros: CampanhaMembroResumoDto[];
    fichas?: FichaResumoDto[];
    rolagens?: RolagemResumoDto[];
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
      duplicarFicha: vi.fn((id: number) =>
        of({ id: 100, campanhaId: CAMPANHA_ID, usuarioId: opts.usuarioId, nome: `Clone de ${id} (cópia)` }),
      ),
      excluirFicha: vi.fn(() => of(undefined)),
      atribuirCampanha: vi.fn((id: number) => of({ id, campanhaId: null })),
    };
    const rolagemService = {
      listarPorCampanha: vi.fn(() => of(opts.rolagens ?? [])),
    };
    const sessaoService = { usuario: () => ({ id: opts.usuarioId, login: 'x', nome: 'x' }) };

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });

    // Stub do tempo real (m2-16, trazido da extinta FichaLista; +m2-16c item 1: `ficha:alterada`):
    // `Subject`s controláveis para os eventos da sala e um Signal de reconexão.
    const fichaCriada$ = new Subject<FichaResumoDto>();
    const membroEntrou$ = new Subject<CampanhaMembroEntradaDto>();
    const fichaAlterada$ = new Subject<unknown>();
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
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
      rolagemRegistrada$: rolagemRegistrada$.asObservable(),
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
        { provide: RolagemService, useValue: rolagemService },
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
      rolagemService,
      tempoRealService,
      fichaCriada$,
      membroEntrou$,
      fichaAlterada$,
      rolagemRegistrada$,
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

  function abrirMenuCampanha(raiz: HTMLElement, fixture: ReturnType<typeof montar>['fixture']) {
    (raiz.querySelector('.detalhe__cabecalho-menu-botao') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('mostra o botão "Voltar às campanhas" no cabeçalho, apontando para /painel', () => {
    const { raiz } = montar(mestre());
    const voltar = raiz.querySelector('.detalhe__cabecalho-voltar');
    expect(voltar).not.toBeNull();
    expect(voltar?.getAttribute('href')).toBe('/painel');
  });

  it('ordena a coluna "Membros" com o mestre primeiro, depois jogadores em ordem alfabética', () => {
    const { raiz } = montar({
      usuarioId: 1,
      membros: [
        { usuarioId: 2, nome: 'Zeca', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
        { usuarioId: 1, nome: 'Ômega', papel: TipoCampanhaMembroPapelEnum.MESTRE },
        { usuarioId: 3, nome: 'Ana', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
      ],
    });

    const nomes = Array.from(raiz.querySelectorAll('.detalhe__membro-nome')).map((el) =>
      el.textContent?.trim(),
    );
    expect(nomes).toEqual(['Ômega', 'Ana', 'Zeca']);
  });

  // === Menu kebab de ações da campanha (item 6) — substitui o antigo card "Identidade". ===
  describe('menu de ações da campanha (item 6)', () => {
    it('mostra o kebab de ações só para o mestre', () => {
      const { raiz } = montar(mestre());
      expect(raiz.querySelector('.detalhe__cabecalho-menu-botao')).not.toBeNull();
    });

    it('esconde o kebab de ações do jogador', () => {
      const { raiz } = montar(jogador());
      expect(raiz.querySelector('.detalhe__cabecalho-menu-botao')).toBeNull();
    });

    it('abre o menu com Editar/Excluir e fecha ao clicar no fundo', () => {
      const { fixture, raiz } = montar(mestre());

      abrirMenuCampanha(raiz, fixture);
      const itens = raiz.querySelectorAll('.detalhe__cabecalho-menu-item');
      expect(itens).toHaveLength(2);
      expect(itens[0].textContent).toContain('Editar');
      expect(itens[1].textContent).toContain('Excluir');

      (raiz.querySelector('.detalhe__cabecalho-menu-fundo') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
    });

    it('"Editar" abre o formulário, edita nome/descrição, reflete no título e fecha o menu', () => {
      const alterada: CampanhaAlteradaDto = {
        id: CAMPANHA_ID,
        nome: 'Contenção Ômega',
        descricao: 'Nova diretriz',
        codigoConvite: 'DEF456',
      };
      const { fixture, raiz, campanhaService } = montar({ ...mestre(), alterarRetorno: of(alterada) });

      abrirMenuCampanha(raiz, fixture);
      (raiz.querySelectorAll('.detalhe__cabecalho-menu-item')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();

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
      expect((raiz.querySelector('.detalhe__titulo') as HTMLElement).textContent?.trim()).toBe(
        'Contenção Ômega',
      );
      expect(raiz.querySelector('.detalhe__edicao')).toBeNull();
    });

    it('"Excluir" pede confirmação inline; confirmar exclui e navega de volta à lista', () => {
      const { fixture, raiz, campanhaService, navegar } = montar(mestre());

      abrirMenuCampanha(raiz, fixture);
      (raiz.querySelectorAll('.detalhe__cabecalho-menu-item')[1] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(raiz.querySelector('.detalhe__exclusao')).not.toBeNull();
      expect(campanhaService.excluirCampanha).not.toHaveBeenCalled();

      (raiz.querySelector('.detalhe__exclusao .botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(campanhaService.excluirCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
      expect(navegar).toHaveBeenCalledWith(['/painel']);
    });

    it('cancela a exclusão sem chamar o backend', () => {
      const { fixture, raiz, campanhaService } = montar(mestre());

      abrirMenuCampanha(raiz, fixture);
      (raiz.querySelectorAll('.detalhe__cabecalho-menu-item')[1] as HTMLButtonElement).click();
      fixture.detectChanges();
      (raiz.querySelector('.detalhe__exclusao .botao--secundario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__exclusao')).toBeNull();
      expect(campanhaService.excluirCampanha).not.toHaveBeenCalled();
    });
  });

  // === Gestão de membros (m2-13) — inalterada pelo m2-19, só sem fichas na coluna. ===
  describe('gestão de membros (m2-13)', () => {
    it('mostra a gestão só na linha do jogador (nunca na própria do mestre)', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois() });
      expect(raiz.querySelectorAll('.detalhe__membro-acoes')).toHaveLength(1);
    });

    it('esconde a gestão de membros do jogador comum', () => {
      const { raiz } = montar({ usuarioId: 2, membros: membrosDois() });
      expect(raiz.querySelector('.detalhe__membro-acoes')).toBeNull();
    });

    it('remove um jogador após confirmação e o tira da lista', () => {
      const { fixture, raiz, campanhaService } = montar({ usuarioId: 1, membros: membrosDois() });

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

    it('transfere o mestre e perde as ações de gestão/o kebab de campanha na hora', () => {
      const { fixture, raiz, campanhaService } = montar({ usuarioId: 1, membros: membrosDois() });

      campanhaService.listarMembros.mockReturnValue(
        of([
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
          { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.MESTRE },
        ]),
      );

      (raiz.querySelectorAll('.detalhe__membro-acoes button')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      (raiz.querySelector('.detalhe__membro-confirmacao .botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(campanhaService.transferirMestre).toHaveBeenCalledWith(CAMPANHA_ID, 2);
      expect(raiz.querySelector('.detalhe__membro-acoes')).toBeNull();
      expect(raiz.querySelector('.detalhe__cabecalho-menu-botao')).toBeNull();
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
  });

  // Fixture compartilhada de fichas — Kane (mestre, crítico), Vera e Zeta (jogador).
  const fichas: FichaResumoDto[] = [
    {
      id: 3,
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
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
      prestigio: 5,
      defesa: 12,
      esquiva: 15,
      bloqueio: 14,
      contraAtaque: 8,
      personalidade: 'Frio',
      origemNome: 'Guarda-Costas',
      sobrecarregado: true,
    },
    {
      id: 4,
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
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
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
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

  // === Banner de alerta (item 1) ===
  describe('banner de alerta (item 1)', () => {
    it('aparece com o nome da ficha crítica e um link "Ver ficha →"', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const banner = raiz.querySelector('.detalhe__banner-alerta');
      expect(banner).not.toBeNull();
      expect(banner?.textContent).toContain('Kane');
      const link = banner?.querySelector('.detalhe__banner-link') as HTMLAnchorElement;
      expect(link.getAttribute('href')).toBe(`/painel/${CAMPANHA_ID}/ficha/3`);
    });

    it('some quando nenhuma ficha está crítica', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: fichas.filter((ficha) => ficha.id !== 3),
      });

      expect(raiz.querySelector('.detalhe__banner-alerta')).toBeNull();
    });
  });

  // === Tira de estatísticas (item 2) ===
  describe('tira de estatísticas (item 2)', () => {
    it('mostra Membros/Fichas corretos e marca Alertas quando há ficha crítica', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const stats = Array.from(raiz.querySelectorAll('.detalhe__estatisticas .stat'));
      const valores = (rotulo: string) =>
        stats
          .find((stat) => stat.querySelector('.stat__rotulo')?.textContent?.trim() === rotulo)
          ?.querySelector('.stat__valor')?.textContent?.trim();

      expect(valores('Membros')).toBe('2');
      expect(valores('Fichas')).toBe('3');
      expect(valores('Alertas')).toBe('1');

      const statAlertas = stats.find((stat) => stat.querySelector('.stat__rotulo')?.textContent?.trim() === 'Alertas');
      expect(statAlertas?.classList.contains('stat--alerta')).toBe(true);
    });

    it('Alertas fica em 0 e sem destaque quando não há ficha crítica', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: fichas.filter((ficha) => ficha.id !== 3),
      });

      const stats = Array.from(raiz.querySelectorAll('.detalhe__estatisticas .stat'));
      const statAlertas = stats.find((stat) => stat.querySelector('.stat__rotulo')?.textContent?.trim() === 'Alertas');
      expect(statAlertas?.querySelector('.stat__valor')?.textContent?.trim()).toBe('0');
      expect(statAlertas?.classList.contains('stat--alerta')).toBe(false);
    });

    it('mostra o tile de Convite para o mestre', () => {
      const { raiz } = montar(mestre());
      expect(raiz.querySelector('.detalhe__stat-convite')).not.toBeNull();
    });

    it('esconde o tile de Convite do jogador', () => {
      const { raiz } = montar(jogador());
      expect(raiz.querySelector('.detalhe__stat-convite')).toBeNull();
    });

    it('copiar convite chama o clipboard e regenerar chama o backend', async () => {
      const { fixture, raiz, campanhaService } = montar(mestre());

      (raiz.querySelector('.detalhe__copiar') as HTMLButtonElement).click();
      await Promise.resolve();
      fixture.detectChanges();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('DEF456');

      (raiz.querySelector('.detalhe__regenerar') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(campanhaService.regenerarConvite).toHaveBeenCalledWith(CAMPANHA_ID);
    });
  });

  // === Tira de rolagens recentes (item 3) ===
  describe('tira de rolagens recentes (item 3)', () => {
    it('mostra as mais recentes do feed com rótulo, autor e tempo relativo', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        rolagens: [rolagem({ id: 1, rotulo: '1d20+5', nomeAutor: 'Mestre' })],
      });

      const pill = raiz.querySelector('.rolagem-pill');
      expect(pill?.querySelector('.rolagem-pill__rotulo')?.textContent).toContain('1d20+5');
      expect(pill?.querySelector('.rolagem-pill__meta')?.textContent).toContain('Mestre');
    });

    it('mostra todas as rolagens da última hora, sem limite fixo de itens', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        rolagens: [1, 2, 3, 4, 5, 6].map((id) => rolagem({ id, rotulo: `Rolagem ${id}` })),
      });

      expect(raiz.querySelectorAll('.rolagem-pill')).toHaveLength(6);
    });

    it('esconde rolagens feitas há mais de 1 hora', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        rolagens: [
          rolagem({ id: 1, rotulo: 'Recente', createdDate: new Date().toISOString() }),
          rolagem({
            id: 2,
            rotulo: 'Antiga',
            createdDate: new Date(Date.now() - 61 * 60 * 1000).toISOString(),
          }),
        ],
      });

      const rotulos = Array.from(raiz.querySelectorAll('.rolagem-pill__rotulo')).map((el) =>
        el.textContent?.trim(),
      );
      expect(rotulos).toEqual(['Recente']);
    });

    it('some quando o feed está vazio', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), rolagens: [] });
      expect(raiz.querySelector('.detalhe__rolagens')).toBeNull();
    });

    it('não duplica a lista completa — só a sidebar de histórico tem "Carregar mais"/paginação', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        rolagens: [rolagem()],
      });

      expect(raiz.querySelector('.detalhe__rolagens-ver-tudo')).toBeNull();
      expect(raiz.querySelector('.historico-rolagens__painel')).toBeNull();
    });
  });

  // === Coluna "Esquadrão" (item 5, m2-16/m2-16b/m2-16g/m3-52 reaproveitados achatados) ===
  describe('esquadrão (item 5)', () => {
    it('mostra todas as fichas da campanha, achatadas, com o nome do dono em cada card', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const cartoes = raiz.querySelectorAll('.detalhe__esquadrao-grid .detalhe__ficha-card');
      expect(cartoes).toHaveLength(3);
      const kane = Array.from(cartoes).find((c) => c.textContent?.includes('Kane'));
      expect(kane?.querySelector('.detalhe__ficha-dono')?.textContent?.trim()).toBe('Mestre');
      const vera = Array.from(cartoes).find((c) => c.textContent?.includes('Vera'));
      expect(vera?.querySelector('.detalhe__ficha-dono')?.textContent?.trim()).toBe('Jogador');
    });

    it('mostra o estado vazio quando a campanha não tem nenhuma ficha visível', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas: [] });
      expect(raiz.querySelector('.detalhe__estado')).not.toBeNull();
      expect(raiz.querySelector('.detalhe__esquadrao-grid')).toBeNull();
    });

    it('a coluna "Membros" não mostra mais fichas (foram para o Esquadrão)', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
      expect(raiz.querySelector('.detalhe__membros .detalhe__ficha-card')).toBeNull();
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

    it('sempre mostra as 3 condições, esmaecidas quando nenhuma está marcada (item 3 da m2-16b)', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [
          {
            id: 8,
            campanhaId: CAMPANHA_ID,
            campanhaNome: null,
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

    it('destaca o cartão quando a Vida está zerada/negativa, mesmo sem Morrendo marcado', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [
          {
            id: 9,
            campanhaId: CAMPANHA_ID,
            campanhaNome: null,
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
      const cartoes = Array.from(raiz.querySelectorAll('.detalhe__ficha-card'));
      const vera = cartoes.find((c) => c.textContent?.includes('Vida 15/34'));
      expect(vera?.classList.contains('detalhe__ficha-card--critico')).toBe(false);
    });

    it('cada ficha liga à sua tela de visualização', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const primeiraFichaLink = raiz.querySelector('.detalhe__ficha-link') as HTMLAnchorElement;
      expect(primeiraFichaLink.getAttribute('href')).toBe(`/painel/${CAMPANHA_ID}/ficha/3`);
    });

    it('duplo clique no cartão abre a ficha', () => {
      const { raiz, navegar } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const cartao = raiz.querySelector('.detalhe__ficha-card') as HTMLElement;
      cartao.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

      expect(navegar).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'ficha', 3]);
    });

    it('duplo clique num controle próprio (passo de Vida/Energia) não navega', () => {
      const { raiz, navegar } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const passo = raiz.querySelector('.detalhe__ficha-passo') as HTMLElement;
      passo.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

      expect(navegar).not.toHaveBeenCalled();
    });

    // `window.open` é global — cada teste restaura o spy no fim (`mockRestore`), senão o segundo
    // `vi.spyOn` reaproveitaria o mesmo mock (com a chamada do teste anterior já registrada nele).
    it('clique do meio no cartão abre a ficha numa nova aba', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
      const abrirNovaAba = vi.spyOn(window, 'open').mockReturnValue(null);
      try {
        const cartao = raiz.querySelector('.detalhe__ficha-card') as HTMLElement;
        cartao.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }));

        expect(abrirNovaAba).toHaveBeenCalledWith(`/painel/${CAMPANHA_ID}/ficha/3`, '_blank', 'noopener');
      } finally {
        abrirNovaAba.mockRestore();
      }
    });

    it('clique do meio num controle próprio (kebab) não abre nova aba', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
      const abrirNovaAba = vi.spyOn(window, 'open').mockReturnValue(null);
      try {
        const kebab = raiz.querySelector('.detalhe__ficha-menu-botao') as HTMLElement;
        kebab.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }));

        expect(abrirNovaAba).not.toHaveBeenCalled();
      } finally {
        abrirNovaAba.mockRestore();
      }
    });

    it('botão de ações (kebab) fica na mesma linha das reações, não numa linha própria', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const cartoes = Array.from(raiz.querySelectorAll('.detalhe__ficha-card'));
      const kane = cartoes.find((c) => c.textContent?.includes('Kane')) as HTMLElement;
      const rodape = kane.querySelector('.detalhe__ficha-rodape');
      expect(rodape?.querySelector('.detalhe__ficha-reacoes')).not.toBeNull();
      expect(rodape?.querySelector('.detalhe__ficha-menu-botao')).not.toBeNull();
    });

    it('mostra a Patente derivada do Prestígio na meta', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const cartao = raiz.querySelector('.detalhe__ficha-card') as HTMLElement;
      expect(cartao.textContent).toContain('Operador');
    });

    it('mostra Defesa/Esquiva/Bloqueio/Contra-ataque quando presentes', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const reacoes = raiz.querySelector('.detalhe__ficha-reacoes');
      expect(reacoes?.textContent).toContain('Defesa 12');
      expect(reacoes?.textContent).toContain('Esquiva 15');
      expect(reacoes?.textContent).toContain('Bloqueio 14');
      expect(reacoes?.textContent).toContain('Contra-ataque 8');
    });

    it('esconde Contra-ataque numa ficha sem habilidade que o conceda', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const cartoes = Array.from(raiz.querySelectorAll('.detalhe__ficha-card'));
      const vera = cartoes.find((c) => c.textContent?.includes('Vera')) as HTMLElement;
      expect(vera.querySelector('.detalhe__ficha-reacoes')).toBeNull();
    });

    it('esconde Defesa/Esquiva/Bloqueio/Contra-ataque quando a API devolve null (não a chave ausente — o JSON de rede não omite `undefined`, só chega como null)', () => {
      const fichaComNulos: FichaResumoDto = {
        ...fichas[1],
        defesa: null as unknown as undefined,
        esquiva: null as unknown as undefined,
        bloqueio: null as unknown as undefined,
        contraAtaque: null as unknown as undefined,
      };
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas: [fichaComNulos] });

      const cartao = raiz.querySelector('.detalhe__ficha-card') as HTMLElement;
      expect(cartao.querySelector('.detalhe__ficha-reacoes')).toBeNull();
    });

    it('mostra Personalidade/Origem combinadas e esconde a linha quando ausentes', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const cartoes = Array.from(raiz.querySelectorAll('.detalhe__ficha-card'));
      const kane = cartoes.find((c) => c.textContent?.includes('Kane'));
      expect(kane?.querySelector('.detalhe__ficha-identidade')?.textContent).toContain(
        'Frio · Guarda-Costas',
      );

      const vera = cartoes.find((c) => c.textContent?.includes('Vera'));
      expect(vera?.querySelector('.detalhe__ficha-identidade')).toBeNull();
    });

    it('mostra o aviso de Sobrecarregado só na ficha marcada', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const cartoes = Array.from(raiz.querySelectorAll('.detalhe__ficha-card'));
      const kane = cartoes.find((c) => c.textContent?.includes('Kane'));
      const vera = cartoes.find((c) => c.textContent?.includes('Vera'));
      expect(kane?.querySelector('[data-condicao="sobrecarregado"]')).not.toBeNull();
      expect(vera?.querySelector('[data-condicao="sobrecarregado"]')).toBeNull();
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

    // Item 9 — "Atualizado há Xs", agora no cabeçalho da seção "Esquadrão".
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
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
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

  // Item 1 (m2-16c) — ficha:alterada propagado à tela de campanha.
  describe('tempo real de ficha:alterada', () => {
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

  // m2-16g: ações rápidas de Vida/Energia direto no mini-card, sem abrir a ficha.
  describe('ações rápidas de Vida/Energia no mini-card (m2-16g)', () => {
    it('mostra os passos − / + só pra dono ou mestre — mestre vê em qualquer ficha', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

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

  // m3-52: menu de ações (kebab) no mini-card — Duplicar/Remover da campanha/Excluir, cada um
  // com dialog de confirmação própria (mesmo padrão do menu do cabeçalho de FichaVisualizar),
  // exceto "Remover da campanha", ação direta sem dialog (mesmo padrão de `FichaAcervo`).
  describe('menu de ações da ficha (m3-52) — Duplicar/Remover da campanha/Excluir', () => {
    function abrirMenu(raiz: HTMLElement, fixture: ReturnType<typeof montar>['fixture'], rotulo: string) {
      (raiz.querySelector(`[aria-label="Ações de ${rotulo}"]`) as HTMLButtonElement).click();
      fixture.detectChanges();
    }

    it('mestre vê o menu de ações em qualquer ficha', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      expect(raiz.querySelector('[aria-label="Ações de Kane"]')).not.toBeNull();
      expect(raiz.querySelector('[aria-label="Ações de Vera"]')).not.toBeNull();
    });

    it('jogador comum só vê o menu de ações na própria ficha, nunca na do mestre', () => {
      const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });

      expect(raiz.querySelector('[aria-label="Ações de Vera"]')).not.toBeNull();
      expect(raiz.querySelector('[aria-label="Ações de Kane"]')).toBeNull();
    });

    describe('duplicar', () => {
      it('abre a dialog de confirmação com o nome da ficha e do dono', () => {
        const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
        abrirMenu(raiz, fixture, 'Kane');

        (raiz.querySelector('.detalhe__ficha-menu-item') as HTMLButtonElement).click();
        fixture.detectChanges();

        const dialog = raiz.querySelector('.dialogo');
        expect(dialog).not.toBeNull();
        expect(dialog?.textContent).toContain('Deseja mesmo duplicar a ficha "Kane" de "Mestre"?');
      });

      it('cancelar fecha a dialog sem chamar o serviço', () => {
        const { fixture, raiz, fichaService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
        abrirMenu(raiz, fixture, 'Kane');
        (raiz.querySelector('.detalhe__ficha-menu-item') as HTMLButtonElement).click();
        fixture.detectChanges();

        (raiz.querySelector('.dialogo__fundo') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(raiz.querySelector('.dialogo')).toBeNull();
        expect(fichaService.duplicarFicha).not.toHaveBeenCalled();
      });

      it('confirmar chama FichaService.duplicarFicha e recarrega a lista', () => {
        const { fixture, raiz, fichaService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
        expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);
        abrirMenu(raiz, fixture, 'Kane');
        (raiz.querySelector('.detalhe__ficha-menu-item') as HTMLButtonElement).click();
        fixture.detectChanges();

        (raiz.querySelector('.dialogo .botao--primario') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(fichaService.duplicarFicha).toHaveBeenCalledWith(3);
        expect(fichaService.listarFichas).toHaveBeenCalledTimes(2);
        expect(raiz.querySelector('.dialogo')).toBeNull();
      });
    });

    describe('remover da campanha', () => {
      it('chama FichaService.atribuirCampanha(id, null) direto, sem dialog, e some o mini-card na hora', () => {
        const { fixture, raiz, fichaService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
        abrirMenu(raiz, fixture, 'Vera');

        (raiz.querySelectorAll('.detalhe__ficha-menu-item')[1] as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
        expect(raiz.querySelector('.dialogo')).toBeNull();
        expect(raiz.textContent).not.toContain('Vera');
      });
    });

    describe('excluir', () => {
      it('abre a dialog de confirmação com o nome da ficha', () => {
        const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
        abrirMenu(raiz, fixture, 'Vera');

        (raiz.querySelectorAll('.detalhe__ficha-menu-item')[2] as HTMLButtonElement).click();
        fixture.detectChanges();

        const dialog = raiz.querySelector('.dialogo');
        expect(dialog).not.toBeNull();
        expect(dialog?.textContent).toContain('Excluir');
        expect(dialog?.textContent).toContain('Vera');
      });

      it('cancelar fecha a dialog sem chamar o serviço', () => {
        const { fixture, raiz, fichaService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
        abrirMenu(raiz, fixture, 'Vera');
        (raiz.querySelectorAll('.detalhe__ficha-menu-item')[2] as HTMLButtonElement).click();
        fixture.detectChanges();

        (raiz.querySelector('.dialogo .botao--secundario') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(raiz.querySelector('.dialogo')).toBeNull();
        expect(fichaService.excluirFicha).not.toHaveBeenCalled();
      });

      it('confirmar chama FichaService.excluirFicha e remove o mini-card na hora', () => {
        const { fixture, raiz, fichaService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
        abrirMenu(raiz, fixture, 'Vera');
        (raiz.querySelectorAll('.detalhe__ficha-menu-item')[2] as HTMLButtonElement).click();
        fixture.detectChanges();

        (raiz.querySelector('.dialogo .botao--primario') as HTMLButtonElement).click();
        fixture.detectChanges();

        expect(fichaService.excluirFicha).toHaveBeenCalledWith(4);
        expect(raiz.querySelector('.dialogo')).toBeNull();
        expect(raiz.textContent).not.toContain('Vera');
      });
    });
  });
});
