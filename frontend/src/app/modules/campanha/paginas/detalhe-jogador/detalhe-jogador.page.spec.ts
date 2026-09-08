import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import {
  ArquetipoEnum,
  ClasseEnum,
  RolagemVisibilidadeEnum,
  TipoCampanhaMembroPapelEnum,
} from '@contratados-rpg/shared/enums';
import { CampanhaMembroResumoDto, CampanhaRecuperadaDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';

import { CampanhaDetalheJogador } from './detalhe-jogador.page';
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
      atribuirCampanha: vi.fn((id: number) => of({ id, campanhaId: null })),
      excluirFicha: vi.fn(() => of(undefined)),
      listarMinhasFichas: vi.fn(() => of([] as FichaResumoDto[])),
      listarAcessos: vi.fn(() => of([] as { usuarioId: number; nome: string }[])),
      concederAcesso: vi.fn((fichaId: number, usuarioId: number) => of({ id: 1, fichaId, usuarioId })),
      revogarAcesso: vi.fn((fichaId: number, usuarioId: number) => of({ fichaId, usuarioId })),
      mandarItemInventarioParaBase: vi.fn(() => of({ id: 1 })),
    };
    const rolagemService = { listarPorCampanha: vi.fn(() => of([])) };
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
      rolagemRegistrada$: new Subject().asObservable(),
      estadoAlterado$: new Subject().asObservable(),
      inventarioAlterado$: new Subject().asObservable(),
      paginaEsquadraoCriada$: new Subject().asObservable(),
      paginaEsquadraoAlterada$: new Subject().asObservable(),
      paginaEsquadraoExcluida$: new Subject().asObservable(),
      presencaEsquadraoCaderno$: new Subject().asObservable(),
      reconexao: () => 0,
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
      fichaService,
      confirmacaoService,
      navegar,
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
    expect(raiz.querySelector('app-ficha-visualizacao')).not.toBeNull();
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

  it('sinaliza o banner de ficha crítica mesmo sem ação do mestre (não é gated por papel)', () => {
    const { raiz } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    // Kane (id 3, dono usuarioId 1) tem vidaAtual 0 — crítica.
    expect(raiz.querySelector('.detalhe__banner-alerta')?.textContent).toContain('Kane');
  });

  it('"Remover da campanha" age sobre a ficha exibida, fecha o menu e troca para outra ficha própria', () => {
    const { fixture, raiz, fichaService } = montar({ usuarioId: 2, membros: membrosDois(), fichas });
    abrirMenu(raiz, fixture);

    encontrarItemMenu(raiz, 'Remover da campanha').click();
    fixture.detectChanges();

    expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
    expect(raiz.querySelector('.detalhe__cabecalho-menu')).toBeNull();
    expect(fichaService.recuperarFicha).toHaveBeenCalledWith(5);
  });

  it('"Remover da campanha" sem outra ficha própria restante cai no estado vazio do jogador', () => {
    const { fixture, raiz, fichaService } = montar({
      usuarioId: 2,
      membros: membrosDois(),
      fichas: fichas.filter((ficha) => ficha.id !== 5),
    });
    abrirMenu(raiz, fixture);

    encontrarItemMenu(raiz, 'Remover da campanha').click();
    fixture.detectChanges();

    expect(fichaService.atribuirCampanha).toHaveBeenCalledWith(4, null);
    expect(raiz.querySelector('.detalhe__jogador-vazio')).not.toBeNull();
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
});
