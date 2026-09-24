import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import type { CampanhaPainelEspectadorDto } from '@contratados-rpg/shared/dtos/campanha';
import type { EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import {
  CadenciaEnum,
  CombatenteOrigemEnum,
  EncontroEventoTipoEnum,
  EncontroStatusEnum,
  RolagemVisibilidadeEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { PainelEncontroEspectador } from './painel-espectador.page';
import { CampanhaProjecaoService } from '../../../campanha/campanha-projecao.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { HistoricoRolagensJanelaService } from '../../../../shared/historico-rolagens-sidebar/historico-rolagens-janela.service';

/**
 * Prova a Iniciativa do espectador (corrige `P-073`): mesma casca de mestre/jogador, mas sem
 * `app-coluna-acoes` e sem nenhum controle de condução — a spec cobre isso na prática (assertions
 * de ausência no DOM), não só supõe pelo binding — e nunca chama os endpoints que o backend
 * recusa (403) para `ESPECTADOR`.
 */
describe('PainelEncontroEspectador', () => {
  const CAMPANHA_ID = 8;

  const combatente = (
    id: number,
    nome: string,
    extras: Partial<EncontroRecuperadoDto['combatentes'][number]> = {},
  ) => ({
    id,
    encontroId: 1,
    origem: CombatenteOrigemEnum.FICHA,
    fichaId: id * 100,
    tipoFicha: TipoFichaEnum.JOGADOR,
    nome,
    iniciativa: 10,
    cadencia: CadenciaEnum.SINGULAR,
    ordem: id,
    vidaAtual: 10,
    vidaMaxima: 10,
    energiaAtual: 5,
    energiaMaxima: 5,
    defesa: 12,
    esquiva: 11,
    bloqueio: 6,
    contraAtaque: 7,
    condicoes: [],
    morrendo: false,
    machucado: false,
    inconsciente: false,
    destreza: 3,
    iniciativaBonus: 0,
    dadoExtraIniciativa: 0,
    iniciativaFormulaCustom: null,
    corFicha: null,
    imagemUrl: null,
    imagemFoco: null,
    donoNome: null,
    classe: null,
    arquetipo: null,
    resistencias: null,
    revelado: true,
    ...extras,
  });

  const encontroAtivo: EncontroRecuperadoDto = {
    id: 1,
    campanhaId: CAMPANHA_ID,
    nome: 'Emboscada no Setor 4',
    status: EncontroStatusEnum.ATIVO,
    rodadaAtual: 2,
    turnoIndice: 1,
    combatentes: [
      combatente(1, 'Agente Kane', { iniciativa: 18 }),
      combatente(2, 'SCP-1471-A', { tipoFicha: TipoFichaEnum.CRIATURA, iniciativa: 24 }),
    ],
    ordemRodada: [
      { combatenteId: 2, ocorrencia: 1 },
      { combatenteId: 1, ocorrencia: 1 },
    ],
    eventos: [
      {
        id: 1,
        tipo: EncontroEventoTipoEnum.RODADA_INICIADA,
        rodada: 2,
        turno: 1,
        texto: 'Rodada 2 iniciada',
        combatenteId: null,
        createdDate: new Date().toISOString(),
      },
    ],
  };

  function painel(
    encontro: EncontroRecuperadoDto | null = encontroAtivo,
  ): CampanhaPainelEspectadorDto {
    return {
      campanha: { id: CAMPANHA_ID, nome: 'Contenção Delta', descricao: null, naBase: false },
      rolagens: { itens: [], totalItens: 0, paginaAtual: 1, totalPaginas: 1 },
      encontroAtivo: encontro,
      fichas: [],
      membros: [],
    };
  }

  function rolagem(sobrescritas: Partial<RolagemResumoDto> = {}): RolagemResumoDto {
    return {
      id: 1,
      fichaId: 100,
      encontroCombatenteId: null,
      campanhaId: CAMPANHA_ID,
      usuarioId: 1,
      nomeAutor: 'Agente Kane',
      nomeFicha: 'Kane',
      rotulo: 'Ataque',
      formula: '1d20+5',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { dados: [], atributos: [], constante: 5, total: 17 },
      createdDate: new Date().toISOString(),
      corFicha: null,
      ...sobrescritas,
    };
  }

  function montar(opts: {
    painelRetorno?: CampanhaPainelEspectadorDto;
    rolagensRetorno?: readonly RolagemResumoDto[];
  }) {
    const campanhaProjecaoService = {
      recuperarPainelEspectador: vi.fn(() => of(opts.painelRetorno ?? painel())),
      recuperarEncontroAtivoPainelEspectador: vi.fn(() => of(null as EncontroRecuperadoDto | null)),
    };
    const rolagemService = {
      listarPorCampanha: vi.fn(() => of(opts.rolagensRetorno ?? [])),
    };
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const encontroAlterado$ = new Subject<{ encontro: { campanhaId: number } }>();
    const tempoRealService = {
      conectar: vi.fn(),
      entrarSalaCampanha: vi.fn(),
      sairSalaCampanha: vi.fn(),
      rolagemRegistrada$: rolagemRegistrada$.asObservable(),
      rolagemExcluida$: new Subject().asObservable(),
      encontroAlterado$: encontroAlterado$.asObservable(),
    };

    TestBed.configureTestingModule({
      imports: [PainelEncontroEspectador],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => String(CAMPANHA_ID) },
              data: { painelEspectador: opts.painelRetorno ?? painel() },
            },
          },
        },
        { provide: CampanhaProjecaoService, useValue: campanhaProjecaoService },
        { provide: RolagemService, useValue: rolagemService },
        { provide: TempoRealService, useValue: tempoRealService },
      ],
    });

    const fixture = TestBed.createComponent(PainelEncontroEspectador);
    fixture.detectChanges();
    return {
      fixture,
      raiz: fixture.nativeElement as HTMLElement,
      campanhaProjecaoService,
      rolagemService,
      tempoRealService,
      rolagemRegistrada$,
      encontroAlterado$,
    };
  }

  it('entra na sala de campanha e mostra o cabeçalho (título, campanha, status)', () => {
    const { raiz, tempoRealService } = montar({});

    expect(tempoRealService.conectar).toHaveBeenCalled();
    expect(tempoRealService.entrarSalaCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(raiz.querySelector('.iniciativa-espectador__titulo')?.textContent).toContain(
      'Emboscada no Setor 4',
    );
    expect(raiz.querySelector('.iniciativa-espectador__campanha')?.textContent).toBe(
      'Contenção Delta',
    );
    expect(raiz.textContent).toContain('Em combate');
  });

  it('renderiza a trilha e um cartão por combatente no palco', () => {
    const { raiz } = montar({});
    expect(raiz.querySelector('app-trilha-turnos')).not.toBeNull();
    expect(raiz.querySelectorAll('app-cartao-combatente').length).toBe(2);
  });

  it('alimenta o histórico de rolagens com o feed da campanha', () => {
    const { raiz, rolagemService } = montar({ rolagensRetorno: [rolagem()] });
    expect(rolagemService.listarPorCampanha).toHaveBeenCalledWith(CAMPANHA_ID);
    expect(raiz.querySelector('app-historico-rolagens-sidebar')?.textContent).toContain('Ataque');
  });

  it('abre a janela externa com a origem do espectador', () => {
    const { raiz } = montar({ rolagensRetorno: [rolagem()] });
    const abrirCampanha = vi
      .spyOn(TestBed.inject(HistoricoRolagensJanelaService), 'abrirCampanha')
      .mockReturnValue(true);

    (raiz.querySelector('.historico-rolagens__janela') as HTMLButtonElement).click();
    expect(abrirCampanha).toHaveBeenCalledWith(CAMPANHA_ID, 'espectador');
  });

  it('sem encontro ativo, mostra o estado vazio (mesmo texto do jogador)', () => {
    const { raiz } = montar({ painelRetorno: painel(null) });
    expect(raiz.querySelector('.iniciativa-espectador__vazio')).not.toBeNull();
    expect(raiz.textContent).toContain('Nenhum combate em andamento.');
    expect(raiz.querySelector('app-trilha-turnos')).toBeNull();
  });

  it('NÃO tem coluna de ações — espectador não gerencia combate nem tem Calculadora/Caderno aqui', () => {
    const { raiz } = montar({});
    expect(raiz.querySelector('app-coluna-acoes')).toBeNull();
  });

  it('NÃO tem nenhum controle de condução: sem stepper de Vida/Energia, receber dano, remover, rolagem avulsa ou edição de iniciativa', () => {
    const { raiz } = montar({});
    expect(raiz.querySelectorAll('.combatente__stepper').length).toBe(0);
    expect(raiz.querySelector('.combatente__ajustar')).toBeNull();
    expect(raiz.querySelector('.combatente__receber-dano')).toBeNull();
    expect(raiz.querySelector('.combatente__remover')).toBeNull();
    expect(raiz.querySelector('.combatente__rolar-avulso')).toBeNull();
    expect(raiz.querySelector('input.combatente__iniciativa-campo')).toBeNull();
    expect(raiz.querySelector('app-conducao-turno')).toBeNull();
    expect(raiz.textContent).not.toContain('Encerrar combate');
  });

  it('usa o painel já resolvido pela rota, sem refazer o fetch (só CampanhaProjecaoService/RolagemService injetados)', () => {
    // A causa raiz do P-073 era esta tela reusar `EncontroPainelDadosService`
    // (listarMembros/GET ficha?campanhaId/GET campanha/:id) — nenhum desses serviços está
    // sequer provido neste TestBed; se o componente os injetasse, a montagem já teria falhado.
    const { campanhaProjecaoService } = montar({});
    expect(campanhaProjecaoService.recuperarPainelEspectador).not.toHaveBeenCalled();
  });

  it('sem dado resolvido pela rota, busca o painel via `recuperarPainelEspectador` (fallback defensivo)', () => {
    TestBed.configureTestingModule({
      imports: [PainelEncontroEspectador],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => String(CAMPANHA_ID) }, data: {} } },
        },
        {
          provide: CampanhaProjecaoService,
          useValue: {
            recuperarPainelEspectador: vi.fn(() => of(painel())),
            recuperarEncontroAtivoPainelEspectador: vi.fn(() => of(null)),
          },
        },
        { provide: RolagemService, useValue: { listarPorCampanha: vi.fn(() => of([])) } },
        {
          provide: TempoRealService,
          useValue: {
            conectar: vi.fn(),
            entrarSalaCampanha: vi.fn(),
            sairSalaCampanha: vi.fn(),
            rolagemRegistrada$: new Subject<RolagemResumoDto>().asObservable(),
            rolagemExcluida$: new Subject().asObservable(),
            encontroAlterado$: new Subject<{ encontro: { campanhaId: number } }>().asObservable(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PainelEncontroEspectador);
    fixture.detectChanges();
    const campanhaProjecaoService = TestBed.inject(CampanhaProjecaoService) as unknown as {
      recuperarPainelEspectador: ReturnType<typeof vi.fn>;
    };
    expect(campanhaProjecaoService.recuperarPainelEspectador).toHaveBeenCalledWith(CAMPANHA_ID, 1, 20);
  });

  it('mestre em prévia: rolagens PRIVADA (REST ou socket) ficam fora do histórico do espectador', () => {
    const { fixture, raiz, rolagemRegistrada$ } = montar({
      rolagensRetorno: [
        rolagem({ id: 1 }),
        rolagem({ id: 2, rotulo: 'Segredo REST', visibilidade: RolagemVisibilidadeEnum.PRIVADA }),
      ],
    });

    rolagemRegistrada$.next(
      rolagem({ id: 3, rotulo: 'Segredo socket', visibilidade: RolagemVisibilidadeEnum.PRIVADA }),
    );
    fixture.detectChanges();

    const historico = raiz.querySelector('app-historico-rolagens-sidebar')?.textContent ?? '';
    expect(historico).toContain('Ataque');
    expect(historico).not.toContain('Segredo REST');
    expect(historico).not.toContain('Segredo socket');
  });

  it('incorpora rolagem:registrada pública em tempo real, sem duplicar', () => {
    const existente = rolagem({ id: 1 });
    const { fixture, raiz, rolagemRegistrada$ } = montar({ rolagensRetorno: [existente] });

    rolagemRegistrada$.next(existente);
    fixture.detectChanges();
    const sidebar = raiz.querySelector('app-historico-rolagens-sidebar');
    expect(sidebar?.textContent?.match(/Ataque/g)?.length).toBe(1);

    const nova = rolagem({ id: 2, rotulo: 'Investigar' });
    rolagemRegistrada$.next(nova);
    fixture.detectChanges();
    expect(raiz.querySelector('app-historico-rolagens-sidebar')?.textContent).toContain(
      'Investigar',
    );
  });

  it('encontro:alterado da própria campanha busca o encontro redigido via REST', () => {
    const { fixture, campanhaProjecaoService, encontroAlterado$ } = montar({});
    const encontroRedigido: EncontroRecuperadoDto = { ...encontroAtivo, turnoIndice: 0 };
    campanhaProjecaoService.recuperarEncontroAtivoPainelEspectador.mockReturnValue(
      of(encontroRedigido),
    );

    encontroAlterado$.next({ encontro: { campanhaId: CAMPANHA_ID } });
    fixture.detectChanges();

    expect(campanhaProjecaoService.recuperarEncontroAtivoPainelEspectador).toHaveBeenCalledWith(
      CAMPANHA_ID,
    );
  });

  it('encontro:alterado de OUTRA campanha não dispara refetch', () => {
    const { fixture, campanhaProjecaoService, encontroAlterado$ } = montar({});
    campanhaProjecaoService.recuperarEncontroAtivoPainelEspectador.mockClear();

    encontroAlterado$.next({ encontro: { campanhaId: CAMPANHA_ID + 1 } });
    fixture.detectChanges();

    expect(campanhaProjecaoService.recuperarEncontroAtivoPainelEspectador).not.toHaveBeenCalled();
  });
});
