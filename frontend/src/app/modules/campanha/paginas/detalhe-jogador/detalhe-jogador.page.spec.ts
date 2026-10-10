import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import {
  ArquetipoEnum,
  ClasseEnum,
  RolagemVisibilidadeEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import { CampanhaMembroResumoDto, CampanhaRecuperadaDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaDetalheJogador } from './detalhe-jogador.page';
import { BibliotecaFlutuante } from '../../../documento/componentes/biblioteca-flutuante/biblioteca-flutuante.component';
import { CampanhaDetalheDadosService } from '../detalhe/campanha-detalhe-dados.service';
import { CampanhaService } from '../../campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { PaginaCadernoService } from '../../../pagina-caderno/pagina-caderno.service';

/**
 * Prova `CampanhaDetalheJogador` — extraído do ramo `@else` de `ehMestre()` do antigo
 * `CampanhaDetalhe` (`campanha-detalhe-mestre-coluna-acoes.spec.md`, entregável 1). Reproduz o
 * comportamento hoje coberto por esse ramo: ficha própria embutida, "Ver ficha" de um colega,
 * menu "⋯" (criar/vincular/acesso/remover/excluir) e o banner de crítico (não é gated por papel).
 */
describe('CampanhaDetalheJogador', () => {
  const CAMPANHA_ID = 8;

  const campanhaBase: CampanhaRecuperadaDto = {
    id: CAMPANHA_ID,
    nome: 'Contenção Delta',
    descricao: 'Operação em curso',
    codigoConvite: 'DEF456',
    codigoConviteEspectador: 'ESP456',
    naBase: true,
  };

  const membrosDois = (): CampanhaMembroResumoDto[] => [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
  ];

  const membrosTres = (): CampanhaMembroResumoDto[] => [
    { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
    { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
    { usuarioId: 3, nome: 'Colega', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
  ];

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

  /** Kane pertence ao "Colega" (`usuarioId: 3`) — o jogador nunca vê ficha do mestre na Equipe. */
  const fichasComColegaJogador = (): FichaResumoDto[] =>
    fichas.map((ficha) => (ficha.id === 3 ? { ...ficha, usuarioId: 3 } : ficha));

  function montar(opts: {
    usuarioId: number;
    membros: CampanhaMembroResumoDto[];
    fichas?: FichaResumoDto[];
    rolagens?: RolagemResumoDto[];
    confirmarResultado?: boolean;
  }) {
    // Em produção `membro.fichas` (listarMembros) e `fichas()` (listarFichas) vêm da mesma
    // visibilidade no backend — nunca inconsistentes. Aqui, quando o teste não declara `fichas`
    // explicitamente no membro, sintetiza a partir de `opts.fichas` como acesso completo (mesmo
    // padrão do antigo `detalhe.page.spec.ts`).
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
                morrendo: ficha.morrendo ?? false,
                machucado: ficha.machucado ?? false,
                inconsciente: ficha.inconsciente ?? false,
              })),
    }));
    const campanhaService = {
      recuperarCampanha: vi.fn(() => of({ ...campanhaBase })),
      listarMembros: vi.fn(() => of(membrosComFichas)),
      recuperarInventario: vi.fn(() => of({ itens: [] })),
      alterarEstado: vi.fn((_id: number, naBase: boolean) => of({ id: CAMPANHA_ID, naBase })),
    };
    const fichaService = {
      listarFichas: vi.fn(() => of(opts.fichas ?? [])),
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
      // Resposta padrão só o bastante pro autosave concluir nos testes que não controlam o
      // envio (P-082): devolve o próprio corpo enviado, com o `usuarioId` da ficha original.
      alterarFicha: vi.fn((id: number, dto: { nome: string; cor: string | null; imagemFoco: unknown; oculta: boolean; dados: unknown }) => {
        const ficha = (opts.fichas ?? []).find((item) => item.id === id);
        return of({
          id,
          campanhaId: CAMPANHA_ID,
          usuarioId: ficha?.usuarioId ?? 0,
          nome: dto.nome,
          cor: dto.cor,
          imagemUrl: null,
          imagemFoco: dto.imagemFoco,
          oculta: dto.oculta,
          dados: dto.dados,
        });
      }),
      atribuirCampanha: vi.fn((id: number) => of({ id, campanhaId: null })),
      excluirFicha: vi.fn(() => of(undefined)),
      listarMinhasFichas: vi.fn(() => of([] as FichaResumoDto[])),
      listarAcessos: vi.fn(() => of([] as { usuarioId: number; nome: string }[])),
      concederAcesso: vi.fn((fichaId: number, usuarioId: number) => of({ id: 1, fichaId, usuarioId })),
      revogarAcesso: vi.fn((fichaId: number, usuarioId: number) => of({ fichaId, usuarioId })),
      mandarItemInventarioParaBase: vi.fn(() => of({ id: 1 })),
    };
    const rolagemService = { listarPorCampanha: vi.fn(() => of(opts.rolagens ?? [])) };
    const sessaoService = { usuario: () => ({ id: opts.usuarioId, login: 'x', nome: 'x' }) };
    const paginaCadernoService = {
      listarPaginas: vi.fn(() => of([])),
      listarPaginasMembro: vi.fn(() => of([])),
      recuperarPagina: vi.fn(),
      criarPagina: vi.fn(),
      alterarPagina: vi.fn(),
      excluirPagina: vi.fn(),
      buscarCampanha: vi.fn(() => of({ itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 0 })),
    };
    const confirmacaoService = {
      confirmar: vi.fn(() => Promise.resolve(opts.confirmarResultado ?? true)),
    };
    const topbarContexto = { definir: vi.fn(), limpar: vi.fn() };

    const fichaAlterada$ = new Subject<unknown>();
    const reconexao$ = new Subject<void>();
    const acessoRevogado$ = new Subject<{ fichaId: number; usuarioId: number }>();
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      enviarPresencaEsquadrao: vi.fn(),
      fichaCriada$: new Subject().asObservable(),
      membroEntrou$: new Subject().asObservable(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      fichaVisibilidadeAlterada$: new Subject().asObservable(),
      fichaRecortesAlterados$: new Subject().asObservable(),
      fichaRemovidaDaCampanha$: new Subject().asObservable(),
      rolagemRegistrada$: new Subject().asObservable(),
      rolagemExcluida$: new Subject().asObservable(),
      estadoAlterado$: new Subject().asObservable(),
      inventarioAlterado$: new Subject().asObservable(),
      paginaEsquadraoCriada$: new Subject().asObservable(),
      paginaEsquadraoAlterada$: new Subject().asObservable(),
      paginaEsquadraoExcluida$: new Subject().asObservable(),
      presencaEsquadraoCaderno$: new Subject().asObservable(),
      reconexao: () => 0,
      reconexao$: reconexao$.asObservable(),
      acessoRevogado$: acessoRevogado$.asObservable(),
      conectado: () => true,
    };

    TestBed.configureTestingModule({
      imports: [CampanhaDetalheJogador],
      providers: [
        provideRouter([]),
        CampanhaDetalheDadosService,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) } } } },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
        { provide: RolagemService, useValue: rolagemService },
        { provide: SessaoService, useValue: sessaoService },
        { provide: TempoRealService, useValue: tempoRealService },
        { provide: TopbarContextoService, useValue: topbarContexto },
        { provide: PaginaCadernoService, useValue: paginaCadernoService },
        { provide: ConfirmacaoService, useValue: confirmacaoService },
      ],
    });

    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const dados = TestBed.inject(CampanhaDetalheDadosService);
    dados.inicializar(CAMPANHA_ID);
    TestBed.inject(ApplicationRef).tick();

    const fixture = TestBed.createComponent(CampanhaDetalheJogador);
    fixture.detectChanges();

    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      dados,
      campanhaService,
      fichaService,
      confirmacaoService,
      navegar,
      reconexao$,
      acessoRevogado$,
    };
  }

  function abrirMenu(raiz: HTMLElement, fixture: ReturnType<typeof montar>['fixture']) {
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

  it('esconde o texto da missão e o alterna pelo botão "i" do cabeçalho', () => {
    const { fixture, raiz } = montar({
      usuarioId: 2,
      membros: membrosTres(),
      fichas: fichasComColegaJogador(),
    });
    const botao = raiz.querySelector<HTMLButtonElement>('.detalhe__cabecalho-info')!;

    expect(raiz.querySelector('.detalhe__descricao')).toBeNull();
    expect(botao.getAttribute('aria-pressed')).toBe('false');

    botao.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.detalhe__descricao')?.textContent).toContain('Operação em curso');
    expect(botao.getAttribute('aria-pressed')).toBe('true');

    botao.click();
    fixture.detectChanges();
    expect(raiz.querySelector('.detalhe__descricao')).toBeNull();
  });

  it('enquanto carrega, mostra a casca real com a silhueta da ficha embutida e do painel lateral', () => {
    const { fixture, raiz, dados } = montar({
      usuarioId: 2,
      membros: membrosTres(),
      fichas: fichasComColegaJogador(),
    });
    dados.carregando.set(true);
    fixture.detectChanges();

    const silhueta = raiz.querySelector('.detalhe__esqueleto');
    expect(silhueta?.getAttribute('role')).toBe('status');
    expect(silhueta?.getAttribute('aria-label')).toBe('Carregando campanha');
    expect(raiz.querySelectorAll('app-coluna-acoes app-esqueleto').length).toBeGreaterThan(0);
    expect(raiz.querySelector('.detalhe__ficha-embutida app-ficha-esqueleto')).not.toBeNull();
    expect(raiz.querySelector('.detalhe__painel-lateral app-esqueleto')).not.toBeNull();
    expect(raiz.querySelector('app-ficha-campanha-card')).toBeNull();
  });

  it('mostra o botão "Voltar às campanhas" no cabeçalho, apontando para /campanhas', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    const voltar = raiz.querySelector('.detalhe__cabecalho-voltar');
    expect(voltar).not.toBeNull();
    expect(voltar?.getAttribute('href')).toBe('/campanhas');
  });

  it('mostra a própria ficha embutida, não o grid de Esquadrão', () => {
    const { raiz, fichaService } = montar({
      usuarioId: 2,
      membros: membrosTres(),
      fichas: fichasComColegaJogador(),
    });

    expect(raiz.querySelector('.detalhe__esquadrao-grid')).toBeNull();
    expect(raiz.querySelector('.detalhe__jogador')).not.toBeNull();
    // Seleção inicial: a própria ficha (Vera, `usuarioId: 2`).
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(4);
    expect(raiz.querySelector('app-ficha-campanha-card')).not.toBeNull();
  });

  it('jogador sem nenhuma ficha na campanha nem aparece na Equipe', () => {
    // `fichas` (não `fichasComColegaJogador`): só Kane (usuarioId 1, Mestre) e Vera (usuarioId 2,
    // Jogador) têm ficha — "Colega" (usuarioId 3) fica sem nenhuma depois da síntese de `montar()`.
    const { raiz } = montar({ usuarioId: 2, membros: membrosTres(), fichas });

    const nomes = Array.from(raiz.querySelectorAll('.detalhe__equipe-nome')).map((el) =>
      el.textContent?.trim(),
    );
    expect(nomes).toContain('Mestre');
    expect(nomes).toContain('Jogador');
    expect(nomes).not.toContain('Colega');
    expect(raiz.querySelectorAll('.detalhe__equipe-membro')).toHaveLength(2);
  });

  it('a carteirinha sem acesso mostra o selo de Machucado (I-031), mesmo sem acessoCompleto', () => {
    const membros: CampanhaMembroResumoDto[] = [
      { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
      { usuarioId: 2, nome: 'Jogador', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [] },
      {
        usuarioId: 3,
        nome: 'Colega',
        papel: TipoCampanhaMembroPapelEnum.JOGADOR,
        fichas: [
          {
            id: 3,
            nome: 'Kane',
            updatedDate: '2026-10-09T10:00:00Z',
            classe: ClasseEnum.COMBATENTE,
            arquetipo: ArquetipoEnum.LUTADOR,
            imagemUrl: null,
            cor: null,
            acessoCompleto: false,
            morrendo: false,
            machucado: true,
            inconsciente: false,
          },
        ],
      },
    ];
    const { raiz } = montar({ usuarioId: 2, membros, fichas });

    const carteirinha = raiz.querySelector('.detalhe__equipe-carteirinha')!;
    const selos = Array.from(carteirinha.querySelectorAll('.detalhe__equipe-selo')).map((selo) =>
      selo.textContent?.trim(),
    );
    expect(selos).toEqual(['Machucado']);
  });

  it('"Ver ficha" na Equipe troca a ficha exibida sem navegar; a de um colega vira só leitura', () => {
    const { fixture, raiz, fichaService, navegar } = montar({
      usuarioId: 2,
      membros: membrosTres(),
      fichas: fichasComColegaJogador(),
    });
    const componente = fixture.componentInstance;

    expect(componente['podeAjustarFichaExibida']()).toBe(true);

    const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
      (botao) => botao.textContent?.includes('Kane'),
    );
    botaoKane?.click();
    fixture.detectChanges();

    expect(navegar).not.toHaveBeenCalled();
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(3);
    expect(componente['fichaExibidaId']()).toBe(3);
    expect(componente['podeAjustarFichaExibida']()).toBe(false);
  });

  it('acesso revogado ou suspenso por ocultação tira a ficha do colega da coluna e volta à própria', () => {
    const { fixture, raiz, acessoRevogado$ } = montar({
      usuarioId: 2,
      membros: membrosTres(),
      fichas: fichasComColegaJogador(),
    });
    const componente = fixture.componentInstance;
    const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
      (botao) => botao.textContent?.includes('Kane'),
    );
    botaoKane?.click();
    fixture.detectChanges();
    expect(componente['fichaExibidaId']()).toBe(3);

    // Evento de outro usuário ou de outra ficha não mexe na coluna.
    acessoRevogado$.next({ fichaId: 3, usuarioId: 99 });
    acessoRevogado$.next({ fichaId: 4, usuarioId: 2 });
    fixture.detectChanges();
    expect(componente['fichaExibidaId']()).toBe(3);

    acessoRevogado$.next({ fichaId: 3, usuarioId: 2 });
    fixture.detectChanges();

    expect(componente['fichaExibidaId']()).toBe(4);
    expect(componente['fichaExibidaDados']()?.id).toBe(4);
  });

  // === P-082: escrita vinculada à origem e leitura imune a resposta antiga
  // (docs/specs/done/p-082-ficha-autosave-e-selecao.spec.md) — a troca de ficha exibida
  // ("Ver ficha") antecipa e aguarda a gravação pendente antes de efetivar, e a leitura da nova
  // ficha ignora qualquer resposta obsoleta de uma seleção anterior.
  describe('P-082: gravação vinculada à origem e leitura imune a resposta obsoleta', () => {
    it('com edição pendente, "Ver ficha" antecipa e conclui a gravação na ficha de origem antes de trocar', async () => {
      const escrita$ = new Subject<unknown>();
      const { fixture, raiz, fichaService } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador(),
      });
      const componente = fixture.componentInstance;
      fichaService.alterarFicha.mockImplementation(() => escrita$.asObservable() as never);

      // Edita a própria ficha exibida (Vera, id 4) sem esperar o debounce de 500ms.
      componente['fichaEdicao'].ajustarNome('Vera (editada)');
      expect(componente['fichaEdicao'].edicaoPendente()).toBe(true);
      const docEditado = componente['fichaExibidaDados']()!;
      expect(docEditado.nome).toBe('Vera (editada)');

      fichaService.recuperarFicha.mockClear();
      const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Kane'),
      )!;
      botaoKane.click();
      fixture.detectChanges();

      // A gravação de Vera foi antecipada (não esperou o debounce) e ainda está em voo — a troca
      // não pode efetivar, ler Kane nem deixar editar Vera nesse meio-tempo.
      expect(fichaService.alterarFicha).toHaveBeenCalledWith(
        4,
        expect.objectContaining({ nome: 'Vera (editada)' }),
      );
      expect(fichaService.recuperarFicha).not.toHaveBeenCalled();
      expect(componente['fichaExibidaId']()).toBe(4);
      expect(componente['trocandoFichaExibida']()).toBe(true);
      expect(componente['podeAjustarFichaExibida']()).toBe(false);
      expect(botaoKane.disabled).toBe(true);

      escrita$.next(docEditado);
      escrita$.complete();
      await Promise.resolve();
      fixture.detectChanges();

      // Gravação confirmada: agora sim a troca efetiva, e só agora Kane é lido.
      expect(componente['trocandoFichaExibida']()).toBe(false);
      expect(componente['fichaEdicao'].edicaoPendente()).toBe(false);
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(3);
      expect(componente['fichaExibidaId']()).toBe(3);
    });

    it('a resposta obsoleta de uma leitura anterior não substitui a ficha selecionada depois (última seleção vence)', () => {
      const leituraKane$ = new Subject<unknown>();
      const { fixture, raiz, fichaService } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador(),
      });
      const componente = fixture.componentInstance;
      const implementacaoOriginal = fichaService.recuperarFicha.getMockImplementation()!;
      fichaService.recuperarFicha.mockImplementation((id: number) =>
        id === 3 ? (leituraKane$.asObservable() as never) : implementacaoOriginal(id),
      );

      const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
        (botao) => botao.textContent?.includes('Kane'),
      )!;
      botaoKane.click();
      fixture.detectChanges();
      // A leitura de Kane está em voo (atrasada de propósito) — o documento antigo (Vera) já saiu
      // da região editável, sem esperar a resposta.
      expect(componente['fichaExibidaId']()).toBe(3);
      expect(componente['fichaExibidaDados']()).toBeNull();

      // Volta pra própria ficha (Vera, id 4) antes da resposta de Kane chegar.
      componente['selecionarFichaExibida'](4);
      fixture.detectChanges();
      expect(componente['fichaExibidaId']()).toBe(4);
      expect(componente['fichaExibidaDados']()?.id).toBe(4);

      // A leitura de Kane, atrasada, finalmente chega — não pode substituir Vera na tela.
      leituraKane$.next({ id: 3, campanhaId: CAMPANHA_ID, usuarioId: 3, nome: 'Kane', dados: {} });
      leituraKane$.complete();
      fixture.detectChanges();

      expect(componente['fichaExibidaId']()).toBe(4);
      expect(componente['fichaExibidaDados']()?.id).toBe(4);
    });
  });

  // === P-084: nenhum evento tem replay (§9) — uma alteração feita na ficha exibida **durante** a
  // queda (dinheiro, inventário…) só chega de volta por um refetch explícito ao reconectar, mesmo
  // com o `id` exibido continuando o mesmo (docs/specs/done/p-084-ressincronizacao-recursos.spec.md).
  describe('P-084: ressincronização da ficha exibida ao reconectar', () => {
    it('reconexao$ refaz o documento completo da ficha exibida, mesmo com o mesmo id', () => {
      const { fichaService, reconexao$ } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      fichaService.recuperarFicha.mockClear();

      reconexao$.next();

      // Vera (id 4) é a própria ficha exibida (seleção inicial) — refeita mesmo sem trocar de ficha.
      expect(fichaService.recuperarFicha).toHaveBeenCalledWith(4);
    });

    it('mescla o refetch de reconexão preservando uma edição local pendente (P-082)', () => {
      const leitura$ = new Subject<unknown>();
      const { fixture, fichaService, reconexao$ } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      const componente = fixture.componentInstance;
      const docBase = componente['fichaExibidaDados']()!;
      fichaService.recuperarFicha.mockImplementation(() => leitura$.asObservable() as never);

      componente['fichaEdicao'].ajustarNome('Vera (editada)');
      expect(componente['fichaEdicao'].edicaoPendente()).toBe(true);

      reconexao$.next();
      // Servidor devolve o documento com um campo alterado por outra sessão durante a queda.
      leitura$.next({
        ...docBase,
        nome: 'Vera',
        dados: { ...docBase.dados, estado: { ...docBase.dados.estado, energiaAtual: 3 } },
      });
      fixture.detectChanges();

      const atual = componente['fichaExibidaDados']()!;
      expect(atual.nome).toBe('Vera (editada)');
      expect(atual.dados.estado.energiaAtual).toBe(3);
    });

    it('ignora a resposta da reconexão se a ficha exibida já mudou nesse meio-tempo', () => {
      const leituraVera$ = new Subject<unknown>();
      const { fixture, fichaService, reconexao$ } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador(),
      });
      const componente = fixture.componentInstance;
      const implementacaoOriginal = fichaService.recuperarFicha.getMockImplementation()!;
      fichaService.recuperarFicha.mockImplementation((id: number) =>
        id === 4 ? (leituraVera$.asObservable() as never) : implementacaoOriginal(id),
      );

      reconexao$.next();
      componente['selecionarFichaExibida'](3);
      fixture.detectChanges();
      expect(componente['fichaExibidaId']()).toBe(3);

      leituraVera$.next({ id: 4, campanhaId: CAMPANHA_ID, usuarioId: 2, nome: 'Vera', dados: {} });
      fixture.detectChanges();

      expect(componente['fichaExibidaId']()).toBe(3);
    });

    it('acesso revogado durante a queda (403) limpa a ficha exibida e cai no estado vazio', () => {
      const { fixture, raiz, fichaService, reconexao$ } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        // Só a ficha do colega (Kane) — o jogador não tem ficha própria nesta campanha.
        fichas: fichasComColegaJogador().filter((ficha) => ficha.usuarioId !== 2),
      });
      const componente = fixture.componentInstance;
      componente['selecionarFichaExibida'](3);
      fixture.detectChanges();
      expect(componente['fichaExibidaId']()).toBe(3);

      fichaService.recuperarFicha.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 403 })),
      );
      reconexao$.next();
      fixture.detectChanges();

      expect(componente['fichaExibidaId']()).toBeNull();
      expect(componente['fichaExibidaDados']()).toBeNull();
      expect(raiz.querySelector('.detalhe__jogador-vazio')).not.toBeNull();
    });

    it('uma falha transitória (não 403/404) não limpa a ficha exibida — permanece recuperável', () => {
      const { fixture, fichaService, reconexao$ } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador().filter((ficha) => ficha.usuarioId !== 2),
      });
      const componente = fixture.componentInstance;
      componente['selecionarFichaExibida'](3);
      fixture.detectChanges();

      fichaService.recuperarFicha.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      reconexao$.next();
      fixture.detectChanges();

      expect(componente['fichaExibidaId']()).toBe(3);
    });
  });

  it('sinaliza o banner de ficha crítica mesmo sem ação do mestre (não é gated por papel)', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    // Kane (id 3, dono usuarioId 1) tem vidaAtual 0 — crítica.
    expect(raiz.querySelector('.detalhe__banner-alerta')?.textContent).toContain('Kane');
  });

  it('"Remover da campanha" pede confirmação, age sobre a ficha exibida, fecha o menu e troca para outra ficha própria', async () => {
    const { fixture, raiz, fichaService, confirmacaoService } = montar({
      usuarioId: 2,
      membros: membrosDois(),
      fichas,
    });
    abrirMenu(raiz, fixture);

    encontrarItemMenu(raiz, 'Remover da campanha').click();
    fixture.detectChanges();

    expect(confirmacaoService.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Remover da campanha', entidade: 'Vera', severidade: 'padrao' }),
    );
    expect(fichaService.atribuirCampanha).not.toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
    expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(5);
  });

  it('"Remover da campanha" sem outra ficha própria restante cai no estado vazio do jogador', async () => {
    const { fixture, raiz, fichaService } = montar({
      usuarioId: 2,
      membros: membrosDois(),
      fichas: fichas.filter((ficha) => ficha.id !== 5),
    });
    abrirMenu(raiz, fixture);

    encontrarItemMenu(raiz, 'Remover da campanha').click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
    expect(raiz.querySelector('.detalhe__jogador-vazio')).not.toBeNull();
  });

  it('sem ficha, o painel lateral fica visível no mobile abrindo em Rolagens (P-078)', () => {
    const { fixture, raiz } = montar({
      usuarioId: 2,
      membros: membrosDois(),
      fichas: fichas.filter((ficha) => ficha.usuarioId !== 2),
    });

    const lateral = raiz.querySelector('.detalhe__jogador-lateral')!;
    expect(lateral.classList.contains('detalhe__jogador-lateral--oculto-mobile')).toBe(false);
    expect(fixture.componentInstance['painelLateralAtivo']()).toBe('rolar');
  });

  it('com ficha, o painel lateral segue escondido no mobile fora do destino Rolagens', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });

    const lateral = raiz.querySelector('.detalhe__jogador-lateral')!;
    expect(lateral.classList.contains('detalhe__jogador-lateral--oculto-mobile')).toBe(true);
  });

  it('"Ver Esquadrão" no estado vazio ativa a aba Esquadrão do painel visível (P-074, P-078)', async () => {
    const rolar = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    Element.prototype.scrollIntoView = rolar;
    const { fixture, raiz } = montar({
      usuarioId: 2,
      membros: membrosDois(),
      fichas: fichas.filter((ficha) => ficha.usuarioId !== 2),
    });

    const botao = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__jogador-vazio-acoes button')).find(
      (elemento) => elemento.textContent?.includes('Ver Esquadrão'),
    );
    expect(botao).toBeTruthy();
    botao!.click();
    fixture.detectChanges();

    const lateral = raiz.querySelector('.detalhe__jogador-lateral')!;
    expect(lateral.classList.contains('detalhe__jogador-lateral--oculto-mobile')).toBe(false);
    expect(fixture.componentInstance['painelLateralAtivo']()).toBe('esquadrao');

    await new Promise((resolver) => setTimeout(resolver));
    expect(rolar).toHaveBeenCalledTimes(1);
    expect(rolar.mock.contexts[0]).toBe(raiz.querySelector('.detalhe__painel-lateral'));
    vi.unstubAllGlobals();
  });

  it('cancelar a confirmação de "Remover da campanha" não desatribui a ficha', async () => {
    const { fixture, raiz, fichaService } = montar({
      usuarioId: 2,
      membros: membrosDois(),
      fichas,
      confirmarResultado: false,
    });
    abrirMenu(raiz, fixture);

    encontrarItemMenu(raiz, 'Remover da campanha').click();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fichaService.atribuirCampanha).not.toHaveBeenCalled();
  });

  describe('itens da coluna de ações que abrem diálogo ficam selecionados', () => {
    function itemColuna(raiz: HTMLElement, rotulo: string): HTMLElement {
      const item = Array.from(
        raiz.querySelectorAll<HTMLElement>('app-coluna-acoes [app-coluna-acoes-item]'),
      ).find((candidato) => candidato.textContent?.trim().startsWith(rotulo));
      expect(item, rotulo).toBeDefined();
      return item!;
    }

    it('"Vincular ficha" e "Acesso de visualização" enquanto a dialog está aberta', () => {
      const { fixture, raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
      expect(itemColuna(raiz, 'Vincular ficha').getAttribute('aria-pressed')).toBe('false');
      expect(itemColuna(raiz, 'Acesso de visualização').getAttribute('aria-pressed')).toBe('false');

      itemColuna(raiz, 'Vincular ficha').click();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Vincular ficha').getAttribute('aria-pressed')).toBe('true');
      fixture.componentInstance['fecharVincularFicha']();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Vincular ficha').getAttribute('aria-pressed')).toBe('false');

      itemColuna(raiz, 'Acesso de visualização').click();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Acesso de visualização').getAttribute('aria-pressed')).toBe('true');
      fixture.componentInstance['fecharAcessoFicha']();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Acesso de visualização').getAttribute('aria-pressed')).toBe('false');
    });

    it('"Remover da campanha" e "Excluir ficha" enquanto a confirmação está aberta', async () => {
      const { fixture, raiz, confirmacaoService } = montar({
        usuarioId: 2,
        membros: membrosDois(),
        fichas,
      });
      let resolver: (valor: boolean) => void = () => undefined;
      confirmacaoService.confirmar.mockImplementation(
        () => new Promise<boolean>((resolve) => (resolver = resolve)),
      );

      itemColuna(raiz, 'Remover da campanha').click();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Remover da campanha').getAttribute('aria-pressed')).toBe('true');
      expect(itemColuna(raiz, 'Excluir ficha').getAttribute('aria-pressed')).toBe('false');

      resolver(false);
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Remover da campanha').getAttribute('aria-pressed')).toBe('false');

      itemColuna(raiz, 'Excluir ficha').click();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Excluir ficha').getAttribute('aria-pressed')).toBe('true');
      resolver(false);
      await Promise.resolve();
      await Promise.resolve();
      fixture.detectChanges();
      expect(itemColuna(raiz, 'Excluir ficha').getAttribute('aria-pressed')).toBe('false');
    });
  });

  it('a ficha embutida não mostra a barra "Ficha de Jogador" com a classificação', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });

    expect(raiz.querySelector('app-ficha-campanha-card')).not.toBeNull();
    expect(raiz.querySelector('.ficha-visao__topo')).toBeNull();
    expect(raiz.textContent).not.toContain('FICHA-JGD-');
  });

  it('"Excluir ficha" pede confirmação; cancelar não chama o serviço', async () => {
    const { fixture, raiz, fichaService, confirmacaoService } = montar({
      usuarioId: 2,
      membros: membrosDois(),
      fichas,
      confirmarResultado: false,
    });
    abrirMenu(raiz, fixture);

    encontrarItemMenu(raiz, 'Excluir ficha').click();
    fixture.detectChanges();

    expect(confirmacaoService.confirmar).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Excluir ficha', entidade: 'Vera' }),
    );
    expect(fichaService.excluirFicha).not.toHaveBeenCalled();

    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fichaService.excluirFicha).not.toHaveBeenCalled();
  });

  it('confirmar "Excluir ficha" chama FichaService.excluirFicha e troca para outra ficha própria', async () => {
    const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    abrirMenu(raiz, fixture);
    encontrarItemMenu(raiz, 'Excluir ficha').click();
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fichaService.excluirFicha).toHaveBeenCalledWith(4);
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(5);
  });

  it('desabilita "Acesso de visualização" quando a ficha exibida é de um colega, habilita na própria', () => {
    const { fixture, raiz } = montar({
      usuarioId: 2,
      membros: membrosTres(),
      fichas: fichasComColegaJogador(),
    });
    abrirMenu(raiz, fixture);
    expect(encontrarItemMenu(raiz, 'Acesso de visualização').disabled).toBe(false);

    const botaoKane = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find(
      (botao) => botao.textContent?.includes('Kane'),
    );
    botaoKane?.click();
    fixture.detectChanges();

    expect(encontrarItemMenu(raiz, 'Acesso de visualização').disabled).toBe(true);
  });

  it('"Acesso de visualização" abre a dialog e busca as concessões da ficha exibida', () => {
    const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
    fichaService.listarAcessos.mockReturnValue(of([{ usuarioId: 3, nome: 'Colega' }]));
    abrirMenu(raiz, fixture);

    encontrarItemMenu(raiz, 'Acesso de visualização').click();
    fixture.detectChanges();

    expect(fichaService.listarAcessos).toHaveBeenCalledWith(4);
    expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
    const dialog = Array.from(raiz.querySelectorAll('app-modal')).find((modal) =>
      modal.textContent?.includes('Colega'),
    );
    expect(dialog?.textContent).toContain('Colega');
  });

  it('conceder acesso chama FichaService.concederAcesso e recarrega a lista', () => {
    const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosTres(), fichas });
    abrirMenu(raiz, fixture);
    encontrarItemMenu(raiz, 'Acesso de visualização').click();
    fixture.detectChanges();

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

  it('abre "Vincular ficha existente" e busca o acervo sem campanha', () => {
    const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    fichaService.listarMinhasFichas.mockReturnValue(
      of([{ id: 42, campanhaId: null, nome: 'Solta' } as FichaResumoDto]),
    );
    abrirMenu(raiz, fixture);

    encontrarItemMenu(raiz, 'Vincular ficha existente').click();
    fixture.detectChanges();

    expect(fichaService.listarMinhasFichas).toHaveBeenCalled();
    const dialog = Array.from(raiz.querySelectorAll('app-modal')).find((modal) =>
      modal.textContent?.includes('Solta'),
    );
    expect(dialog).not.toBeUndefined();
  });

  it('coluna de ações inclui "Calculadora" e "Caderno", sem o gatilho flutuante próprio deles', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    const rotulos = Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).map((el) =>
      el.textContent?.trim(),
    );
    expect(rotulos).toEqual(expect.arrayContaining(['Calculadora', 'Caderno']));
    expect(raiz.querySelector('.calc-flutuante__gatilho')).toBeNull();
    expect(raiz.querySelector('.caderno__gatilho')).toBeNull();
  });

  it('Calculadora alterna aberta/fechada ao clicar de novo no mesmo item da coluna de ações', () => {
    const { raiz, fixture } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    const item = Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).find(
      (el) => el.textContent?.trim() === 'Calculadora',
    ) as HTMLButtonElement;

    item.click();
    fixture.detectChanges();
    expect(raiz.querySelector('app-calculadora-flutuante .painel-flutuante__janela')).not.toBeNull();

    item.click();
    fixture.detectChanges();
    expect(raiz.querySelector('app-calculadora-flutuante .painel-flutuante__janela')).toBeNull();
  });

  // === ui-33: painel de 3 abas (Rolagens/Esquadrão/Inv. Esquadrão), fusão Rolar+Histórico e
  // remoção da aba "Sessão" — ver docs/specs/active/ui-33-esquadrao-aba-detalhe-jogador.spec.md.

  it('painel lateral tem 3 abas — Rolagens, Esquadrão e Inv. Esquadrão —, sem "Sessão"', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });

    const abas = Array.from(raiz.querySelectorAll('.detalhe__painel-lateral .segmentado__item')).map(
      (botao) => botao.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(abas).toEqual(['Rolagens', 'Esquadrão', 'Inv. Esquadrão']);
  });

  // === requests-inventario-sob-demanda: o painel "Inv. Esquadrão" só busca ao ser aberto.

  it('não busca inventário na carga inicial (Rolar é a aba padrão)', () => {
    const { campanhaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    expect(campanhaService.recuperarInventario).not.toHaveBeenCalled();
  });

  it('abrir "Inv. Esquadrão" dispara exatamente um GET; alternar de volta e reabrir sem mudança não duplica', () => {
    const { raiz, fixture, campanhaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    const abas = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__painel-lateral .segmentado__item'));
    const abaInventario = abas.find((botao) => botao.textContent?.includes('Inv. Esquadrão'))!;
    const abaRolagens = abas.find((botao) => botao.textContent?.includes('Rolagens'))!;

    abaInventario.click();
    fixture.detectChanges();
    expect(campanhaService.recuperarInventario).toHaveBeenCalledTimes(1);

    abaRolagens.click();
    fixture.detectChanges();
    abaInventario.click();
    fixture.detectChanges();

    expect(campanhaService.recuperarInventario).toHaveBeenCalledTimes(1);
  });

  it('não duplica "Iniciativa" ao lado das abas — a ação mora só na coluna de ações/kebab', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    expect(raiz.querySelector('.detalhe__painel-iniciativa')).toBeNull();
  });

  it('o item "Cenas" (m7-23, antiga "Iniciativa") da coluna leva ao hub de cenas', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    const cenas = Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).find(
      (el) => el.textContent?.trim() === 'Cenas',
    );

    expect(cenas?.getAttribute('href')).toBe(`/campanhas/${CAMPANHA_ID}/cenas`);
    expect(
      Array.from(raiz.querySelectorAll('[app-coluna-acoes-item]')).some(
        (el) => el.textContent?.trim() === 'Iniciativa',
      ),
    ).toBe(false);
  });

  it('o item "Biblioteca" da coluna abre o painel flutuante (m9-11) em vez de navegar', () => {
    const { raiz, fixture } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    const naColuna = Array.from(raiz.querySelectorAll<HTMLElement>('[app-coluna-acoes-item]')).find(
      (el) => el.textContent?.trim() === 'Biblioteca',
    );
    expect(naColuna?.getAttribute('href')).toBeNull();
    const painel = fixture.debugElement.query(By.directive(BibliotecaFlutuante))
      .componentInstance as BibliotecaFlutuante;
    expect(painel.ehMestre()).toBe(false);
    const alternar = vi.spyOn(painel, 'alternar').mockImplementation(() => undefined);
    naColuna!.click();
    expect(alternar).toHaveBeenCalledTimes(1);
  });

  it('aba "Rolagens" funde o painel de rolar com o Histórico completo no mesmo container, sem aba/painel de Sessão', () => {
    const rolagem: RolagemResumoDto = {
      id: 1,
      fichaId: 4,
      encontroCombatenteId: null,
      campanhaId: CAMPANHA_ID,
      usuarioId: 2,
      nomeAutor: 'Jogador',
      nomeFicha: 'Vera',
      rotulo: 'Pontaria',
      formula: '1d20+3',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 3, total: 14 },
      createdDate: new Date().toISOString(),
      corFicha: null,
    };
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas, rolagens: [rolagem] });

    const painelRolar = raiz.querySelector('.detalhe__painel-rolar');
    expect(painelRolar?.querySelector('app-ficha-rolagens-painel')).not.toBeNull();
    expect(painelRolar?.querySelector('li[app-cartao-rolagem]')?.textContent).toContain('Pontaria');
    expect(raiz.querySelector('.detalhe__painel-historico')).toBeNull();
    expect(raiz.querySelector('.detalhe__painel-sessao')).toBeNull();
    expect(raiz.querySelector('.rolagem-pill')).toBeNull();
  });

  it('mostra a rolagem avulsa do mestre como "autor · Mestre", nunca "null" (P-076)', () => {
    const rolagem: RolagemResumoDto = {
      id: 2,
      fichaId: null,
      encontroCombatenteId: null,
      campanhaId: CAMPANHA_ID,
      usuarioId: 1,
      nomeAutor: "Codex",
      nomeFicha: null,
      rotulo: "1d20",
      formula: "1d20",
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 0, total: 14 },
      createdDate: new Date().toISOString(),
      corFicha: null,
    };
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas, rolagens: [rolagem] });

    const autor = raiz.querySelector(
      ".detalhe__painel-rolar li[app-cartao-rolagem] .cartao-rolagem__autor",
    );
    expect(autor?.textContent?.trim()).toBe("Codex · Mestre");
  });

  it('a aba "Esquadrão" (antigo cartão Equipe) fica sempre montada, com o avatar da ficha', () => {
    const { fixture, raiz } = montar({
      usuarioId: 2,
      membros: membrosTres(),
      fichas: fichasComColegaJogador(),
    });

    const painelEsquadrao = raiz.querySelector('.detalhe__painel-esquadrao');
    expect(painelEsquadrao).not.toBeNull();
    expect(painelEsquadrao?.querySelector('.detalhe__equipe-ficha-avatar')).not.toBeNull();

    fixture.componentInstance['painelLateralAtivo'].set('esquadrao');
    fixture.detectChanges();
    expect((painelEsquadrao as HTMLElement).hidden).toBe(false);
  });

  it('destino "Rolagens" do mobile rola até o card só depois do Angular tirar o [hidden] (não na hora)', () => {
    vi.useFakeTimers();
    // jsdom não implementa `matchMedia` — `aoMudarDestinoFicha` lê `prefers-reduced-motion`.
    const matchMediaOriginal = window.matchMedia;
    window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList);
    try {
      const { fixture, raiz } = montar({
        usuarioId: 2,
        membros: membrosTres(),
        fichas: fichasComColegaJogador(),
      });
      // Outra aba ativa por padrão (ver `painelLateralAtivo`) — o card de Rolar nasce `[hidden]`.
      fixture.componentInstance['painelLateralAtivo'].set('esquadrao');
      fixture.detectChanges();
      const cardRolar = raiz.querySelector('.detalhe__painel-rolar') as HTMLElement;
      expect(cardRolar.hidden).toBe(true);

      const scrollSpy = vi.fn();
      cardRolar.scrollIntoView = scrollSpy;

      fixture.componentInstance['aoMudarDestinoFicha']('rolagens');
      fixture.detectChanges();
      // O `[hidden]` já caiu (o `set('rolar')` é síncrono), mas o scroll não pode medir a caixa
      // antes do browser aplicar esse layout — por isso é adiado, não chamado na hora.
      expect(cardRolar.hidden).toBe(false);
      expect(scrollSpy).not.toHaveBeenCalled();

      // `advanceTimersByTime` (não `runAllTimers`): a página tem outros timers/pollings de fundo
      // (tempo real etc.) que se reagendam pra sempre sob fake timers — `runAllTimers` estourava
      // "infinite loop". Só precisamos disparar o `setTimeout(…)` sem delay do próprio scroll.
      vi.advanceTimersByTime(0);
      expect(scrollSpy).toHaveBeenCalledTimes(1);
    } finally {
      window.matchMedia = matchMediaOriginal;
      vi.useRealTimers();
    }
  });
});
