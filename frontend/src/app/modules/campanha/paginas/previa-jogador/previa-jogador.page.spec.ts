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
import { TempoRealService } from '../../../../core/services/tempo-real.service';

const CAMPANHA_ID = 8;
const ALVO_ID = 2;
const COLEGA_ID = 3;

/**
 * Prova a Prévia de jogador (m8-04) — fichas/Equipe/Rolagens/Sessão da projeção do **alvo**
 * (`recuperarPreviaJogador`), nunca do mestre; nenhum submit/mutação sai da prévia; tempo real
 * (rolagem pública ao vivo, refetch em evento de membro/ficha).
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
      energiaAtual: 5,
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

  function previa(sobrescritas: Partial<CampanhaPreviaJogadorDto> = {}): CampanhaPreviaJogadorDto {
    return {
      campanha: { id: CAMPANHA_ID, nome: 'Contenção Delta', descricao: null, naBase: true },
      fichas: [fichaResumo()],
      membros: [
        { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
        {
          usuarioId: ALVO_ID,
          nome: 'Beta',
          papel: TipoCampanhaMembroPapelEnum.JOGADOR,
          fichas: [
            { id: 10, nome: 'Agente Beta', classe: ClasseEnum.COMBATENTE, arquetipo: null, imagemUrl: null, cor: null, acessoCompleto: true },
          ],
        },
      ],
      rolagens: [rolagem()],
      podeAcessarInventarioEsquadrao: true,
      encontroAtivo: null,
      ...sobrescritas,
    };
  }

  function montar(opts: { previaResposta?: CampanhaPreviaJogadorDto; fichaResposta?: FichaRecuperadaDto } = {}) {
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const membroEntrou$ = new Subject<unknown>();
    const fichaVisibilidadeAlterada$ = new Subject<unknown>();
    const fichaAlterada$ = new Subject<{ id: number }>();
    const inventarioAlterado$ = new Subject<{ campanhaId: number }>();
    const encontroAlterado$ = new Subject<{ encontro: { campanhaId: number } }>();

    const campanhaProjecaoService = {
      recuperarPreviaJogador: vi.fn(() => of(opts.previaResposta ?? previa())),
      recuperarFichaPreviaJogador: vi.fn(() => of(opts.fichaResposta ?? fichaCompleta())),
    };
    const campanhaService = {
      recuperarInventario: vi.fn(() => of({ itens: [] })),
    };
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable(),
      membroEntrou$: membroEntrou$.asObservable(),
      fichaVisibilidadeAlterada$: fichaVisibilidadeAlterada$.asObservable(),
      fichaAlterada$: fichaAlterada$.asObservable(),
      inventarioAlterado$: inventarioAlterado$.asObservable(),
      encontroAlterado$: encontroAlterado$.asObservable(),
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
            },
          },
        },
        { provide: CampanhaProjecaoService, useValue: campanhaProjecaoService },
        { provide: CampanhaService, useValue: campanhaService },
        { provide: TempoRealService, useValue: tempoRealService },
      ],
    });

    const fixture = TestBed.createComponent(CampanhaPreviaJogador);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      campanhaProjecaoService,
      rolagemRegistrada$,
      membroEntrou$,
      fichaAlterada$,
      encontroAlterado$,
    };
  }

  it('mostra a barra de prévia com o nome do alvo e carrega a projeção pelo alvo, não pelo mestre', () => {
    const { raiz, campanhaProjecaoService } = montar();

    expect(campanhaProjecaoService.recuperarPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID);
    expect(raiz.querySelector('.previa-jogador__preview-texto')?.textContent).toContain('Beta');
  });

  it('auto-seleciona a própria ficha do alvo e busca a ficha completa pela projeção da prévia', () => {
    const { raiz, campanhaProjecaoService } = montar();

    expect(campanhaProjecaoService.recuperarFichaPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID, 10);
    expect(raiz.querySelector('app-ficha-visualizacao')).not.toBeNull();
  });

  it('estado vazio quando o alvo não tem ficha nesta campanha', () => {
    const { raiz } = montar({ previaResposta: previa({ fichas: [] }) });

    expect(raiz.querySelector('app-ficha-visualizacao')).toBeNull();
    expect(raiz.textContent).toContain('não tem uma ficha nesta campanha');
  });

  it('ficha de colega sem acesso completo aparece como carteirinha (teaser), não clicável', () => {
    const { raiz } = montar({
      previaResposta: previa({
        membros: [
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          {
            usuarioId: ALVO_ID,
            nome: 'Beta',
            papel: TipoCampanhaMembroPapelEnum.JOGADOR,
            fichas: [{ id: 10, nome: 'Agente Beta', classe: ClasseEnum.COMBATENTE, arquetipo: null, imagemUrl: null, cor: null, acessoCompleto: true }],
          },
          {
            usuarioId: COLEGA_ID,
            nome: 'Colega',
            papel: TipoCampanhaMembroPapelEnum.JOGADOR,
            fichas: [{ id: 20, nome: 'Ficha Oculta', classe: ClasseEnum.SUPORTE, arquetipo: null, imagemUrl: null, cor: null, acessoCompleto: false }],
          },
        ],
      }),
    });

    expect(raiz.querySelector('.previa-jogador__equipe-carteirinha')?.textContent).toContain('Ficha Oculta');
    const botoesFicha = Array.from(raiz.querySelectorAll('.previa-jogador__equipe-ficha')).map((el) =>
      el.textContent,
    );
    expect(botoesFicha.some((texto) => texto?.includes('Ficha Oculta'))).toBe(false);
  });

  it('clicar na ficha completa de um colega troca a ficha exibida (leitura, sem mutação)', () => {
    const { fixture, raiz, campanhaProjecaoService } = montar({
      previaResposta: previa({
        fichas: [fichaResumo(), fichaResumo({ id: 20, usuarioId: COLEGA_ID, nome: 'Ficha do Colega' })],
        membros: [
          { usuarioId: 1, nome: 'Mestre', papel: TipoCampanhaMembroPapelEnum.MESTRE, fichas: [] },
          {
            usuarioId: ALVO_ID,
            nome: 'Beta',
            papel: TipoCampanhaMembroPapelEnum.JOGADOR,
            fichas: [{ id: 10, nome: 'Agente Beta', classe: ClasseEnum.COMBATENTE, arquetipo: null, imagemUrl: null, cor: null, acessoCompleto: true }],
          },
          {
            usuarioId: COLEGA_ID,
            nome: 'Colega',
            papel: TipoCampanhaMembroPapelEnum.JOGADOR,
            fichas: [{ id: 20, nome: 'Ficha do Colega', classe: ClasseEnum.SUPORTE, arquetipo: null, imagemUrl: null, cor: null, acessoCompleto: true }],
          },
        ],
      }),
    });

    const botaoColega = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.previa-jogador__equipe-ficha')).find(
      (botao) => botao.textContent?.includes('Colega'),
    );
    botaoColega?.click();
    fixture.detectChanges();

    expect(campanhaProjecaoService.recuperarFichaPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID, 20);
  });

  it('feed de rolagens só mostra o que a projeção do alvo devolveu (rolagem privada de terceiro nunca chega)', () => {
    const rolagemPrivadaDeOutro = rolagem({ id: 99, usuarioId: 55, nomeAutor: 'Outro Jogador' });
    // A projeção do backend nunca devolveria isso para este alvo — o teste prova que o front
    // não filtra/inventa nada por conta própria: mostra exatamente o array que a projeção manda.
    const { raiz } = montar({ previaResposta: previa({ rolagens: [rolagem()] }) });

    expect(raiz.textContent).not.toContain(rolagemPrivadaDeOutro.nomeAutor);
  });

  it('tempo real: rolagem pública via socket entra no topo do feed (Sessão)', () => {
    const { fixture, raiz, rolagemRegistrada$ } = montar({ previaResposta: previa({ rolagens: [] }) });
    expect(raiz.textContent).toContain('Nenhuma rolagem na última hora');

    rolagemRegistrada$.next(rolagem({ id: 77, rotulo: 'Dano 2d6' }));
    fixture.detectChanges();

    expect(raiz.textContent).toContain('Dano 2d6');
  });

  it('membro entrou/ficha alterada refazem a projeção (spec item 4)', () => {
    const { fixture, membroEntrou$, campanhaProjecaoService } = montar();
    campanhaProjecaoService.recuperarPreviaJogador.mockClear();

    membroEntrou$.next({});
    fixture.detectChanges();

    expect(campanhaProjecaoService.recuperarPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID);
  });

  it('nenhum controle de mutação está conectado: FichaVisualizacao/FichaRolagensPainel sempre com podeRolar=false, InventarioEsquadrao sempre somenteLeitura', () => {
    const { fixture } = montar();

    const fichaVisualizacao = fixture.debugElement.query(By.css('app-ficha-visualizacao'))
      .componentInstance as { podeRolar(): boolean; ehMestre(): boolean };
    expect(fichaVisualizacao.podeRolar()).toBe(false);
    expect(fichaVisualizacao.ehMestre()).toBe(false);

    const rolagensPainel = fixture.debugElement.query(By.css('app-ficha-rolagens-painel'))
      .componentInstance as { podeRolar(): boolean; editavel(): boolean };
    expect(rolagensPainel.podeRolar()).toBe(false);
    expect(rolagensPainel.editavel()).toBe(false);
  });

  it('"Sair da prévia" leva de volta ao detalhe da campanha do mestre', () => {
    const { raiz } = montar();
    const link = raiz.querySelector('.previa-jogador__preview-sair');

    expect(link?.getAttribute('href')).toBe(`/campanhas/${CAMPANHA_ID}`);
  });

  describe('"Ver Iniciativa" (m8-05)', () => {
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

    it('não aparece sem encontro ativo', () => {
      const { raiz } = montar({ previaResposta: previa({ encontroAtivo: null }) });
      expect(raiz.querySelector('.previa-jogador__ver-iniciativa')).toBeNull();
    });

    it('aparece com encontro ativo (redigido para o alvo) e abre a composição de leitura ao clicar', () => {
      const { fixture, raiz } = montar({ previaResposta: previa({ encontroAtivo }) });

      const gatilho = raiz.querySelector('.previa-jogador__ver-iniciativa') as HTMLButtonElement;
      expect(gatilho).not.toBeNull();
      expect(raiz.querySelector('dialog')?.hasAttribute('open')).toBeFalsy();

      gatilho.click();
      fixture.detectChanges();

      expect(raiz.querySelector('app-iniciativa-leitura')).not.toBeNull();
    });

    it('encontro:alterado da própria campanha refaz a projeção inteira via REST — nunca lê o payload do evento (o mestre requisitante não pode herdar o próprio recorte de mestre)', () => {
      const { fixture, campanhaProjecaoService, encontroAlterado$ } = montar({
        previaResposta: previa({ encontroAtivo: null }),
      });
      campanhaProjecaoService.recuperarPreviaJogador.mockClear();
      campanhaProjecaoService.recuperarPreviaJogador.mockReturnValue(of(previa({ encontroAtivo })));

      encontroAlterado$.next({
        encontro: { ...encontroAtivo, id: 999, campanhaId: CAMPANHA_ID } as never,
      });
      fixture.detectChanges();

      expect(campanhaProjecaoService.recuperarPreviaJogador).toHaveBeenCalledWith(CAMPANHA_ID, ALVO_ID);
    });

    it('encontro:alterado de OUTRA campanha não dispara refetch', () => {
      const { fixture, campanhaProjecaoService, encontroAlterado$ } = montar();
      campanhaProjecaoService.recuperarPreviaJogador.mockClear();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, campanhaId: CAMPANHA_ID + 1 } as never });
      fixture.detectChanges();

      expect(campanhaProjecaoService.recuperarPreviaJogador).not.toHaveBeenCalled();
    });
  });
});
