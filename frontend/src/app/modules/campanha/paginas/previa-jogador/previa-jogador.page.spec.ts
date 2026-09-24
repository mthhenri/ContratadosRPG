import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { ClasseEnum, EncontroStatusEnum, RolagemVisibilidadeEnum, TipoCampanhaMembroPapelEnum } from '@contratados-rpg/shared/enums';
import type { CampanhaPreviaJogadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { FichaRecuperadaDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';

import { CampanhaPreviaJogador } from './previa-jogador.page';
import { CampanhaProjecaoService } from '../../campanha-projecao.service';
import { CampanhaService } from '../../campanha.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { TopbarContextoService } from '../../../../core/services/topbar-contexto.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { PaginaCadernoService } from '../../../pagina-caderno/pagina-caderno.service';

const CAMPANHA_ID = 8;
const MESTRE_ID = 1;
const ALVO_ID = 2;
const COLEGA_ID = 3;

/**
 * Prova a Prévia de jogador (m8-04) — "ver como jogador" do mestre monta a **mesma**
 * `CampanhaDetalheJogador` da visão real, alimentada pela projeção do alvo
 * (`recuperarPreviaJogador`/`recuperarFichaPreviaJogador`), nunca pelas rotas do mestre, e em
 * somente leitura: nenhum controle da tela dispara mutação.
 */
describe('CampanhaPreviaJogador', () => {
  function fichaResumo(sobrescritas: Partial<FichaResumoDto> = {}): FichaResumoDto {
    return {
      id: 10,
      campanhaId: CAMPANHA_ID,
      campanhaNome: 'Contenção Delta',
      usuarioId: ALVO_ID,
      nome: 'Agente Beta',
      cor: null,
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 3,
      vidaAtual: 10,
      vidaMaxima: 10,
      energiaAtual: 5,
      energiaMaxima: 5,
      imagemUrl: null,
      ...sobrescritas,
    } as FichaResumoDto;
  }

  function fichaCompleta(sobrescritas: Partial<FichaRecuperadaDto> = {}): FichaRecuperadaDto {
    return {
      id: 10,
      campanhaId: CAMPANHA_ID,
      usuarioId: ALVO_ID,
      nome: 'Agente Beta',
      cor: null,
      imagemUrl: null,
      imagemFoco: null,
      oculta: false,
      dados: {
        nivel: 3,
        classe: ClasseEnum.COMBATENTE,
        arquetipo: null,
        prestigio: 0,
        atributos: {
          destreza: 1, forca: 1, luta: 1, pontaria: 1, vigor: 1,
          intelecto: 1, medicina: 1, sentidos: 1, social: 1, vontade: 1,
        },
        maestria: null,
        habilidades: [],
        inventario: { itens: [], amplificadores: [] },
        anotacoes: '',
        estado: {
          vidaAtual: 10, vidaMaxima: 10, energiaAtual: 5, energiaMaxima: 5,
          sequelas: [], traumas: [], lesoes: [],
        },
      },
      ...sobrescritas,
    } as unknown as FichaRecuperadaDto;
  }

  function rolagem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
    return {
      id: 1,
      fichaId: 10,
      encontroCombatenteId: null,
      campanhaId: CAMPANHA_ID,
      usuarioId: ALVO_ID,
      nomeAutor: 'Beta',
      nomeFicha: 'Agente Beta',
      rotulo: '1d20+3',
      formula: '1d20+3',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 3, total: 15 },
      createdDate: new Date().toISOString(),
      corFicha: null,
      ...sobrescritas,
    };
  }

  const membroFicha = (id: number, nome: string, acessoCompleto = true) => ({
    id,
    nome,
    classe: ClasseEnum.COMBATENTE,
    arquetipo: null,
    imagemUrl: null,
    cor: null,
    acessoCompleto,
    morrendo: false,
    machucado: false,
    inconsciente: false,
  });

  function previa(sobrescritas: Partial<CampanhaPreviaJogadorDto> = {}): CampanhaPreviaJogadorDto {
    return {
      campanha: { id: CAMPANHA_ID, nome: 'Contenção Delta', descricao: null, naBase: true },
      fichas: [fichaResumo()],
      membros: [
        { usuarioId: MESTRE_ID, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
        {
          usuarioId: ALVO_ID,
          nome: 'Beta',
          papel: TipoCampanhaMembroPapelEnum.JOGADOR,
          fichas: [membroFicha(10, 'Agente Beta')],
        },
      ],
      rolagens: [rolagem()],
      podeAcessarInventarioEsquadrao: true,
      encontroAtivo: null,
      ...sobrescritas,
    };
  }

  const encontroAtivo: EncontroRecuperadoDto = {
    id: 9,
    campanhaId: CAMPANHA_ID,
    nome: 'Emboscada no Setor 4',
    status: EncontroStatusEnum.ATIVO,
    rodadaAtual: 1,
    turnoIndice: 0,
    combatentes: [],
    ordemRodada: [],
    eventos: [],
  };

  function montar(
    opts: {
      previaResposta?: CampanhaPreviaJogadorDto;
      previaResolvida?: CampanhaPreviaJogadorDto;
    } = {},
  ) {
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const membroEntrou$ = new Subject<unknown>();
    const fichaRemovidaDaCampanha$ = new Subject<unknown>();
    const fichaCondicoesAlteradas$ = new Subject<{ campanhaId: number }>();
    const fichaAlterada$ = new Subject<FichaRecuperadaDto>();
    const encontroAlterado$ = new Subject<{ encontro: { campanhaId: number } }>();

    const campanhaProjecaoService = {
      recuperarPreviaJogador: vi.fn(() => of(opts.previaResposta ?? previa())),
      recuperarEncontroAtivoPreviaJogador: vi.fn(() => of(null as EncontroRecuperadoDto | null)),
      recuperarFichaPreviaJogador: vi.fn(
        (_campanhaId: number, _usuarioAlvoId: number, fichaId: number) =>
          of(fichaCompleta(fichaId === 10 ? {} : { id: fichaId, usuarioId: COLEGA_ID, nome: 'Ficha do Colega' })),
      ),
    };
    // Rotas com o privilégio do mestre — a prévia não pode chamar nenhuma delas.
    const campanhaService = {
      recuperarInventario: vi.fn(() => of({ itens: [] })),
      recuperarCampanha: vi.fn(),
      listarMembros: vi.fn(),
    };
    const fichaService = {
      listarFichas: vi.fn(),
      recuperarFicha: vi.fn(),
      alterarFicha: vi.fn(),
      atribuirCampanha: vi.fn(),
      excluirFicha: vi.fn(),
      listarMinhasFichas: vi.fn(),
      listarAcessos: vi.fn(),
    };
    const rolagemService = { listarPorCampanha: vi.fn() };
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      entrarSalaFicha: vi.fn(),
      sairSalaFicha: vi.fn(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable(),
      rolagemExcluida$: new Subject().asObservable(),
      fichaCriada$: new Subject().asObservable(),
      membroEntrou$: membroEntrou$.asObservable(),
      fichaVisibilidadeAlterada$: new Subject().asObservable(),
      fichaCondicoesAlteradas$: fichaCondicoesAlteradas$.asObservable(),
      fichaRemovidaDaCampanha$: fichaRemovidaDaCampanha$.asObservable(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      estadoAlterado$: new Subject().asObservable(),
      inventarioAlterado$: new Subject().asObservable(),
      encontroAlterado$: encontroAlterado$.asObservable(),
      reconexao: () => 0,
      conectado: () => true,
    };

    TestBed.configureTestingModule({
      imports: [CampanhaPreviaJogador],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (nome: string) => (nome === 'id' ? String(CAMPANHA_ID) : String(ALVO_ID)) },
              data: opts.previaResolvida ? { previaJogador: opts.previaResolvida } : {},
            },
          },
        },
        { provide: CampanhaProjecaoService, useValue: campanhaProjecaoService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: FichaService, useValue: fichaService },
        { provide: RolagemService, useValue: rolagemService },
        { provide: TempoRealService, useValue: tempoRealService },
        { provide: SessaoService, useValue: { usuario: () => ({ id: MESTRE_ID, login: 'm', nome: 'Mestre' }) } },
        { provide: TopbarContextoService, useValue: { definir: vi.fn(), limpar: vi.fn() } },
        { provide: ConfirmacaoService, useValue: { confirmar: vi.fn() } },
        { provide: PaginaCadernoService, useValue: {} },
      ],
    });

    const fixture = TestBed.createComponent(CampanhaPreviaJogador);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      campanhaProjecaoService,
      campanhaService,
      fichaService,
      rolagemService,
      rolagemRegistrada$,
      membroEntrou$,
      fichaRemovidaDaCampanha$,
      fichaCondicoesAlteradas$,
      fichaAlterada$,
      encontroAlterado$,
    };
  }

  function itemColuna(raiz: HTMLElement, texto: string): HTMLButtonElement {
    const item = Array.from(raiz.querySelectorAll<HTMLButtonElement>('app-coluna-acoes [app-coluna-acoes-item]')).find(
      (elemento) => elemento.textContent?.replace(/\s+/g, ' ').trim().includes(texto),
    );
    if (!item) {
      throw new Error(`Item "${texto}" não encontrado na coluna de ações`);
    }
    return item;
  }

  const esperarCoordenador = () => new Promise((resolve) => setTimeout(resolve, 30));

  it('monta a visão real do jogador, com a barra de prévia e a projeção pedida pelo alvo', () => {
    const { raiz, campanhaProjecaoService } = montar();

    expect(raiz.querySelector('app-campanha-detalhe-jogador')).not.toBeNull();
    expect(raiz.querySelector('app-coluna-acoes')).not.toBeNull();
    expect(campanhaProjecaoService.recuperarPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID);
    expect(raiz.querySelector('.detalhe__preview-texto')?.textContent).toContain('Beta');
    expect(raiz.querySelector('.detalhe__titulo')?.textContent).toContain('Contenção Delta');
  });

  it('usa a projeção do resolver sem buscá-la de novo', () => {
    const { campanhaProjecaoService, raiz } = montar({ previaResolvida: previa() });

    expect(campanhaProjecaoService.recuperarPreviaJogador).not.toHaveBeenCalled();
    expect(raiz.querySelector('.detalhe__preview-texto')?.textContent).toContain('Beta');
  });

  it('nunca chama as rotas que respondem com o privilégio do mestre', () => {
    const { campanhaService, fichaService, rolagemService } = montar();

    expect(campanhaService.recuperarCampanha).not.toHaveBeenCalled();
    expect(campanhaService.listarMembros).not.toHaveBeenCalled();
    expect(fichaService.listarFichas).not.toHaveBeenCalled();
    expect(fichaService.recuperarFicha).not.toHaveBeenCalled();
    expect(rolagemService.listarPorCampanha).not.toHaveBeenCalled();
  });

  it('semeia a ficha do alvo (não a do mestre) e a busca pela rota redigida da prévia', () => {
    const { raiz, campanhaProjecaoService } = montar();

    expect(campanhaProjecaoService.recuperarFichaPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID, 10);
    expect(raiz.querySelector('app-ficha-campanha-card')).not.toBeNull();
  });

  it('a ficha embutida e o painel de Rolagens ficam sem edição e sem rolagem', () => {
    const { fixture } = montar();

    const card = fixture.debugElement.query(By.css('app-ficha-campanha-card')).componentInstance as {
      ajustavel(): boolean;
      podeRolar(): boolean;
      podeMandarParaBase(): boolean;
    };
    expect(card.ajustavel()).toBe(false);
    expect(card.podeRolar()).toBe(false);
    expect(card.podeMandarParaBase()).toBe(false);

    const rolagensPainel = fixture.debugElement.query(By.css('app-ficha-rolagens-painel'))
      .componentInstance as { podeRolar(): boolean; editavel(): boolean };
    expect(rolagensPainel.podeRolar()).toBe(false);
    expect(rolagensPainel.editavel()).toBe(false);
  });

  it('ações de ficha e o Caderno ficam barrados; Calculadora (local) continua disponível', () => {
    const { raiz } = montar();

    for (const texto of ['Criar nova ficha', 'Vincular ficha', 'Acesso de visualização', 'Remover da campanha', 'Excluir ficha', 'Caderno']) {
      expect(itemColuna(raiz, texto).disabled).toBe(true);
    }
    expect(itemColuna(raiz, 'Calculadora').disabled).toBe(false);
    expect(raiz.querySelector('app-caderno-flutuante')).toBeNull();
  });

  it('esconde as saídas para telas com o privilégio do mestre (ficha completa, voltar, janela do histórico)', () => {
    const { raiz } = montar();

    expect(raiz.querySelector('.detalhe__abrir-completa')).toBeNull();
    expect(raiz.querySelector('.detalhe__abrir-completa-rodape')).toBeNull();
    expect(raiz.querySelector('.detalhe__cabecalho-voltar')).toBeNull();
    expect(raiz.querySelector('.detalhe__abrir-rolagens')).toBeNull();
    expect(raiz.querySelector('.detalhe__historico-lista')).not.toBeNull();
  });

  it('"Sair da prévia" volta ao detalhe da campanha do mestre', () => {
    const { raiz } = montar();

    expect(raiz.querySelector('.detalhe__preview-sair')?.getAttribute('href')).toBe(`/campanhas/${CAMPANHA_ID}`);
  });

  it('estado vazio fala do alvo e não oferece criar/vincular', () => {
    const { raiz } = montar({ previaResposta: previa({ fichas: [] }) });

    expect(raiz.querySelector('app-ficha-campanha-card')).toBeNull();
    expect(raiz.querySelector('.detalhe__jogador-vazio')?.textContent).toContain('Beta ainda não tem uma ficha');
    const acoes = raiz.querySelector('.detalhe__jogador-vazio-acoes')?.textContent ?? '';
    expect(acoes).not.toContain('Criar nova ficha');
    expect(acoes).not.toContain('Vincular ficha existente');
    expect(acoes).toContain('Ver Esquadrão');
  });

  it('ficha completa de colega no Esquadrão troca a ficha exibida pela rota da prévia', () => {
    const { fixture, raiz, campanhaProjecaoService } = montar({
      previaResposta: previa({
        fichas: [fichaResumo(), fichaResumo({ id: 20, usuarioId: COLEGA_ID, nome: 'Ficha do Colega' })],
        membros: [
          { usuarioId: MESTRE_ID, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          { usuarioId: ALVO_ID, nome: 'Beta', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [membroFicha(10, 'Agente Beta')] },
          { usuarioId: COLEGA_ID, nome: 'Colega', papel: TipoCampanhaMembroPapelEnum.JOGADOR, fichas: [membroFicha(20, 'Ficha do Colega')] },
        ],
      }),
    });

    const botaoColega = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.detalhe__equipe-ficha')).find((botao) =>
      botao.textContent?.includes('Ficha do Colega'),
    );
    botaoColega?.click();
    fixture.detectChanges();

    expect(campanhaProjecaoService.recuperarFichaPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID, 20);
  });

  it('Inv. Esquadrão some quando o alvo não acessa o inventário, e fica somente leitura quando acessa', () => {
    const semAcesso = montar({ previaResposta: previa({ podeAcessarInventarioEsquadrao: false }) });
    expect(semAcesso.raiz.querySelector('app-segmentado')?.textContent).not.toContain('Inv. Esquadrão');
    expect(semAcesso.campanhaService.recuperarInventario).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    const comAcesso = montar();
    const inventario = comAcesso.fixture.debugElement.query(By.css('app-inventario-esquadrao'))
      .componentInstance as { somenteLeitura(): boolean };
    expect(inventario.somenteLeitura()).toBe(true);
  });

  describe('tempo real', () => {
    it('rolagem pública e privada do próprio alvo entram no feed; privada de terceiro nunca', () => {
      const { fixture, raiz, rolagemRegistrada$ } = montar({ previaResposta: previa({ rolagens: [] }) });

      rolagemRegistrada$.next(rolagem({ id: 77, rotulo: 'Dano público' }));
      rolagemRegistrada$.next(
        rolagem({ id: 78, rotulo: 'Privada do alvo', visibilidade: RolagemVisibilidadeEnum.PRIVADA }),
      );
      rolagemRegistrada$.next(
        rolagem({ id: 79, rotulo: 'Privada de outro', usuarioId: 55, visibilidade: RolagemVisibilidadeEnum.PRIVADA }),
      );
      fixture.detectChanges();

      const feed = raiz.querySelector('.detalhe__historico-lista')?.textContent ?? '';
      expect(feed).toContain('Dano público');
      expect(feed).toContain('Privada do alvo');
      expect(feed).not.toContain('Privada de outro');
    });

    it('membro entrou, ficha removida e condições alteradas refazem a projeção do alvo', async () => {
      const { membroEntrou$, fichaRemovidaDaCampanha$, fichaCondicoesAlteradas$, campanhaProjecaoService } =
        montar();

      for (const disparar of [
        () => membroEntrou$.next({ campanhaId: CAMPANHA_ID, usuarioId: 99 }),
        () => fichaRemovidaDaCampanha$.next({ fichaId: 5, campanhaId: CAMPANHA_ID }),
        () => fichaCondicoesAlteradas$.next({ campanhaId: CAMPANHA_ID }),
      ]) {
        campanhaProjecaoService.recuperarPreviaJogador.mockClear();
        disparar();
        await esperarCoordenador();
        expect(campanhaProjecaoService.recuperarPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID);
      }
    });

    it('ficha:alterada da ficha exibida é refeita pela rota da prévia — o payload do mestre nunca é exibido', async () => {
      const { fixture, fichaAlterada$, campanhaProjecaoService, raiz } = montar();
      campanhaProjecaoService.recuperarFichaPreviaJogador.mockClear();

      fichaAlterada$.next(fichaCompleta({ nome: 'Nome visto só pelo mestre' }));
      await esperarCoordenador();
      fixture.detectChanges();

      expect(campanhaProjecaoService.recuperarFichaPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID, 10);
      expect(raiz.textContent).not.toContain('Nome visto só pelo mestre');
    });
  });

  describe('Iniciativa', () => {
    it('sem combate em andamento, o item fica desabilitado', () => {
      const { raiz } = montar();

      expect(itemColuna(raiz, 'Iniciativa').disabled).toBe(true);
    });

    it('com encontro redigido para o alvo, abre a leitura em modal em vez da rota do mestre', () => {
      const { fixture, raiz } = montar({ previaResposta: previa({ encontroAtivo }) });

      const item = itemColuna(raiz, 'Iniciativa');
      expect(item.tagName).toBe('BUTTON');
      expect(item.disabled).toBe(false);
      item.click();
      fixture.detectChanges();

      expect(raiz.querySelector('app-iniciativa-leitura')).not.toBeNull();
    });

    it('encontro:alterado isolado busca só o encontro seguro do alvo', async () => {
      const { campanhaProjecaoService, encontroAlterado$ } = montar();
      campanhaProjecaoService.recuperarPreviaJogador.mockClear();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, campanhaId: CAMPANHA_ID } });
      await esperarCoordenador();

      expect(campanhaProjecaoService.recuperarPreviaJogador).not.toHaveBeenCalled();
      expect(campanhaProjecaoService.recuperarEncontroAtivoPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID);
    });

    it('encontro:alterado de outra campanha não dispara nada', async () => {
      const { campanhaProjecaoService, encontroAlterado$ } = montar();
      campanhaProjecaoService.recuperarPreviaJogador.mockClear();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, campanhaId: CAMPANHA_ID + 1 } });
      await esperarCoordenador();

      expect(campanhaProjecaoService.recuperarPreviaJogador).not.toHaveBeenCalled();
      expect(campanhaProjecaoService.recuperarEncontroAtivoPreviaJogador).not.toHaveBeenCalled();
    });
  });
});
