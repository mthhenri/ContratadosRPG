import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import {
  ArquetipoEnum,
  ClasseEnum,
  NivelAmeacaEnum,
  RolagemVisibilidadeEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import {
  CampanhaAlteradaDto,
  CampanhaMembroEntradaDto,
  CampanhaMembroResumoDto,
  CampanhaRecuperadaDto,
} from '@contratados-rpg/shared/dtos/campanha';
import type {
  FichaAcessoResumoDto,
  FichaResumoDto,
  FichaVisibilidadeAlteradaDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaDetalhe } from './detalhe.page';
import { BandejaDadosService } from '../../../../shared/bandeja-dados/bandeja-dados.service';
import { CampanhaService } from '../../campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { EncontroService } from '../../../encontro/encontro.service';
import type { EncontroResumoDto } from '@contratados-rpg/shared/dtos/encontro';
import { EncontroStatusEnum } from '@contratados-rpg/shared/enums';
import { CadernoFlutuante } from '../../../pagina-caderno/caderno-flutuante.component';
import { PaginaCadernoService } from '../../../pagina-caderno/pagina-caderno.service';

/**
 * Prova o redesenho m2-19 da visão do mestre em `/painel/:id`: banner de alerta condicional,
 * tira de estatísticas (só "Convite"), tira de rolagens recentes com "Ver tudo", coluna "Membros"
 * simplificada (sem fichas) e coluna "Esquadrão" (grid achatado das fichas de jogador, com o nome
 * do dono em cada card, mais a subseção "Criaturas") — mais o menu kebab de ações da campanha no
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
    naBase: true,
  };

  function membrosCom(usuarioId: number, papel: TipoCampanhaMembroPapelEnum): CampanhaMembroResumoDto[] {
    return [{ usuarioId, nome: 'Agente', papel, fichas: [] }];
  }

  function rolagem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
    return {
      id: 1,
      fichaId: 3,
      encontroCombatenteId: null,
      campanhaId: CAMPANHA_ID,
      usuarioId: 1,
      nomeAutor: 'Mestre',
      nomeFicha: 'Kane',
      rotulo: '1d20+5',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 5, total: 17 },
      createdDate: new Date().toISOString(),
      corFicha: null,
      ...sobrescritas,
    };
  }

  function montar(opts: {
    usuarioId: number;
    membros: CampanhaMembroResumoDto[];
    fichas?: FichaResumoDto[];
    rolagens?: RolagemResumoDto[];
    alterarRetorno?: Observable<CampanhaAlteradaDto>;
    campanha?: Partial<CampanhaRecuperadaDto>;
    /** Encontros de combate da campanha — alimentam o tile "Combate" da tira (m7-06). */
    encontros?: EncontroResumoDto[];
  }) {
    // m3-65: em produção, `membro.fichas` (listarMembros) e `fichas()` (listarFichas) vêm da
    // mesma visibilidade no backend — nunca inconsistentes. Aqui, quando o teste não declara
    // `fichas` explicitamente no membro (caso comum: só quer testar comportamento normal, não
    // carteirinha/oculta), sintetiza a partir de `opts.fichas` como acesso completo, preservando
    // esse invariante sem precisar repetir a lista em todo teste que já passa `fichas`.
    const membrosComFichas = opts.membros.map((membro) => ({
      ...membro,
      fichas:
        membro.fichas.length > 0
          ? membro.fichas
          : (opts.fichas ?? [])
              .filter((ficha) => ficha.usuarioId === membro.usuarioId)
              .map((ficha) => ({
                id: ficha.id,
                nome: ficha.nome,
                classe: ficha.classe,
                arquetipo: ficha.arquetipo,
                imagemUrl: ficha.imagemUrl,
                cor: ficha.cor ?? null,
                acessoCompleto: true,
              })),
    }));
    const campanhaService = {
      recuperarCampanha: vi.fn(() => of({ ...campanhaBase, ...opts.campanha })),
      listarMembros: vi.fn(() => of(membrosComFichas)),
      alterarCampanha: vi.fn(() => opts.alterarRetorno ?? of({ ...campanhaBase } as CampanhaAlteradaDto)),
      excluirCampanha: vi.fn(() => of(undefined)),
      regenerarConvite: vi.fn(() => of({ id: CAMPANHA_ID, codigoConvite: 'NOVO' })),
      removerMembro: vi.fn(() => of({ campanhaId: CAMPANHA_ID, usuarioId: 0 })),
      transferirMestre: vi.fn(() =>
        of({ campanhaId: CAMPANHA_ID, mestreAnteriorUsuarioId: 0, novoMestreUsuarioId: 0 }),
      ),
      recuperarInventario: vi.fn(() => of({ itens: [] })),
      alterarEstado: vi.fn((_id: number, naBase: boolean) => of({ id: CAMPANHA_ID, naBase })),
      adicionarItemInventario: vi.fn(() => of({ itens: [] })),
      ajustarQuantidadeItemInventario: vi.fn(() => of({ itens: [] })),
      removerItemInventario: vi.fn(() => of({ itens: [] })),
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
            arquetipo: ficha?.arquetipo ?? null,
            prestigio: ficha?.prestigio ?? 0,
            // `<app-ficha-visualizacao>` embutida na visão do jogador (m2-20) precisa do
            // documento completo — os campos abaixo não existiam neste mock (usado antes só
            // para o `FichaVitalidadeRapidaService`, que só lê `estado`).
            atributos: {
              destreza: 1,
              forca: 1,
              luta: 1,
              pontaria: 1,
              vigor: 1,
              intelecto: 1,
              medicina: 1,
              sentidos: 1,
              social: 1,
              vontade: 1,
            },
            maestria: null,
            habilidades: [],
            inventario: { itens: [], amplificadores: [] },
            anotacoes: '',
            estado: {
              vidaAtual: ficha?.vidaAtual ?? 0,
              vidaMaxima: ficha?.vidaMaxima,
              energiaAtual: ficha?.energiaAtual ?? 0,
              energiaMaxima: ficha?.energiaMaxima,
              sequelas: [],
              traumas: [],
              lesoes: [],
            },
          },
        });
      }),
      alterarFicha: vi.fn((id: number, dto: { nome: string; dados: unknown }) =>
        of({ id, campanhaId: CAMPANHA_ID, usuarioId: 0, nome: dto.nome, dados: dto.dados }),
      ),
      alterarVitalidade: vi.fn((id: number, dto: { vidaAtual?: number; energiaAtual?: number }) =>
        of({ id, campanhaId: CAMPANHA_ID, usuarioId: 0, dados: { estado: dto } }),
      ),
      duplicarFicha: vi.fn((id: number) =>
        of({ id: 100, campanhaId: CAMPANHA_ID, usuarioId: opts.usuarioId, nome: `Clone de ${id} (cópia)` }),
      ),
      excluirFicha: vi.fn(() => of(undefined)),
      atribuirCampanha: vi.fn((id: number) => of({ id, campanhaId: null })),
      listarAcessos: vi.fn(() => of([] as FichaAcessoResumoDto[])),
      concederAcesso: vi.fn((fichaId: number, usuarioId: number) => of({ id: 1, fichaId, usuarioId })),
      revogarAcesso: vi.fn((fichaId: number, usuarioId: number) => of({ fichaId, usuarioId })),
      pegarItemInventario: vi.fn(() => of({ id: 1 })),
      mandarItemInventarioParaBase: vi.fn(() => of({ id: 1 })),
    };
    const rolagemService = {
      listarPorCampanha: vi.fn(() => of(opts.rolagens ?? [])),
    };
    const sessaoService = { usuario: () => ({ id: opts.usuarioId, login: 'x', nome: 'x' }) };
    const paginaCadernoService = {
      listarPaginas: vi.fn(() => of([])),
      listarPaginasMembro: vi.fn(() => of([])),
      recuperarPagina: vi.fn(),
      criarPagina: vi.fn(),
      alterarPagina: vi.fn(),
      excluirPagina: vi.fn(),
      buscarCampanha: vi.fn(() =>
        of({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 }),
      ),
    };

    // Tile "Combate" (m7-06): a listagem de encontros da campanha alimenta o atalho da tira de
    // estatísticas. Vazia por padrão — os testes que precisam de um combate aberto sobrescrevem.
    const encontroService = { listarPorCampanha: vi.fn(() => of(opts.encontros ?? [])) };

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(() => Promise.resolve()) },
      configurable: true,
    });

    // Stub do tempo real (m2-16, trazido da extinta FichaLista; +m2-16c item 1: `ficha:alterada`):
    // `Subject`s controláveis para os eventos da sala e um Signal de reconexão.
    const fichaCriada$ = new Subject<FichaResumoDto>();
    const membroEntrou$ = new Subject<CampanhaMembroEntradaDto>();
    const fichaAlterada$ = new Subject<unknown>();
    const fichaVisibilidadeAlterada$ = new Subject<FichaVisibilidadeAlteradaDto>();
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const estadoAlterado$ = new Subject<{ id: number; naBase: boolean }>();
    const inventarioAlterado$ = new Subject<{ campanhaId: number }>();
    const encontroAlterado$ = new Subject<{ encontro: { campanhaId: number } }>();
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
      fichaVisibilidadeAlterada$: fichaVisibilidadeAlterada$.asObservable(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable(),
      estadoAlterado$: estadoAlterado$.asObservable(),
      inventarioAlterado$: inventarioAlterado$.asObservable(),
      encontroAlterado$: encontroAlterado$.asObservable(),
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
        { provide: EncontroService, useValue: encontroService },
        { provide: PaginaCadernoService, useValue: paginaCadernoService },
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
      encontroService,
      fichaCriada$,
      membroEntrou$,
      fichaAlterada$,
      fichaVisibilidadeAlterada$,
      rolagemRegistrada$,
      reconexao,
      navegar,
    };
  }

  const mestre = () => ({ usuarioId: 1, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });
  const jogador = () => ({ usuarioId: 2, membros: membrosCom(1, TipoCampanhaMembroPapelEnum.MESTRE) });

  // Campanha com o mestre (id 1) e um jogador (id 2) — base da gestão de membros (m2-13).
  const membrosDois = (): CampanhaMembroResumoDto[] => [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
  ];

  it('monta o caderno e abre resultado de ficha diretamente nas anotações', () => {
    const { fixture, navegar } = montar(mestre());
    const caderno = fixture.debugElement.query(By.directive(CadernoFlutuante))
      .componentInstance as CadernoFlutuante;

    caderno.abrirFicha.emit(42);

    expect(navegar).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'ficha', 42], {
      fragment: 'anotacoes',
    });
  });

  // Campanha com mestre + dois jogadores — base dos testes de "Acesso de visualização" (só o
  // 3º membro é elegível a receber acesso da ficha do jogador `usuarioId: 2`: o mestre já vê tudo,
  // e o próprio dono não concede acesso a si mesmo).
  const membrosTres = (): CampanhaMembroResumoDto[] => [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
    { usuarioId: 3, nome: 'Colega', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
  ];

  function abrirMenuCampanha(raiz: HTMLElement, fixture: ReturnType<typeof montar>['fixture']) {
    (raiz.querySelector('.detalhe__cabecalho-menu-botao') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function encontrarItemMenu(raiz: HTMLElement, texto: string): HTMLButtonElement {
    const item = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__cabecalho-menu-item')).find(
      (botao) => botao.textContent?.replace(/\s+/g, ' ').trim().includes(texto),
    );
    if (!item) {
      throw new Error(`Item de menu "${texto}" não encontrado`);
    }
    return item;
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
        { usuarioId: 2, nome: 'Zeca', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
        { usuarioId: 1, nome: 'Ômega', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
        { usuarioId: 3, nome: 'Ana', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
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

    // m2-21 (item 6): o jogador deixou de ficar sem kebab — ganhou o dele, no mesmo lugar, com as
    // ações de FICHA (criar/vincular). O que ele continua não vendo são as ações de CAMPANHA.
    it('dá ao jogador o kebab de ficha, nunca o de campanha (Editar/Excluir)', () => {
      const { fixture, raiz } = montar(jogador());
      const botao = raiz.querySelector('.detalhe__cabecalho-menu-botao');
      expect(botao?.getAttribute('aria-label')).toBe('Ações de ficha');

      abrirMenuCampanha(raiz, fixture);
      const itens = Array.from(raiz.querySelectorAll('.detalhe__cabecalho-menu-item')).map((item) =>
        item.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(itens).toEqual([
        'Criar nova ficha',
        'Vincular ficha existente',
        'Acesso de visualização',
        'Remover da campanha',
        'Excluir ficha',
      ]);
    });

    it('posiciona Iniciativa no card Sessão do jogador, fora do menu de ações da ficha', () => {
      const { fixture, raiz } = montar(jogador());

      const acessoIniciativa = raiz.querySelector('.detalhe__sessao-iniciativa');
      expect(acessoIniciativa?.closest('.detalhe__sessao')).not.toBeNull();
      expect(acessoIniciativa?.textContent?.trim()).toBe('Iniciativa');
      expect(acessoIniciativa?.getAttribute('href')).toBe(`/painel/${CAMPANHA_ID}/iniciativa`);

      abrirMenuCampanha(raiz, fixture);
      const iniciativaNoMenu = Array.from(
        raiz.querySelectorAll('.detalhe__cabecalho-menu-item'),
      ).some((item) => item.textContent?.includes('Iniciativa'));
      expect(iniciativaNoMenu).toBe(false);
    });

    it('abre o menu com Iniciativa/Editar/Excluir e fecha ao clicar no fundo', () => {
      const { fixture, raiz } = montar(mestre());

      abrirMenuCampanha(raiz, fixture);
      const itens = raiz.querySelectorAll('.detalhe__cabecalho-menu-item');
      expect(itens).toHaveLength(3);
      expect(itens[0].textContent).toContain('Iniciativa');
      expect(itens[1].textContent).toContain('Editar');
      expect(itens[2].textContent).toContain('Excluir');

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
      (raiz.querySelectorAll('.detalhe__cabecalho-menu-item')[1] as HTMLButtonElement).click();
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
      (raiz.querySelectorAll('.detalhe__cabecalho-menu-item')[2] as HTMLButtonElement).click();
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
      (raiz.querySelectorAll('.detalhe__cabecalho-menu-item')[2] as HTMLButtonElement).click();
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
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
          { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
        ]),
      );

      (raiz.querySelectorAll('.detalhe__membro-acoes button')[0] as HTMLButtonElement).click();
      fixture.detectChanges();
      (raiz.querySelector('.detalhe__membro-confirmacao .botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(campanhaService.transferirMestre).toHaveBeenCalledWith(CAMPANHA_ID, 2);
      expect(raiz.querySelector('.detalhe__membro-acoes')).toBeNull();
      // m2-21: o kebab não some — vira o do jogador (ações de ficha), já que quem transferiu o
      // mestre virou jogador. O que sai são as ações de campanha.
      expect(
        raiz.querySelector('.detalhe__cabecalho-menu-botao')?.getAttribute('aria-label'),
      ).toBe('Ações de ficha');
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
      imagemUrl: null,
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
      imagemUrl: null,
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
      imagemUrl: null,
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

  // m3-65: Kane pertence ao mestre em `fichas` (banner/Esquadrão usam esse dono) — mas a Equipe do
  // jogador nunca mostra ficha do mestre (nem carteirinha), então os testes que exercitam "ver a
  // ficha de um colega" pela Equipe precisam de um colega **jogador** de verdade. Reatribui Kane
  // pro "Colega" (`usuarioId: 3`, de `membrosTres()`) só pra esses testes, sem tocar no fixture
  // compartilhado (`fichas`) usado pelas telas do mestre.
  const fichasComColegaJogador = (): FichaResumoDto[] =>
    fichas.map((ficha) => (ficha.id === 3 ? { ...ficha, usuarioId: 3 } : ficha));

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

  // === "Ver como jogador" (preview do mestre) ===
  describe('"Ver como jogador" (preview do mestre)', () => {
    it('não mostra a opção quando a campanha não tem jogadores', () => {
      const { fixture, raiz } = montar(mestre());

      abrirMenuCampanha(raiz, fixture);
      expect(raiz.querySelectorAll('.detalhe__cabecalho-menu-item')).toHaveLength(3);
    });

    it('mostra "Ver como jogador" como 3º item quando há jogadores na campanha', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois() });

      abrirMenuCampanha(raiz, fixture);
      expect(encontrarItemMenu(raiz, 'Ver como jogador')).not.toBeNull();
    });

    it('clicar em "Ver como jogador" lista os jogadores da campanha, com "Voltar"', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosTres() });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();

      const itens = Array.from(raiz.querySelectorAll('.detalhe__cabecalho-menu-item')).map((item) =>
        item.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(itens).toEqual(['Colega', 'Jogador', 'Voltar']);
    });

    it('"Voltar" volta pras ações normais do menu', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois() });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Voltar').click();
      fixture.detectChanges();

      const itens = Array.from(raiz.querySelectorAll('.detalhe__cabecalho-menu-item')).map((item) =>
        item.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(itens).toEqual(['Iniciativa', 'Editar', 'Excluir', 'Ver como jogador']);
    });

    it('escolher um jogador troca para o layout de jogador, mostrando a ficha própria dele', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Jogador').click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__grade')).toBeNull();
      expect(raiz.querySelector('.detalhe__jogador')).not.toBeNull();
      expect(raiz.querySelector('.card__titulo')?.textContent?.trim()).toBe('Vera');
    });

    it('escolher um jogador sem ficha mostra o estado vazio dele', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosTres(), fichas });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Colega').click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__jogador-vazio')).not.toBeNull();
    });

    it('mostra a barra de "Visualizando como X" e trava a interação do conteúdo', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Jogador').click();
      fixture.detectChanges();

      const barra = raiz.querySelector('.detalhe__preview-barra');
      expect(barra?.textContent).toContain('Visualizando como');
      expect(barra?.textContent).toContain('Jogador');

      const conteudo = raiz.querySelector('.detalhe__conteudo');
      expect(conteudo?.classList.contains('detalhe__conteudo--bloqueado')).toBe(true);
    });

    it('"Sair da visualização" volta ao layout de mestre', () => {
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Jogador').click();
      fixture.detectChanges();

      (raiz.querySelector('.detalhe__preview-sair') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__preview-barra')).toBeNull();
      expect(raiz.querySelector('.detalhe__grade')).not.toBeNull();
      expect(raiz.querySelector('.detalhe__jogador')).toBeNull();
    });

    it('a área de conteúdo não fica travada fora do preview', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      expect(raiz.querySelector('.detalhe__conteudo')?.classList.contains('detalhe__conteudo--bloqueado')).toBe(
        false,
      );
    });

    it('permissão de edição no preview segue o jogador emulado, não o mestre real', () => {
      const fichasComColega: FichaResumoDto[] = [
        fichas[0],
        fichas[1],
        { ...fichas[1], id: 6, usuarioId: 3, nome: 'Rex' },
      ];
      const { fixture, raiz } = montar({ usuarioId: 1, membros: membrosTres(), fichas: fichasComColega });

      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Ver como jogador').click();
      fixture.detectChanges();
      encontrarItemMenu(raiz, 'Jogador').click();
      fixture.detectChanges();

      // Ficha própria (Vera, do "Jogador" emulado, usuarioId 2): ações de dono habilitadas.
      abrirMenuCampanha(raiz, fixture);
      expect(encontrarItemMenu(raiz, 'Excluir ficha').disabled).toBe(false);

      // Troca pra ficha de um colega (Rex, usuarioId 3, via "Ver ficha" na Equipe): sem ações de dono.
      const botaoRex = Array.from(raiz.querySelectorAll('.detalhe__equipe-ficha')).find((botao) =>
        botao.textContent?.includes('Rex'),
      ) as HTMLButtonElement;
      botaoRex.click();
      fixture.detectChanges();

      expect(encontrarItemMenu(raiz, 'Excluir ficha').disabled).toBe(true);
    });
  });

  // === Tira de estatísticas (item 2) ===
  describe('tira de estatísticas (item 2)', () => {
    it('mostra só Convite e Combate — Membros/Fichas/Alertas saíram da tira', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      const stats = Array.from(raiz.querySelectorAll('.detalhe__estatisticas .stat'));
      const rotulos = stats.map((stat) => stat.querySelector('.stat__rotulo')?.textContent?.trim());

      // "Combate" entrou na m7-06 como a porta de entrada da tela "Iniciativa" — até então o único
      // caminho até ela era o menu "⋯" do cabeçalho.
      expect(rotulos).toEqual(['Convite', 'Combate']);
    });

    it('o tile de Combate mostra o combate aberto e leva à tela "Iniciativa"', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas,
        encontros: [
            {
              id: 3,
              campanhaId: CAMPANHA_ID,
              nome: 'Contenção no Setor 12',
              status: EncontroStatusEnum.ATIVO,
              rodadaAtual: 4,
              quantidadeCombatentes: 5,
              createdDate: '2026-08-18T00:00:00.000Z',
            },
        ],
      });

      const tile = raiz.querySelector('.detalhe__stat-encontro');
      expect(tile?.querySelector('.detalhe__encontro-nome')?.textContent?.trim()).toBe(
        'Contenção no Setor 12',
      );
      expect(tile?.querySelector('.detalhe__encontro-meta')?.textContent?.replace(/\s+/g, ' ').trim())
        .toBe('Em combate · Rodada 4');
      expect(tile?.querySelector('.detalhe__encontro-acao')?.getAttribute('href')).toBe(
        `/painel/${CAMPANHA_ID}/iniciativa`,
      );
    });

    it('sem combate aberto, o tile conta os encerrados e convida a iniciar', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas,
        encontros: [
            {
              id: 1,
              campanhaId: CAMPANHA_ID,
              nome: 'Primeiro contato',
              status: EncontroStatusEnum.ENCERRADO,
              rodadaAtual: 6,
              quantidadeCombatentes: 4,
              createdDate: '2026-08-17T00:00:00.000Z',
            },
        ],
      });

      const tile = raiz.querySelector('.detalhe__stat-encontro');
      expect(tile?.querySelector('.detalhe__encontro-nome')?.textContent?.trim()).toBe(
        'Nenhum em andamento',
      );
      expect(tile?.querySelector('.detalhe__encontro-meta')?.textContent?.replace(/\s+/g, ' ').trim())
        .toBe('1 encerrado');
      expect(tile?.querySelector('.detalhe__encontro-acao')?.textContent?.trim()).toBe('Iniciar');
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

    it('hover no dadinho d20 do pill mostra o resultado na bandeja de dados flutuante', () => {
      const { fixture, raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        rolagens: [rolagem({ id: 1, rotulo: '1d20+5', nomeAutor: 'Mestre' })],
      });
      const bandeja = TestBed.inject(BandejaDadosService);

      const d20 = raiz.querySelector('.rolagem-pill__d20') as HTMLButtonElement;
      d20.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();

      expect(bandeja.entradas()).toHaveLength(1);
      expect(bandeja.entradas()[0].rotulo).toBe('1d20+5');
      expect(bandeja.entradas()[0].resultado.total).toBe(17);
      // `semAutoSumir` (ajuste pós-m2-19): a prévia é atrelada ao hover, não a uma rolagem nova — sem
      // timer nem a barra de tempo que o anuncia; só o `mouseleave`/`blur` fecha (próximo teste).
      expect(bandeja.entradas()[0].semAutoSumir).toBe(true);
    });

    it('tirar o mouse do dadinho d20 fecha a prévia (não espera o auto-sumir de 7s)', () => {
      const { fixture, raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        rolagens: [rolagem({ id: 1, rotulo: '1d20+5', nomeAutor: 'Mestre' })],
      });
      const bandeja = TestBed.inject(BandejaDadosService);

      const d20 = raiz.querySelector('.rolagem-pill__d20') as HTMLButtonElement;
      d20.dispatchEvent(new Event('mouseenter'));
      fixture.detectChanges();
      d20.dispatchEvent(new Event('mouseleave'));
      fixture.detectChanges();

      expect(bandeja.entradas()[0].saindo).toBe(true);
    });

    it('a prévia continua enquanto o mouse fica no dadinho, mesmo além dos 7s do auto-sumir padrão', () => {
      vi.useFakeTimers();
      try {
        const { fixture, raiz } = montar({
          usuarioId: 1,
          membros: membrosDois(),
          rolagens: [rolagem({ id: 1, rotulo: '1d20+5', nomeAutor: 'Mestre' })],
        });
        const bandeja = TestBed.inject(BandejaDadosService);

        const d20 = raiz.querySelector('.rolagem-pill__d20') as HTMLButtonElement;
        d20.dispatchEvent(new Event('mouseenter'));
        fixture.detectChanges();

        vi.advanceTimersByTime(bandeja.duracaoMs + 1000);

        expect(bandeja.entradas()).toHaveLength(1);
        expect(bandeja.entradas()[0].saindo).toBe(false);
      } finally {
        vi.useRealTimers();
      }
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
            imagemUrl: null,
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
            imagemUrl: null,
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

    it('mostra o avatar da ficha quando ela tem imagemUrl, e o placeholder quando não tem', () => {
      const { raiz } = montar({
        usuarioId: 1,
        membros: membrosDois(),
        fichas: [{ ...fichas[0], imagemUrl: 'https://exemplo.com/kane.png' }, fichas[1]],
      });

      const cartoes = Array.from(raiz.querySelectorAll('.detalhe__ficha-card'));
      const kane = cartoes.find((c) => c.textContent?.includes('Kane'))!;
      const vera = cartoes.find((c) => c.textContent?.includes('Vera'))!;

      expect(kane.querySelector('.detalhe__ficha-avatar')).not.toBeNull();
      const imagemKane = kane.querySelector('.detalhe__ficha-avatar-imagem') as HTMLImageElement;
      expect(imagemKane).not.toBeNull();
      expect(imagemKane.getAttribute('src')).toBe('https://exemplo.com/kane.png');

      expect(vera.querySelector('.detalhe__ficha-avatar')).not.toBeNull();
      expect(vera.querySelector('.detalhe__ficha-avatar-imagem')).toBeNull();
    });

    it('"Novo Agente" abre o assistente de criação, sem criar de imediato', () => {
      const { raiz, fichaService, navegar } = montar({ usuarioId: 1, membros: membrosDois() });

      expect(raiz.querySelector('app-ficha-criar-dialog')).toBeNull();

      const botoes = Array.from(raiz.querySelectorAll('.detalhe__nova-ficha'));
      const botaoNovoAgente = botoes.find((botao) => botao.textContent?.includes('Novo Agente')) as HTMLButtonElement;
      botaoNovoAgente.click();
      expect(fichaService.criarFicha).not.toHaveBeenCalled();
      expect(navegar).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'ficha', 'nova']);
    });

    it('"Nova Criatura" navega para o assistente de criação de criatura', () => {
      const { raiz, navegar } = montar({ usuarioId: 1, membros: membrosDois() });

      const botoes = Array.from(raiz.querySelectorAll('.detalhe__nova-ficha'));
      const botaoNovaCriatura = botoes.find((botao) => botao.textContent?.includes('Nova Criatura')) as HTMLButtonElement;
      botaoNovaCriatura.click();
      expect(navegar).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'criatura', 'nova']);
    });

    // "Criaturas" divide a coluna "Esquadrão" com as fichas de jogador (m4-04+) — mesma fila de
    // fichas visíveis (`fichas()`), separada por `tipo`.
    describe('subseção "Criaturas" (m4-04+)', () => {
      const fichasComCriatura: FichaResumoDto[] = [
        {
          id: 3,
          campanhaId: CAMPANHA_ID,
          campanhaNome: null,
          imagemUrl: null,
          usuarioId: 1,
          nome: 'Kane',
          tipo: TipoFichaEnum.JOGADOR,
          classe: ClasseEnum.COMBATENTE,
          arquetipo: ArquetipoEnum.LUTADOR,
          nivel: 2,
          vidaAtual: 40,
          vidaMaxima: 49,
          energiaAtual: 10,
          energiaMaxima: 27,
          morrendo: false,
          machucado: false,
          inconsciente: false,
        },
        {
          id: 9,
          campanhaId: CAMPANHA_ID,
          campanhaNome: null,
          imagemUrl: null,
          usuarioId: 1,
          nome: 'A Estátua',
          tipo: TipoFichaEnum.CRIATURA,
          na: NivelAmeacaEnum.MEDIA,
          classe: null as unknown as ClasseEnum,
          arquetipo: null,
          nivel: 0,
          vidaAtual: 1050,
          vidaMaxima: 1050,
          energiaAtual: 0,
          energiaMaxima: 0,
          morrendo: false,
          machucado: false,
          inconsciente: false,
          defesa: 30,
        },
      ];

      it('separa jogador (Esquadrão) e criatura (Criaturas) em listas próprias', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas: fichasComCriatura });

        const gridEsquadrao = raiz.querySelector('.detalhe__esquadrao-grid');
        expect(gridEsquadrao?.textContent).toContain('Kane');
        expect(gridEsquadrao?.textContent).not.toContain('A Estátua');

        const listaCriaturas = raiz.querySelector('.detalhe__secao--criaturas')?.nextElementSibling;
        expect(listaCriaturas?.textContent).toContain('A Estátua');
        expect(listaCriaturas?.textContent).toContain('NA');
        expect(listaCriaturas?.textContent).not.toContain('Kane');
      });

      it('mostra o estado vazio quando não há criatura na campanha', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas: [fichasComCriatura[0]] });

        expect(raiz.querySelector('.detalhe__secao--criaturas')?.nextElementSibling?.textContent).toContain(
          'Nenhuma criatura registrada ainda.',
        );
      });

      it('a criatura liga à sua tela de visualização, mesmo padrão do card de ficha (m4-04b)', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas: fichasComCriatura });

        const listaCriaturas = raiz.querySelector('.detalhe__secao--criaturas')?.nextElementSibling as HTMLElement;
        const link = listaCriaturas.querySelector('.detalhe__ficha-link') as HTMLAnchorElement;
        expect(link.getAttribute('href')).toBe(`/painel/${CAMPANHA_ID}/criatura/9`);
      });

      it('duplo clique no cartão da criatura abre a ficha de criatura', () => {
        const { raiz, navegar } = montar({ usuarioId: 1, membros: membrosDois(), fichas: fichasComCriatura });

        const listaCriaturas = raiz.querySelector('.detalhe__secao--criaturas')?.nextElementSibling as HTMLElement;
        const cartao = listaCriaturas.querySelector('.detalhe__ficha-card') as HTMLElement;
        cartao.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

        expect(navegar).toHaveBeenCalledWith(['/painel', CAMPANHA_ID, 'criatura', 9]);
      });

      // `window.open` é global — restaura o spy no fim, senão o próximo teste que o usar herdaria
      // a chamada já registrada neste (mesmo cuidado do card de ficha de jogador, acima).
      it('clique do meio no cartão da criatura abre a ficha de criatura numa nova aba', () => {
        const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas: fichasComCriatura });
        const abrirNovaAba = vi.spyOn(window, 'open').mockReturnValue(null);
        try {
          const listaCriaturas = raiz.querySelector('.detalhe__secao--criaturas')?.nextElementSibling as HTMLElement;
          const cartao = listaCriaturas.querySelector('.detalhe__ficha-card') as HTMLElement;
          cartao.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }));

          expect(abrirNovaAba).toHaveBeenCalledWith(`/painel/${CAMPANHA_ID}/criatura/9`, '_blank', 'noopener');
        } finally {
          abrirNovaAba.mockRestore();
        }
      });
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
      imagemUrl: null,
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

    it('refaz o recorte autorizado ao receber ficha:visibilidade-alterada', () => {
      const { fichaService, campanhaService, fichaVisibilidadeAlterada$ } = montar({
        usuarioId: 2,
        membros: membrosDois(),
        fichas,
      });
      expect(fichaService.listarFichas).toHaveBeenCalledTimes(1);

      fichaVisibilidadeAlterada$.next({ fichaId: 3, campanhaId: CAMPANHA_ID });

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

    // m2-20: jogador comum não vê mais o grid "Esquadrão" (substituído pela própria ficha
    // embutida + coluna "Equipe") — a mesma regra de permissão (`podeAjustarFicha`) agora se
    // expressa em `podeAjustarFichaExibida()`, consumido pelo `[ajustavel]` da ficha embutida.

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

    it('agenda a persistência em lote dedicada só depois do debounce', () => {
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
        expect(fichaService.alterarVitalidade).not.toHaveBeenCalled();

        vi.advanceTimersByTime(300);
        expect(fichaService.recuperarFicha).not.toHaveBeenCalled();
        expect(fichaService.alterarFicha).not.toHaveBeenCalled();
        expect(fichaService.alterarVitalidade).toHaveBeenCalledTimes(1);
        expect(fichaService.alterarVitalidade).toHaveBeenCalledWith(4, { vidaAtual: 17 });
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

    // m2-20: idem — o menu kebab do mini-card só existe no grid "Esquadrão" (visão do mestre);
    // ver a visão do jogador em `describe('visão do jogador (m2-20)')`.

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

  // === Visão do JOGADOR (m2-20) — substitui o grid "Esquadrão" por: a própria ficha completa
  // embutida na coluna principal, e uma coluna lateral estreita (Equipe + Sessão). ===
  describe('visão do jogador (m2-20)', () => {
    it('mestre continua vendo o grid "Esquadrão" (@if ehMestre), não a visão do jogador', () => {
      const { raiz } = montar({ usuarioId: 1, membros: membrosDois(), fichas });

      expect(raiz.querySelector('.detalhe__esquadrao-grid')).not.toBeNull();
      expect(raiz.querySelector('.detalhe__jogador')).toBeNull();
    });

    it('jogador vê a própria ficha embutida (não o grid "Esquadrão") e "Equipe" com os colegas visíveis', () => {
      const { raiz, fichaService } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador(),
      });

      expect(raiz.querySelector('.detalhe__grade')).toBeNull();
      expect(raiz.querySelector('.detalhe__jogador')).not.toBeNull();
      // Seleção inicial (item 2): a própria ficha (Vera, `usuarioId: 2`, a 1ª na lista).
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(4);
      expect(raiz.querySelector('app-ficha-visualizacao')).not.toBeNull();

      // "Ver ficha" (item 7) — um botão por ficha visível de cada colega (Kane do Colega, Vera e
      // Zeta, as duas do próprio jogador). O mestre nunca entra aqui (m3-65).
      const botoes = Array.from(raiz.querySelectorAll('.detalhe__equipe-ficha')).map((el) =>
        el.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(botoes.some((texto) => texto?.includes('Kane'))).toBe(true);
      expect(botoes.some((texto) => texto?.includes('Vera'))).toBe(true);
      expect(botoes.some((texto) => texto?.includes('Zeta'))).toBe(true);
    });

    it('"Ver ficha" troca a ficha exibida sem navegar, e a de um colega vira só leitura', () => {
      const { fixture, raiz, fichaService, navegar } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador(),
      });
      const componente = fixture.componentInstance;

      // Própria ficha (Vera, dona) — editável.
      expect(componente['podeAjustarFichaExibida']()).toBe(true);

      const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Kane'),
      );
      botaoKane?.click();
      fixture.detectChanges();

      expect(navegar).not.toHaveBeenCalled();
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(3);
      expect(componente['fichaExibidaId']()).toBe(3);
      // Ficha de um colega (Colega, usuarioId 3), vista por outro jogador — só leitura.
      expect(componente['podeAjustarFichaExibida']()).toBe(false);
    });

    it('"Abrir completa" aponta para a rota dedicada da ficha exibida no momento', () => {
      const { fixture, raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });

      const botaoZeta = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Zeta'),
      );
      botaoZeta?.click();
      fixture.detectChanges();

      const link = raiz.querySelector('.detalhe__abrir-completa-rodape');
      expect(link?.getAttribute('href')).toBe(`/painel/${CAMPANHA_ID}/ficha/5`);
    });
  });

  // === Ações de ficha no menu do cabeçalho do jogador — remover/excluir agem sobre a ficha
  // exibida na coluna principal, não sobre uma ficha escolhida no menu (que não existe aqui). ===
  describe('ações de ficha no menu do jogador (remover/excluir/acesso)', () => {
    it('desabilita "Remover da campanha"/"Excluir ficha" quando a ficha exibida é de um colega, habilita na própria', () => {
      const { fixture, raiz } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador(),
      });
      abrirMenuCampanha(raiz, fixture);

      expect(encontrarItemMenu(raiz, 'Remover da campanha').disabled).toBe(false);
      expect(encontrarItemMenu(raiz, 'Excluir ficha').disabled).toBe(false);

      const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Kane'),
      );
      botaoKane?.click();
      fixture.detectChanges();

      expect(encontrarItemMenu(raiz, 'Remover da campanha').disabled).toBe(true);
      expect(encontrarItemMenu(raiz, 'Excluir ficha').disabled).toBe(true);
    });

    it('"Remover da campanha" age sobre a ficha exibida, fecha o menu e troca para outra ficha própria', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      abrirMenuCampanha(raiz, fixture);

      encontrarItemMenu(raiz, 'Remover da campanha').click();
      fixture.detectChanges();

      // Ficha exibida inicial é Vera (id 4, primeira própria de `usuarioId: 2`).
      expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
      expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
      // Zeta (id 5) é a outra ficha própria restante — o painel troca para ela sozinho.
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(5);
    });

    it('"Remover da campanha" sem outra ficha própria restante cai no estado vazio do jogador', () => {
      const { fixture, raiz, fichaService } = montar({
        usuarioId: 2,
        membros: membrosDois(),
        fichas: fichas.filter((ficha) => ficha.id !== 5),
      });
      abrirMenuCampanha(raiz, fixture);

      encontrarItemMenu(raiz, 'Remover da campanha').click();
      fixture.detectChanges();

      expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
      expect(raiz.querySelector('.detalhe__jogador-vazio')).not.toBeNull();
    });

    it('"Excluir ficha" abre a confirmação da ficha exibida e fecha o menu; cancelar não chama o serviço', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      abrirMenuCampanha(raiz, fixture);

      encontrarItemMenu(raiz, 'Excluir ficha').click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
      const dialog = raiz.querySelector('.dialogo');
      expect(dialog?.textContent).toContain('Vera');
      expect(fichaService.excluirFicha).not.toHaveBeenCalled();

      (raiz.querySelector('.dialogo .botao--secundario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(raiz.querySelector('.dialogo')).toBeNull();
      expect(fichaService.excluirFicha).not.toHaveBeenCalled();
    });

    it('confirmar "Excluir ficha" chama FichaService.excluirFicha e troca para outra ficha própria', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Excluir ficha').click();
      fixture.detectChanges();

      (raiz.querySelector('.dialogo .botao--primario') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.excluirFicha).toHaveBeenCalledWith(4);
      expect(raiz.querySelector('.dialogo')).toBeNull();
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(5);
    });

    it('desabilita "Acesso de visualização" quando a ficha exibida é de um colega, habilita na própria', () => {
      const { fixture, raiz } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador(),
      });
      abrirMenuCampanha(raiz, fixture);
      expect(encontrarItemMenu(raiz, 'Acesso de visualização').disabled).toBe(false);

      const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Kane'),
      );
      botaoKane?.click();
      fixture.detectChanges();

      expect(encontrarItemMenu(raiz, 'Acesso de visualização').disabled).toBe(true);
    });

    it('"Acesso de visualização" abre a dialog, busca e lista as concessões da ficha exibida, e fecha o menu', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);

      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();

      expect(fichaService.listarAcessos).toHaveBeenCalledWith(4);
      expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
      const dialog = raiz.querySelector('.dialogo');
      expect(dialog?.textContent).toContain('Colega');
    });

    it('a lista de membros elegíveis exclui o mestre, o próprio dono e quem já tem acesso', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();

      const opcoes = Array.from(raiz.querySelectorAll('.acesso__select option')).map((opcao) =>
        opcao.textContent?.trim(),
      );
      expect(opcoes).toEqual(['Selecione um membro…']);
      expect(raiz.querySelector('.acesso__vazio-elegiveis')).not.toBeNull();
    });

    it('conceder acesso chama FichaService.concederAcesso e recarrega a lista', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();

      // `[ngValue]` codifica o `value` do `<option>` no DOM como um id interno do
      // `SelectControlValueAccessor` (não o valor bruto `3`) — seleciona pelo rótulo visível e usa
      // o `.value` real do `<option>` renderizado, em vez de um `seletor.value = '3'` que nunca
      // bateria com nenhum id interno (mesma armadilha que `visualizar.page.spec.ts` evita ao
      // manipular o `FormControl` direto em vez de simular o `<select>`).
      const seletor = raiz.querySelector('.acesso__select') as HTMLSelectElement;
      const opcaoColega = Array.from(seletor.options).find((opcao) => opcao.textContent?.trim() === 'Colega');
      seletor.value = opcaoColega!.value;
      seletor.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      (raiz.querySelector('.acesso__acao') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.concederAcesso).toHaveBeenCalledWith(4, 3);
      expect(fichaService.listarAcessos).toHaveBeenCalledTimes(2);
    });

    it('revogar acesso chama FichaService.revogarAcesso e recarrega a lista', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();

      (raiz.querySelector('.acesso__revogar') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(fichaService.revogarAcesso).toHaveBeenCalledWith(4, 3);
      expect(fichaService.listarAcessos).toHaveBeenCalledTimes(2);
    });

    it('mostra a contagem de acessos concedidos no item do menu', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();
      (raiz.querySelector('.dialogo__fundo') as HTMLButtonElement).click();
      fixture.detectChanges();
      abrirMenuCampanha(raiz, fixture);

      const contagem = encontrarItemMenu(raiz, 'Acesso de visualização').querySelector(
        '.detalhe__cabecalho-menu-contagem',
      );
      expect(contagem?.textContent?.trim()).toBe('1');
    });

    it('reseta a contagem do badge (e a lista da dialog) ao trocar de ficha exibida, mesmo sem reabrir "Acesso de visualização"', () => {
      const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
      // Ficha exibida inicial (Vera, id 4) tem 1 concessão.
      fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
      abrirMenuCampanha(raiz, fixture);
      encontrarItemMenu(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();
      (raiz.querySelector('.dialogo__fundo') as HTMLButtonElement).click();
      fixture.detectChanges();

      // Troca para a outra ficha própria (Zeta, id 5) via "Ver ficha" — sem reabrir a dialog. Sem o
      // reset do achado da revisão final, o badge continuaria mostrando a contagem "1" de Vera.
      const botaoZeta = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Zeta'),
      );
      botaoZeta?.click();
      fixture.detectChanges();

      abrirMenuCampanha(raiz, fixture);
      const contagem = encontrarItemMenu(raiz, 'Acesso de visualização').querySelector(
        '.detalhe__cabecalho-menu-contagem',
      );
      expect(contagem).toBeNull();
    });
  });

  describe('Equipe (m3-65 — completa + carteirinha)', () => {
    it('lista todo mundo, mesmo quem não tem ficha nenhuma na campanha', () => {
      const { raiz } = montar({
        usuarioId: 2,
        membros: [
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
        ],
      });

      const nomes = Array.from(raiz.querySelectorAll('.detalhe__equipe-nome')).map((el) =>
        el.textContent?.trim(),
      );
      expect(nomes).toEqual(['Mestre', 'Jogador']);
      // O mestre não usa o estado vazio — vira o chip "Mestre" (ver teste dedicado abaixo).
      expect(raiz.querySelectorAll('.detalhe__equipe-vazio')).toHaveLength(1);
    });

    it('diferencia o mestre com o chip "Mestre" (coroa), primeiro da lista e sem cards de ficha', () => {
      const { raiz } = montar({
        usuarioId: 2,
        membros: [
          {
            usuarioId: 1,
            nome: 'Mestre',
            papel: TipoCampanhaMembroPapelEnum.MESTRE,
            fichas: [
              {
                id: 20,
                nome: 'NPC do mestre',
                classe: ClasseEnum.COMBATENTE,
                arquetipo: null,
                imagemUrl: null,
                cor: null,
                acessoCompleto: true,
              },
            ],
          },
          { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
        ],
      });

      const itens = Array.from(raiz.querySelectorAll('.detalhe__equipe-membro'));
      expect(itens[0]?.querySelector('.detalhe__equipe-nome')?.textContent?.trim()).toBe('Mestre');
      const chip = itens[0]?.querySelector('.chip-papel');
      expect(chip?.textContent).toContain('Mestre');
      expect(itens[0]?.querySelector('.detalhe__equipe-ficha')).toBeNull();
      expect(itens[0]?.querySelector('.detalhe__equipe-carteirinha')).toBeNull();
      // O jogador comum não ganha o chip — só o mestre é diferenciado.
      expect(itens[1]?.querySelector('.chip-papel')).toBeNull();
    });

    it('mostra carteirinha (sem botão) pra ficha de colega sem acesso completo', () => {
      const { raiz } = montar({
        usuarioId: 2,
        membros: [
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
          {
            usuarioId: 3,
            nome: 'Colega',
            papel: TipoCampanhaMembroPapelEnum.JOGADOR,
            fichas: [
              {
                id: 9,
                nome: 'Rex',
                classe: ClasseEnum.COMBATENTE,
                arquetipo: null,
                imagemUrl: null,
                cor: '#ff0000',
                acessoCompleto: false,
              },
            ],
          },
        ],
      });

      const carteirinha = raiz.querySelector('.detalhe__equipe-carteirinha');
      expect(carteirinha).not.toBeNull();
      expect(carteirinha?.tagName).toBe('SPAN');
      expect(carteirinha?.textContent).toContain('Rex');
      expect(carteirinha?.textContent).toContain('Combatente');
      expect(raiz.querySelector('.detalhe__equipe-ficha')).toBeNull();
      const avatar = carteirinha?.querySelector('.detalhe__equipe-ficha-avatar') as HTMLElement;
      expect(avatar.style.getPropertyValue('--cor-ficha')).toBe('#ff0000');
    });

    it('mantém o card clicável (completo) pra ficha com acessoCompleto, cruzando com listarFichas', () => {
      const { raiz } = montar({
        usuarioId: 2,
        membros: [
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          {
            usuarioId: 2,
            nome: 'Jogador',
            papel: TipoCampanhaMembroPapelEnum.JOGADOR,
            fichas: [
              {
                id: 3,
                nome: 'Kane',
                classe: ClasseEnum.COMBATENTE,
                arquetipo: null,
                imagemUrl: null,
                cor: null,
                acessoCompleto: true,
              },
            ],
          },
        ],
        fichas: [
          {
            id: 3,
            campanhaId: CAMPANHA_ID,
            campanhaNome: null,
            imagemUrl: null,
            usuarioId: 2,
            nome: 'Kane',
            classe: ClasseEnum.COMBATENTE,
            arquetipo: null,
            nivel: 1,
            vidaAtual: 40,
            vidaMaxima: 40,
            energiaAtual: 10,
            energiaMaxima: 10,
            morrendo: false,
            machucado: false,
            inconsciente: false,
          },
        ],
      });

      const botao = raiz.querySelector('.detalhe__equipe-ficha') as HTMLButtonElement;
      expect(botao).not.toBeNull();
      expect(botao.textContent).toContain('Kane');
      expect(botao.textContent).toContain('Vida 40/40');
      expect(raiz.querySelector('.detalhe__equipe-carteirinha')).toBeNull();
    });
  });
  describe('inventário de esquadrão', () => {
    it('mestre vê o estado e o drawer; alternar estado chama o backend', () => {
      const { fixture, raiz, campanhaService } = montar({ usuarioId: 1, membros: membrosDois(), fichas });
      const estado = raiz.querySelector('.detalhe__estado-operacional') as HTMLButtonElement;
      expect(estado.textContent).toContain('Na Base');
      estado.click();
      fixture.detectChanges();
      expect(campanhaService.alterarEstado).toHaveBeenCalledWith(CAMPANHA_ID, false);
      expect(raiz.querySelector('app-inventario-esquadrao-sidebar')).not.toBeNull();
    });

    it('jogador alterna a lateral para o inventário sem navegar', () => {
      const { fixture, raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      const botao = raiz.querySelector('.detalhe__alternar-inventario') as HTMLButtonElement;
      expect(botao.disabled).toBe(false);
      expect(botao.textContent).toContain('Inventário do esquadrão');
      botao.click();
      fixture.detectChanges();
      expect(raiz.querySelector('.detalhe__inventario-jogador')).not.toBeNull();
      expect(raiz.querySelector('.detalhe__equipe')).toBeNull();
    });

    it('jogador em missão abre o inventário em modo de leitura', () => {
      const { fixture, raiz, campanhaService } = montar({
        usuarioId: 2, membros: membrosDois(), fichas, campanha: { naBase: false },
      });
      const botao = raiz.querySelector('.detalhe__alternar-inventario') as HTMLButtonElement;

      expect(botao.disabled).toBe(false);
      expect(campanhaService.recuperarInventario).toHaveBeenCalledWith(CAMPANHA_ID);
      botao.click();
      fixture.detectChanges();

      expect(raiz.querySelector('.detalhe__inventario-jogador')).not.toBeNull();
    });

    it('jogador manda item da própria ficha para a base e relê os dois inventários', () => {
      const { fixture, fichaService, campanhaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      fixture.componentInstance['mandarItemFichaParaBase'](3, { indice: 1, quantidade: 2 });
      expect(fichaService.mandarItemInventarioParaBase).toHaveBeenCalledWith(3, 1, 2);
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(3);
      expect(campanhaService.recuperarInventario).toHaveBeenCalledWith(CAMPANHA_ID);
    });
  });
});
