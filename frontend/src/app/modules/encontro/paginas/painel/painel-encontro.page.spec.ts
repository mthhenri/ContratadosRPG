import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';

import type {
  EncontroAlteradoDto,
  EncontroRecuperadoDto,
  EncontroResumoDto,
} from '@contratados-rpg/shared/dtos/encontro';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaRecuperadaDto, FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import type { RolagemResumoDto } from '@contratados-rpg/shared/dtos/rolagem';
import type {
  PaginaCadernoEsquadraoAlteradaDto,
  PaginaCadernoResumoDto,
} from '@contratados-rpg/shared/dtos/pagina-caderno';
import {
  ArquetipoEnum,
  CadenciaEnum,
  ClasseEnum,
  CombatenteOrigemEnum,
  EncontroStatusEnum,
  NivelAmeacaEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
  RolagemVisibilidadeEnum,
} from '@contratados-rpg/shared/enums';

import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { ConfirmacaoService } from '../../../../shared/ui/confirmacao/confirmacao.service';
import { NotificacaoService } from '../../../../shared/ui/notificacao/notificacao.service';
import { EncontroService } from '../../encontro.service';
import { PainelEncontro } from './painel-encontro.page';

const CAMPANHA_ID = 9;

/**
 * Prova o painel do mestre (m7-05). O foco é o que a **tela** deriva — de quem é a vez, quem já
 * agiu, quantas ações restam — a partir da `ordemRodada` que o backend calculou com
 * `shared/regras/encontro`. Nenhuma regra de ordem/cadência é recalculada aqui, e o teste garante
 * justamente isso: a ordem chega pronta e a tela só a lê.
 */
describe('PainelEncontro', () => {
  it('hospeda a bandeja central que apresenta o resultado das rolagens', () => {
    const { fixture } = montar();
    const elemento = fixture.nativeElement as HTMLElement;
    expect(elemento.querySelector('app-bandeja-dados')).not.toBeNull();
  });
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

  // Uma criatura de Cadência Dupla intercalada entre dois agentes — o caso canônico do guia.
  const encontroAtivo: EncontroRecuperadoDto = {
    id: 1,
    campanhaId: CAMPANHA_ID,
    nome: 'Contenção no Setor 12',
    status: EncontroStatusEnum.ATIVO,
    rodadaAtual: 2,
    turnoIndice: 2,
    combatentes: [
      combatente(1, 'SCP-1471-A', {
        tipoFicha: TipoFichaEnum.CRIATURA,
        cadencia: CadenciaEnum.DUPLA,
        iniciativa: 24,
        iniciativaBonus: 3,
        destreza: 5,
      }),
      combatente(2, 'K. Amaral', { iniciativa: 18 }),
      combatente(3, 'V. Corvalho', { iniciativa: 12 }),
    ],
    // 1(1º) → 2 → 1(2º) → 3
    ordemRodada: [
      { combatenteId: 1, ocorrencia: 1 },
      { combatenteId: 2, ocorrencia: 1 },
      { combatenteId: 1, ocorrencia: 2 },
      { combatenteId: 3, ocorrencia: 1 },
    ],
    eventos: [],
  };

  const membros: CampanhaMembroResumoDto[] = [
    {
      usuarioId: 1,
      nome: 'Matheus',
      papel: TipoCampanhaMembroPapelEnum.MESTRE,
      fichas: [] as unknown as CampanhaMembroResumoDto['fichas'],
    },
    {
      usuarioId: 7,
      nome: 'Bia',
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      fichas: [{ id: 200, nome: 'K. Amaral' }] as unknown as CampanhaMembroResumoDto['fichas'],
    },
  ];

  /** Documento mínimo da ficha de quem joga — o bastante para o preset "Iniciativa" resolver. */
  const fichaDoJogador = {
    id: 200,
    cor: '#4a9d6b',
    dados: {
      classe: ClasseEnum.COMBATENTE,
      nivel: 2,
      atributos: {
        destreza: 4, forca: 2, luta: 2, pontaria: 2, vigor: 2,
        intelecto: 2, medicina: 0, sentidos: 2, social: 0, vontade: 2,
      },
      estado: { vidaAtual: 20, energiaAtual: 10, lesoes: [] },
      inventario: { itens: [], amplificadores: [] },
      habilidades: [],
      rolagens: [
        { nome: 'Iniciativa', formula: 'DESd6', habilidadesVinculadas: [], passos: [] },
      ],
      identidade: { personalidade: null, origem: null },
    },
  } as unknown as FichaRecuperadaDto;

  /** Resumo usado apenas quando o teste precisa exercitar a abertura da própria ficha. */
  const fichaResumoDoJogador = {
    id: 200,
    campanhaId: CAMPANHA_ID,
    campanhaNome: null,
    usuarioId: 7,
    nome: 'K. Amaral',
    tipo: TipoFichaEnum.JOGADOR,
    na: null,
    classe: ClasseEnum.COMBATENTE,
    arquetipo: ArquetipoEnum.MERCENARIO,
    nivel: 2,
    vidaAtual: 20,
    energiaAtual: 10,
    morrendo: false,
    machucado: false,
    inconsciente: false,
  } as unknown as FichaResumoDto;

  const fichas = [
    {
      id: 100,
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
      usuarioId: 7,
      nome: 'SCP-1471-A',
      tipo: TipoFichaEnum.CRIATURA,
      na: NivelAmeacaEnum.ALTA,
      vd: 40,
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 0,
      vidaAtual: 40,
      energiaAtual: 0,
      morrendo: false,
      machucado: false,
      inconsciente: false,
    },
    // Fora do encontro em `encontroAtivo` — o cartão do seletor de combatentes (Agentes) que os
    // testes de "selecionar/remover" usam para exercitar o caminho de **adicionar**.
    {
      id: 999,
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
      usuarioId: 9,
      nome: 'Novo Recruta',
      tipo: TipoFichaEnum.JOGADOR,
      na: null,
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.MERCENARIO,
      nivel: 1,
      vidaAtual: 15,
      energiaAtual: 5,
      morrendo: false,
      machucado: false,
      inconsciente: false,
    },
  ] as unknown as FichaResumoDto[];

  const USUARIO_MESTRE = 1;
  const USUARIO_JOGADOR = 7;

  function montar(
    estado: EncontroRecuperadoDto = encontroAtivo,
    usuarioId: number = USUARIO_MESTRE,
    historicoExtra: readonly EncontroResumoDto[] = [],
    incluirFichaDoJogador = false,
  ) {
    const encontroAlterado$ = new Subject<EncontroAlteradoDto>();
    const encontroIniciativaPedido$ = new Subject<{ id: number; campanhaId: number }>();
    const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
    const paginaEsquadraoCriada$ = new Subject<PaginaCadernoResumoDto>();
    const paginaEsquadraoAlterada$ = new Subject<PaginaCadernoEsquadraoAlteradaDto>();
    const paginaEsquadraoExcluida$ = new Subject<{ campanhaId: number; paginaId: number }>();
    const presencaEsquadraoCaderno$ = new Subject<unknown>();
    const encontroService = {
      listarPorCampanha: vi.fn(() =>
        of([
          {
            id: estado.id,
            campanhaId: estado.campanhaId,
            nome: estado.nome,
            status: estado.status,
            rodadaAtual: estado.rodadaAtual,
            quantidadeCombatentes: estado.combatentes.length,
            createdDate: '2026-08-17T00:00:00.000Z',
          },
          ...historicoExtra,
        ]),
      ),
      recuperarEncontro: vi.fn(() => of(estado)),
      criarEncontro: vi.fn(() =>
        of({
          id: estado.id,
          campanhaId: estado.campanhaId,
          nome: 'Contenção no Setor 12',
          status: EncontroStatusEnum.MONTAGEM,
          rodadaAtual: 0,
          createdDate: '2026-08-17T00:00:00.000Z',
        }),
      ),
      rolarIniciativasFaltantes: vi.fn(() => of(estado)),
      atribuirIniciativa: vi.fn(() => of(estado)),
      alterarFormulaIniciativa: vi.fn(() => of(estado)),
      avancarTurno: vi.fn(() => of(estado)),
      voltarTurno: vi.fn(() => of(estado)),
      iniciarEncontro: vi.fn(() => of(estado)),
      pedirIniciativa: vi.fn(() => of(estado)),
      ajustarVida: vi.fn(() => of(estado)),
      adicionarCombatente: vi.fn(() => of(estado)),
      removerCombatente: vi.fn(() => of(estado)),
      encerrarEncontro: vi.fn(() => of(estado)),
      alterarIdentidadeAvulso: vi.fn(() => of(estado)),
      alterarImagemAvulso: vi.fn(() => of(estado)),
      excluirImagemAvulso: vi.fn(() => of(estado)),
    };
    const fichaService = {
      listarFichas: vi.fn(() =>
        of(incluirFichaDoJogador ? [...fichas, fichaResumoDoJogador] : fichas),
      ),
      recuperarFicha: vi.fn(() => of(fichaDoJogador)),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: EncontroService, useValue: encontroService },
        {
          provide: RolagemService,
          useValue: {
            listarPorCampanha: vi.fn(() => of([])),
            registrar: vi.fn(
              (
                fichaId: number,
                dto: { rotulo: string; formula: string | null; resultado: unknown },
              ) =>
              of({
                id: 1,
                fichaId,
                campanhaId: CAMPANHA_ID,
                usuarioId,
                nomeAutor: 'Bia',
                nomeFicha: 'K. Amaral',
                rotulo: dto.rotulo,
                formula: dto.formula,
                visibilidade: RolagemVisibilidadeEnum.PUBLICA,
                resultado: dto.resultado,
                createdDate: '2026-08-20T15:00:00.000Z',
                corFicha: null,
              }),
            ),
            registrarAvulso: vi.fn(),
          },
        },
        { provide: FichaService, useValue: fichaService },
        { provide: SessaoService, useValue: { usuario: () => ({ id: usuarioId }) } },
        {
          provide: CampanhaService,
          useValue: {
            listarMembros: vi.fn(() => of(membros)),
            recuperarCampanha: vi.fn(() => of({ id: CAMPANHA_ID, nome: 'Campanha de Teste' })),
          },
        },
        {
          provide: TempoRealService,
          useValue: {
            conectar: vi.fn(),
            entrarSalaCampanha: vi.fn(),
            sairSalaCampanha: vi.fn(),
            enviarPresencaEsquadrao: vi.fn(),
            conectado: () => true,
            reconexao: () => 0,
            encontroAlterado$,
            encontroIniciativaPedido$,
            rolagemRegistrada$,
            paginaEsquadraoCriada$,
            paginaEsquadraoAlterada$,
            paginaEsquadraoExcluida$,
            presencaEsquadraoCaderno$,
          },
        },
        {
          // `paramMap` como Observable: a página escuta a troca de `:encontroId` (histórico) em vez
          // de ler o snapshot uma vez, porque o Angular reusa o componente entre esses dois estados.
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map([['campanhaId', String(CAMPANHA_ID)]]) },
            paramMap: of(convertToParamMap({ campanhaId: String(CAMPANHA_ID) })),
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(PainelEncontro);
    fixture.detectChanges();
    return {
      fixture,
      encontroService,
      fichaService,
      encontroAlterado$,
      encontroIniciativaPedido$,
      rolagemRegistrada$,
    };
  }

  /** Os membros `protected` que o template consome — o teste lê exatamente o que a tela lê. */
  interface PainelInterno {
    readonly encontro: () => EncontroRecuperadoDto | null;
    readonly combatentes: () => readonly {
      id: number;
      nome: string;
      ocorrencia: number;
      totalOcorrencias: number;
      indiceOrdem: number | null;
    }[];
    readonly combatenteDaVez: () => { nome: string } | null;
    readonly acoesRestantesDaVez: () => number;
    readonly totalDeTurnos: () => number;
    readonly modoEdicao: { set(valor: boolean): void };
    readonly jaAgiu: (combatente: { id: number }) => boolean;
    readonly nivelAmeaca: (combatente: unknown) => NivelAmeacaEnum | null;
    readonly rolarTudo: () => void;
    readonly rolagensFeed: () => readonly RolagemResumoDto[];
  }

  const interno = (fixture: ReturnType<typeof montar>['fixture']): PainelInterno =>
    fixture.componentInstance as unknown as PainelInterno;

  /** Texto de um elemento sem quebras/espaços duplicados — o template quebra linhas ao formatar. */
  const texto = (elemento: Element | null | undefined): string =>
    (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();

  /** Um item de `app-coluna-acoes` (visão do mestre, ui-37) pelo rótulo. */
  const itemDaColuna = (raiz: HTMLElement, rotulo: string): HTMLButtonElement | undefined =>
    Array.from(
      raiz.querySelectorAll<HTMLButtonElement>('app-coluna-acoes .coluna-acoes__item'),
    ).find((item) => texto(item) === rotulo);

  /** Um botão da barra de condução do mestre pelo `aria-label` ou pelo texto. */
  const botaoDaConducao = (raiz: HTMLElement, rotulo: string): HTMLButtonElement | undefined =>
    Array.from(raiz.querySelectorAll<HTMLButtonElement>('app-conducao-turno button')).find(
      (botao) => botao.getAttribute('aria-label') === rotulo || texto(botao) === rotulo,
    );

  it('lê de quem é a vez da `ordemRodada`, sem recalcular a ordem', () => {
    const { fixture } = montar();
    // turnoIndice 2 → terceiro slot → segunda ocorrência da criatura.
    expect(interno(fixture).combatenteDaVez()?.nome).toBe('SCP-1471-A');
    expect(interno(fixture).totalDeTurnos()).toBe(4);
  });

  it('conta as ações restantes do combatente da vez a partir dos slots pendentes', () => {
    const { fixture } = montar();
    // A criatura está no seu último slot da rodada: resta 1 (o atual).
    expect(interno(fixture).acoesRestantesDaVez()).toBe(1);
  });

  it('marca como "já agiu" só quem não tem mais nenhum slot pendente', () => {
    const { fixture } = montar();
    const painel = interno(fixture);
    expect(painel.jaAgiu({ id: 2 })).toBe(true); // K. Amaral agiu no slot 1
    expect(painel.jaAgiu({ id: 1 })).toBe(false); // criatura está agindo agora
    expect(painel.jaAgiu({ id: 3 })).toBe(false); // V. Corvalho ainda vai agir
  });

  it('repete os cartões na ordem exata dos turnos da rodada', () => {
    const { fixture } = montar();
    const itens = interno(fixture)
      .combatentes()
      .map(({ nome, ocorrencia, totalOcorrencias, indiceOrdem }) => ({
        nome,
        ocorrencia,
        totalOcorrencias,
        indiceOrdem,
      }));
    expect(itens).toEqual([
      { nome: 'SCP-1471-A', ocorrencia: 1, totalOcorrencias: 2, indiceOrdem: 0 },
      { nome: 'K. Amaral', ocorrencia: 1, totalOcorrencias: 1, indiceOrdem: 1 },
      { nome: 'SCP-1471-A', ocorrencia: 2, totalOcorrencias: 2, indiceOrdem: 2 },
      { nome: 'V. Corvalho', ocorrencia: 1, totalOcorrencias: 1, indiceOrdem: 3 },
    ]);
  });

  it('trava a iniciativa das ocorrências adicionais e destaca somente o slot atual', () => {
    const { fixture } = montar();
    interno(fixture).modoEdicao.set(true);
    fixture.detectChanges();
    const elemento = fixture.nativeElement as HTMLElement;
    const cartoes = elemento.querySelectorAll('app-cartao-combatente');

    expect(cartoes).toHaveLength(4);
    expect(cartoes[0].textContent).toContain('Turno 1 de 2');
    expect(cartoes[2].textContent).toContain('Turno 2 de 2');
    expect(cartoes[0].querySelector('.combatente--ativo')).toBeNull();
    expect(cartoes[2].querySelector('.combatente--ativo')).not.toBeNull();
    expect(cartoes[0].querySelector('.combatente__iniciativa-campo')).not.toBeNull();
    expect(cartoes[2].querySelector('.combatente__iniciativa-campo')).toBeNull();
    expect(texto(elemento.querySelector('.iniciativa-mestre__secao-meta'))).toContain(
      '3 participantes',
    );
  });

  it('resolve o Nível de Ameaça do contexto já carregado, sem consulta extra', () => {
    const { fixture } = montar();
    const painel = interno(fixture);
    const [criatura, agente] = painel.combatentes() as unknown as {
      fichaId: number | null;
    }[];

    expect(painel.nivelAmeaca(criatura)).toBe(NivelAmeacaEnum.ALTA);
    expect(painel.nivelAmeaca(agente)).toBeNull();
  });

  it('mostra o histórico da campanha e acrescenta rolagens públicas recebidas ao vivo', () => {
    const { fixture, rolagemRegistrada$ } = montar();
    const elemento = fixture.nativeElement as HTMLElement;
    const rolagem: RolagemResumoDto = {
      id: 91,
      fichaId: 200,
      encontroCombatenteId: null,
      campanhaId: CAMPANHA_ID,
      usuarioId: USUARIO_JOGADOR,
      nomeAutor: 'Bia',
      nomeFicha: 'K. Amaral',
      rotulo: 'Iniciativa',
      formula: '1D20',
      visibilidade: RolagemVisibilidadeEnum.PUBLICA,
      resultado: { formula: '1D20', dados: [], total: 17 } as unknown as RolagemResumoDto['resultado'],
      createdDate: '2026-08-20T15:00:00.000Z',
      corFicha: null,
    };

    expect(elemento.querySelector('app-historico-rolagens-sidebar')).not.toBeNull();

    rolagemRegistrada$.next(rolagem);
    expect(interno(fixture).rolagensFeed()).toEqual([rolagem]);
  });

  it('abre o painel de rolagem livre a partir do cartão de um avulso', () => {
    const avulso = combatente(8, 'Capanga', {
      origem: CombatenteOrigemEnum.AVULSO,
      fichaId: null,
      tipoFicha: null,
      corFicha: '#d53030',
      energiaAtual: null,
      energiaMaxima: null,
    });
    const estado: EncontroRecuperadoDto = {
      ...encontroAtivo,
      combatentes: [avulso],
      ordemRodada: [{ combatenteId: 8, ocorrencia: 1 }],
    };
    const { fixture } = montar(estado);
    const elemento = fixture.nativeElement as HTMLElement;

    elemento.querySelector<HTMLButtonElement>('.combatente__rolar-avulso')?.click();
    fixture.detectChanges();

    expect(elemento.querySelector('[aria-label="Rolagens de Capanga"]')).not.toBeNull();
  });

  it('preserva a visibilidade escolhida para cada avulso ao fechar e reabrir o painel', () => {
    const avulso = combatente(8, 'Capanga', {
      origem: CombatenteOrigemEnum.AVULSO,
      fichaId: null,
      tipoFicha: null,
      energiaAtual: null,
      energiaMaxima: null,
    });
    const { fixture } = montar({
      ...encontroAtivo,
      combatentes: [avulso],
      ordemRodada: [{ combatenteId: 8, ocorrencia: 1 }],
    });
    const elemento = fixture.nativeElement as HTMLElement;
    const abrir = () => elemento.querySelector<HTMLButtonElement>('.combatente__rolar-avulso')?.click();

    abrir();
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('.rolagem-avulso__visibilidade')?.click();
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('.rolagem-avulso__confirmar-publica')?.click();
    fixture.detectChanges();
    elemento.querySelector<HTMLButtonElement>('[aria-label="Fechar rolagens"]')?.click();
    fixture.detectChanges();
    abrir();
    fixture.detectChanges();

    expect(elemento.querySelector('.rolagem-avulso__visibilidade')?.textContent).toContain('Rolagens Públicas');
  });

  it('`Rolar iniciativas` só manda quem está sem iniciativa, somando o bônus da criatura', () => {
    const semIniciativa: EncontroRecuperadoDto = {
      ...encontroAtivo,
      status: EncontroStatusEnum.MONTAGEM,
      ordemRodada: [],
      combatentes: [
        combatente(1, 'SCP-1471-A', {
          tipoFicha: TipoFichaEnum.CRIATURA,
          iniciativa: null,
          iniciativaBonus: 3,
          destreza: 5,
        }),
        combatente(2, 'K. Amaral', { iniciativa: 18 }),
      ],
    };
    const { fixture, encontroService } = montar(semIniciativa);
    interno(fixture).rolarTudo();

    expect(encontroService.rolarIniciativasFaltantes).toHaveBeenCalledTimes(1);
    const [, mapa] = encontroService.rolarIniciativasFaltantes.mock.calls[0] as unknown as [
      number,
      Record<number, number>,
    ];
    // Só a criatura entra; K. Amaral já tinha iniciativa e nunca é sobrescrito.
    expect(Object.keys(mapa)).toEqual(['1']);
    // 5D6 + 3 → mínimo 8, máximo 33 (o valor exato é aleatório; a faixa prova a fórmula).
    expect(mapa[1]).toBeGreaterThanOrEqual(8);
    expect(mapa[1]).toBeLessThanOrEqual(33);
  });

  it('m7-18: `Rolar tudo` soma o dado extra de Formação da Origem à Destreza do agente', () => {
    const semIniciativa: EncontroRecuperadoDto = {
      ...encontroAtivo,
      status: EncontroStatusEnum.MONTAGEM,
      ordemRodada: [],
      combatentes: [
        combatente(2, 'K. Amaral', {
          iniciativa: null,
          destreza: 4,
          dadoExtraIniciativa: 2,
          iniciativaBonus: 0,
        }),
      ],
    };
    const { fixture, encontroService } = montar(semIniciativa);
    interno(fixture).rolarTudo();

    const [, mapa] = encontroService.rolarIniciativasFaltantes.mock.calls[0] as unknown as [
      number,
      Record<number, number>,
    ];
    // (4 Destreza + 2 dado extra de Formação) 6D6 + 0 → mínimo 6, máximo 36.
    expect(mapa[2]).toBeGreaterThanOrEqual(6);
    expect(mapa[2]).toBeLessThanOrEqual(36);
  });

  it('m7-19: `Rolar tudo` usa a expressão customizada em vez da fórmula padrão, sem somar Formação', () => {
    const semIniciativa: EncontroRecuperadoDto = {
      ...encontroAtivo,
      status: EncontroStatusEnum.MONTAGEM,
      ordemRodada: [],
      combatentes: [
        combatente(1, 'SCP-1471-A', {
          iniciativa: null,
          destreza: 4,
          dadoExtraIniciativa: 2,
          iniciativaBonus: 3,
          iniciativaFormulaCustom: '1',
        }),
      ],
    };
    const { fixture, encontroService } = montar(semIniciativa);
    interno(fixture).rolarTudo();

    const [, mapa] = encontroService.rolarIniciativasFaltantes.mock.calls[0] as unknown as [
      number,
      Record<number, number>,
    ];
    // Fórmula fixa "1" — impossível pela fórmula padrão (6D6+3, mínimo 9) — prova que a
    // sobrescrita venceu e que o dado extra de Formação não entrou na conta.
    expect(mapa[1]).toBe(1);
  });

  describe('visão do jogador (m7-06)', () => {
    const montagem: EncontroRecuperadoDto = {
      ...encontroAtivo,
      status: EncontroStatusEnum.MONTAGEM,
      turnoIndice: 0,
      ordemRodada: [],
      combatentes: [
        combatente(1, 'SCP-1471-A', { tipoFicha: TipoFichaEnum.CRIATURA, iniciativa: null }),
        combatente(2, 'K. Amaral', { fichaId: 200, iniciativa: null }),
      ],
    };

    it('não dá controles do mestre nem avanço fora da própria vez', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_JOGADOR);
      const elemento = fixture.nativeElement as HTMLElement;
      const textos = Array.from(elemento.querySelectorAll('button')).map((botao) =>
        botao.textContent?.replace(/s+/g, ' ').trim(),
      );

      expect(textos).not.toContain('Avançar');
      expect(textos).not.toContain('Voltar');
      expect(textos).not.toContain('Encerrar');
      expect(textos).not.toContain('Rolar iniciativas');
      expect(textos).not.toContain('Selecionar combatentes');
      expect(textos).not.toContain('Adicionar avulso');
      // Nem a casca do mestre (ui-37): coluna de ações, trilha, condução e ficha resumida.
      expect(elemento.querySelector('.iniciativa-mestre')).toBeNull();
      expect(elemento.querySelector('app-coluna-acoes')).toBeNull();
      expect(elemento.querySelector('app-trilha-turnos')).toBeNull();
      expect(elemento.querySelector('app-conducao-turno')).toBeNull();
      expect(elemento.querySelector('app-resumo-combatente')).toBeNull();
      expect(elemento.querySelector('.painel__bloco--jogador')).toBeNull();
      // E nenhum stepper de vida/energia chega aos cartões.
      expect(elemento.querySelectorAll('.combatente__stepper').length).toBe(0);
      expect(elemento.querySelector('.iniciativa__papel')?.textContent?.trim()).toContain(
        'Espectador',
      );
    });

    it('mostra e executa o avanço somente quando chega a vez do próprio jogador', () => {
      const { fixture, encontroAlterado$, encontroService } = montar(
        encontroAtivo,
        USUARIO_JOGADOR,
      );
      const elemento = fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('.painel__bloco--jogador')).toBeNull();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();

      const botao = elemento.querySelector<HTMLButtonElement>('.painel__bloco--jogador button');
      expect(botao?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Avançar turno');

      botao?.click();
      expect(encontroService.avancarTurno).toHaveBeenCalledWith(encontroAtivo.id);
    });

    it('compacta a grade desktop dividida do jogador', () => {
      const jogador = montar(encontroAtivo, USUARIO_JOGADOR).fixture.nativeElement as HTMLElement;
      expect(jogador.querySelector('.grade')?.classList).toContain('grade--compacta');
    });

    it('mantém um acesso persistente à própria ficha na visão do jogador', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_JOGADOR, [], true);
      const elemento = fixture.nativeElement as HTMLElement;
      const gatilho = elemento.querySelector<HTMLButtonElement>('.iniciativa__minha-ficha');

      expect(gatilho?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Minha ficha');
      const modal = elemento.querySelector<HTMLDialogElement>("[role=\"dialog\"]");
      expect(modal).not.toBeNull();
      expect(modal?.open).toBe(false);

      gatilho?.click();
      fixture.detectChanges();

      expect(elemento.querySelector('[role="dialog"]')).not.toBeNull();
    });

    it('dá ao mestre a grade do palco (compacta, de colunas automáticas), nunca a do jogador', () => {
      const mestre = montar(encontroAtivo, USUARIO_MESTRE).fixture.nativeElement as HTMLElement;
      const grade = mestre.querySelector<HTMLElement>('.grade');

      expect(grade?.classList).toContain('grade--compacta');
      expect(grade?.classList).toContain('grade--palco');
      // Sem `--grade-colunas`: o número de colunas vem do CSS (`auto-fill`), não de `colunasGrade()`.
      expect(grade?.style.getPropertyValue('--grade-colunas')).toBe('');
    });

    it('não duplica a própria iniciativa fora do cartão do combatente', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_JOGADOR);
      const elemento = fixture.nativeElement as HTMLElement;

      expect(elemento.textContent).not.toContain('Sua iniciativa');
      const meuCartao = Array.from(elemento.querySelectorAll('.combatente')).find((cartao) =>
        cartao.textContent?.includes('K. Amaral'),
      );
      expect(meuCartao?.querySelector('.combatente__iniciativa-valor')?.textContent?.trim()).toBe('18');
    });

    it('o mestre continua com a barra de condução inteira', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_MESTRE);
      const elemento = fixture.nativeElement as HTMLElement;

      expect(botaoDaConducao(elemento, 'Voltar ao turno anterior')).toBeDefined();
      expect(botaoDaConducao(elemento, 'Passar ao próximo turno')).toBeDefined();
      expect(botaoDaConducao(elemento, 'Encerrar')).toBeDefined();
      expect(elemento.querySelector('.iniciativa__papel')).toBeNull();
    });

    it('o jogador rola a **própria** iniciativa pelo preset da ficha dele', () => {
      const { fixture, encontroService } = montar(montagem, USUARIO_JOGADOR);
      const painel = fixture.componentInstance as unknown as {
        possoRolarIniciativa: () => boolean;
        meuCombatente: () => { id: number } | null;
        rolarMinhaIniciativa: () => void;
      };

      // A ficha 200 é da Bia (USUARIO_JOGADOR) — só o combatente dela entra em jogo.
      expect(painel.meuCombatente()?.id).toBe(2);
      expect(painel.possoRolarIniciativa()).toBe(true);

      painel.rolarMinhaIniciativa();

      expect(encontroService.atribuirIniciativa).toHaveBeenCalledTimes(1);
      const [dto] = encontroService.atribuirIniciativa.mock.calls[0] as unknown as [
        { id: number; iniciativa: number },
      ];
      expect(dto.id).toBe(2);
      // Preset "Iniciativa" = DESd6 com Destreza 4 → 4d6, entre 4 e 24.
      expect(dto.iniciativa).toBeGreaterThanOrEqual(4);
      expect(dto.iniciativa).toBeLessThanOrEqual(24);
    });

    it('m7-19: a expressão customizada do próprio combatente sobrescreve o preset da ficha', () => {
      const comFormulaCustom: EncontroRecuperadoDto = {
        ...montagem,
        combatentes: [
          montagem.combatentes[0],
          { ...montagem.combatentes[1], iniciativaFormulaCustom: '1' },
        ],
      };
      const { fixture, encontroService, fichaService } = montar(comFormulaCustom, USUARIO_JOGADOR);
      const painel = fixture.componentInstance as unknown as { rolarMinhaIniciativa: () => void };
      // A ficha lateral do jogador (m3-77) já busca a própria ficha ao montar a tela — a chamada
      // que importa aqui é a que `rolarMinhaIniciativa` faria por conta própria, então a prova é
      // "não ganhou uma chamada a mais", não "nunca foi chamada".
      const chamadasAntes = fichaService.recuperarFicha.mock.calls.length;

      painel.rolarMinhaIniciativa();

      // Fórmula fixa "1" — impossível pelo preset padrão (DESd6 com Destreza 4, mínimo 4) —, prova
      // que a sobrescrita venceu sem buscar a ficha de novo.
      expect(fichaService.recuperarFicha.mock.calls.length).toBe(chamadasAntes);
      expect(encontroService.atribuirIniciativa).toHaveBeenCalledWith({ id: 2, iniciativa: 1 });
    });

    it('o mestre nunca entra no fluxo de "rolar a própria"', () => {
      const { fixture } = montar(montagem, USUARIO_MESTRE);
      const painel = fixture.componentInstance as unknown as {
        possoRolarIniciativa: () => boolean;
      };
      expect(painel.possoRolarIniciativa()).toBe(false);
    });

    it('acende o chamado do mestre na tela do jogador', () => {
      const { fixture, encontroIniciativaPedido$ } = montar(montagem, USUARIO_JOGADOR);
      encontroIniciativaPedido$.next({ id: 1, campanhaId: CAMPANHA_ID });
      const painel = fixture.componentInstance as unknown as { iniciativaPedida: () => boolean };
      expect(painel.iniciativaPedida()).toBe(true);
    });

    it('o chamado não ricocheteia no próprio mestre que o disparou', () => {
      const { fixture, encontroIniciativaPedido$ } = montar(montagem, USUARIO_MESTRE);
      encontroIniciativaPedido$.next({ id: 1, campanhaId: CAMPANHA_ID });
      const painel = fixture.componentInstance as unknown as { iniciativaPedida: () => boolean };
      expect(painel.iniciativaPedida()).toBe(false);
    });

    it('mantém para o jogador quem age agora, com destaque próprio quando chega a sua vez', () => {
      const { fixture, encontroAlterado$ } = montar(encontroAtivo, USUARIO_JOGADOR);
      const elemento = fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('.painel__bloco--vez')?.textContent).toContain('Age agora');
      expect(elemento.querySelector('.painel__bloco--vez')?.textContent).toContain('SCP-1471-A');

      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();

      expect(elemento.querySelector('.painel__bloco--vez')?.textContent).toContain('Sua vez');
      expect(elemento.querySelector('.painel__bloco--vez')?.textContent).toContain('K. Amaral');
    });

    it('mostra ao mestre quem age agora na barra de condução, não na caixinha do jogador', () => {
      const doMestre = montar(encontroAtivo, USUARIO_MESTRE).fixture.nativeElement as HTMLElement;
      const conducao = texto(doMestre.querySelector('app-conducao-turno'));

      expect(conducao).toContain('Age agora');
      expect(conducao).toContain('SCP-1471-A');
      expect(doMestre.querySelector('.painel__bloco--vez')).toBeNull();
    });

    it('avisa o jogador com uma notificação quando chega a vez do combatente dele', () => {
      const { fixture, encontroAlterado$ } = montar(encontroAtivo, USUARIO_JOGADOR);
      const notificarEspiao = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar').mockClear();

      // Slot 1 da `ordemRodada` de `encontroAtivo` é o combatenteId 2 — K. Amaral, ficha da Bia.
      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();

      expect(notificarEspiao).toHaveBeenCalledWith(
        expect.objectContaining({ severidade: 'informacao', resumo: 'Sua vez!' }),
      );
    });

    it('não repete a notificação de "sua vez" a cada broadcast — só quando o slot muda de fato', () => {
      const { fixture, encontroAlterado$ } = montar(encontroAtivo, USUARIO_JOGADOR);
      const notificarEspiao = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar').mockClear();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();
      expect(notificarEspiao).toHaveBeenCalledTimes(1);

      // Outro broadcast qualquer, mesmo slot (ex.: alguém tomou dano) — não deve reavisar.
      encontroAlterado$.next({
        encontro: { ...encontroAtivo, turnoIndice: 1, nome: 'Contenção no Setor 12 (dano)' },
      });
      fixture.detectChanges();
      expect(notificarEspiao).toHaveBeenCalledTimes(1);
    });

    it('não avisa o mestre quando chega a vez de alguém', () => {
      const { fixture, encontroAlterado$ } = montar(encontroAtivo, USUARIO_MESTRE);
      const notificarEspiao = vi.spyOn(TestBed.inject(NotificacaoService), 'notificar').mockClear();

      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();

      expect(notificarEspiao).not.toHaveBeenCalledWith(
        expect.objectContaining({ resumo: 'Sua vez!' }),
      );
    });
  });

  it('absorve o broadcast `encontro:alterado` da própria campanha', () => {
    const { fixture, encontroAlterado$ } = montar();
    encontroAlterado$.next({
      encontro: { ...encontroAtivo, nome: 'Outro nome', rodadaAtual: 7 },
    });
    fixture.detectChanges();
    expect(interno(fixture).encontro()?.rodadaAtual).toBe(7);
  });

  it('ignora o broadcast de outra campanha', () => {
    const { fixture, encontroAlterado$ } = montar();
    encontroAlterado$.next({
      encontro: { ...encontroAtivo, campanhaId: 999, rodadaAtual: 42 },
    });
    fixture.detectChanges();
    expect(interno(fixture).encontro()?.rodadaAtual).toBe(2);
  });

  describe('seletor de combatentes e avulso', () => {
    /**
     * O seletor de combatentes (cartões sumarizados de agente/criatura) substituiu o antigo
     * `<select>` de "Ficha da campanha": clicar num cartão alterna a presença da ficha no
     * encontro, e o avulso ganhou o próprio botão/form, sem ficha nenhuma para escolher.
     */
    it('abre o seletor com as fichas da campanha e o avulso fica fechado', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('app-seletor-combatentes')).toBeNull();
      expect(elemento.querySelector('.adicionar')).toBeNull();

      itemDaColuna(elemento, 'Selecionar combatentes')?.click();
      fixture.detectChanges();

      expect(elemento.querySelector('app-seletor-combatentes')).not.toBeNull();
      expect(elemento.querySelector('.adicionar')).toBeNull();
      // "Agentes" vem antes de "Criaturas" (ordem das linhas do seletor): o primeiro cartão é o
      // "Novo Recruta" fora do encontro, o segundo é SCP-1471-A (fichaId 100), já em campo.
      const cartoes = elemento.querySelectorAll('.seletor__cartao');
      expect(cartoes[0].classList).not.toContain('seletor__cartao--marcado');
      expect(cartoes[1].classList).toContain('seletor__cartao--marcado');
    });

    it('clicar num cartão fora do encontro adiciona a ficha', () => {
      const { fixture, encontroService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      itemDaColuna(elemento, 'Selecionar combatentes')?.click();
      fixture.detectChanges();

      // "Novo Recruta" (fichaId 999) é o único ainda fora do encontro.
      const naoMarcado = Array.from(
        elemento.querySelectorAll<HTMLButtonElement>('.seletor__cartao'),
      ).find((botao) => !botao.classList.contains('seletor__cartao--marcado'));
      naoMarcado?.click();
      fixture.detectChanges();

      expect(encontroService.adicionarCombatente).toHaveBeenCalledWith(1, {
        fichaId: 999,
        nomeAvulso: null,
        vidaMaximaAvulso: null,
        cadencia: null,
      });
    });

    it('clicar num cartão já marcado remove o combatente correspondente', () => {
      const { fixture, encontroService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      itemDaColuna(elemento, 'Selecionar combatentes')?.click();
      fixture.detectChanges();

      elemento.querySelector<HTMLButtonElement>('.seletor__cartao--marcado')?.click();
      fixture.detectChanges();

      // combatente(1, 'SCP-1471-A', ...) é quem carrega o `fichaId` 100 em `encontroAtivo`.
      expect(encontroService.removerCombatente).toHaveBeenCalledWith(1);
    });

    it('remover pelo ícone do cartão (modo edição) pede confirmação (ui-15); cancelar não remove', async () => {
      const { fixture, encontroService } = montar();
      const confirmar = vi
        .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
        .mockResolvedValue(false);
      interno(fixture).modoEdicao.set(true);
      fixture.detectChanges();
      const elemento = fixture.nativeElement as HTMLElement;

      elemento.querySelector<HTMLButtonElement>('.combatente__remover')?.click();
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Remover combatente' }));
      expect(encontroService.removerCombatente).not.toHaveBeenCalled();
    });

    it('remover pelo ícone do cartão (modo edição): confirmar (ui-15) remove o combatente', async () => {
      const { fixture, encontroService } = montar();
      vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(true);
      interno(fixture).modoEdicao.set(true);
      fixture.detectChanges();
      const elemento = fixture.nativeElement as HTMLElement;

      elemento.querySelector<HTMLButtonElement>('.combatente__remover')?.click();
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(encontroService.removerCombatente).toHaveBeenCalled();
    });

    it('abre o formulário de avulso separado do seletor, e adiciona o avulso digitado', () => {
      const { fixture, encontroService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      itemDaColuna(elemento, 'Adicionar avulso')?.click();
      fixture.detectChanges();

      expect(elemento.querySelector('app-seletor-combatentes')).toBeNull();
      const form = elemento.querySelector('form.adicionar') as HTMLFormElement;
      expect(form).not.toBeNull();
      expect(form.querySelector('input[formControlName="corAvulso"]')).not.toBeNull();
      expect(form.querySelector('input[type="file"]')?.getAttribute('accept')).toBe(
        'image/jpeg,image/png,image/webp',
      );

      const nome = form.querySelector<HTMLInputElement>('input[formControlName="nomeAvulso"]')!;
      nome.value = 'Sujeito Contido';
      nome.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      form.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(encontroService.adicionarCombatente).toHaveBeenCalledWith(1, {
        fichaId: null,
        nomeAvulso: 'Sujeito Contido',
        vidaMaximaAvulso: 10,
        cadencia: CadenciaEnum.SINGULAR,
        corAvulso: '#d53030',
      });
    });

    it('solicita e envia os turnos do avulso com Cadência Frenética', () => {
      const { fixture, encontroService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      itemDaColuna(elemento, 'Adicionar avulso')?.click();
      fixture.detectChanges();

      const form = elemento.querySelector('form.adicionar') as HTMLFormElement;
      const nome = form.querySelector<HTMLInputElement>('input[formControlName="nomeAvulso"]')!;
      nome.value = 'Sujeito Frenético';
      nome.dispatchEvent(new Event('input'));
      const cadencia = form.querySelector<HTMLSelectElement>('select[formControlName="cadencia"]')!;
      cadencia.value = CadenciaEnum.FRENETICA;
      cadencia.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      const turnos = form.querySelector<HTMLInputElement>('input[formControlName="turnosPorRodada"]');
      expect(turnos).not.toBeNull();
      turnos!.value = '6';
      turnos!.dispatchEvent(new Event('input'));
      form.dispatchEvent(new Event('submit'));

      expect(encontroService.adicionarCombatente).toHaveBeenCalledWith(1, {
        fichaId: null,
        nomeAvulso: 'Sujeito Frenético',
        vidaMaximaAvulso: 10,
        cadencia: CadenciaEnum.FRENETICA,
        turnosPorRodada: 6,
        corAvulso: '#d53030',
      });
    });

    it('não envia o avulso sem nome', () => {
      const { fixture, encontroService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      itemDaColuna(elemento, 'Adicionar avulso')?.click();
      fixture.detectChanges();

      const botaoSubmeter = elemento.querySelector<HTMLButtonElement>('.adicionar__acao')!;
      expect(botaoSubmeter.disabled).toBe(true);

      elemento.querySelector('form.adicionar')?.dispatchEvent(new Event('submit'));
      expect(encontroService.adicionarCombatente).not.toHaveBeenCalled();
    });

    it('marca "Selecionar combatentes" como pressionado enquanto o seletor está aberto', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const item = itemDaColuna(elemento, 'Selecionar combatentes')!;

      expect(item.getAttribute('aria-pressed')).toBe('false');
      expect(item.classList).not.toContain('coluna-acoes__item--ativo');

      item.click();
      fixture.detectChanges();

      expect(texto(item)).toBe('Selecionar combatentes');
      expect(item.getAttribute('aria-pressed')).toBe('true');
      expect(item.classList).toContain('coluna-acoes__item--ativo');
    });

    it('marca "Adicionar avulso" como pressionado enquanto o formulário está aberto, e "Cancelar" limpa e fecha', () => {
      const { fixture, encontroService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const item = itemDaColuna(elemento, 'Adicionar avulso')!;

      item.click();
      fixture.detectChanges();

      expect(item.getAttribute('aria-pressed')).toBe('true');
      expect(item.classList).toContain('coluna-acoes__item--ativo');

      const nome = elemento.querySelector<HTMLInputElement>('input[formControlName="nomeAvulso"]')!;
      nome.value = 'Sujeito Contido';
      nome.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const botaoCancelar = Array.from(
        elemento.querySelectorAll<HTMLButtonElement>('form.adicionar .adicionar__acao'),
      ).find((botao) => texto(botao) === 'Cancelar')!;
      botaoCancelar.click();
      fixture.detectChanges();

      expect(elemento.querySelector('form.adicionar')).toBeNull();
      expect(item.getAttribute('aria-pressed')).toBe('false');
      expect(item.classList).not.toContain('coluna-acoes__item--ativo');
      expect(encontroService.adicionarCombatente).not.toHaveBeenCalled();

      // Reabrir prova que o formulário voltou limpo.
      item.click();
      fixture.detectChanges();
      expect(
        elemento.querySelector<HTMLInputElement>('input[formControlName="nomeAvulso"]')?.value,
      ).toBe('');
    });
  });

  describe('montagem: pedir iniciativa, rolar e iniciar combate (m7-08+)', () => {
    const montagem: EncontroRecuperadoDto = {
      ...encontroAtivo,
      status: EncontroStatusEnum.MONTAGEM,
      ordemRodada: [],
    };
    const semIniciativa: EncontroRecuperadoDto = {
      ...montagem,
      combatentes: [
        combatente(1, 'SCP-1471-A', { tipoFicha: TipoFichaEnum.CRIATURA, iniciativa: null }),
        combatente(2, 'K. Amaral', { iniciativa: 18 }),
      ],
    };

    /** Em montagem ninguém age: a barra de condução vira as três ações de montar a ordem (ui-37). */
    it('reúne "Pedir iniciativa", "Rolar iniciativas" e "Iniciar combate" na barra de condução', () => {
      const elemento = montar(montagem).fixture.nativeElement as HTMLElement;
      const acoes = Array.from(
        elemento.querySelectorAll('app-conducao-turno .conducao__acoes button'),
      ).map((botao) => texto(botao));

      expect(acoes).toEqual(['Pedir iniciativa', 'Rolar iniciativas', 'Iniciar combate']);
      expect(botaoDaConducao(elemento, 'Pedir iniciativa')?.classList).toContain('botao--positivo');
      expect(texto(elemento.querySelector('app-conducao-turno'))).toContain(
        'Combate ainda não iniciado',
      );
      // Voltar/avançar/encerrar só existem com o combate em curso.
      expect(botaoDaConducao(elemento, 'Passar ao próximo turno')).toBeUndefined();
      expect(botaoDaConducao(elemento, 'Encerrar')).toBeUndefined();
    });

    it('chama os jogadores a rolar a própria iniciativa', () => {
      const { fixture, encontroService } = montar(montagem);

      botaoDaConducao(fixture.nativeElement as HTMLElement, 'Pedir iniciativa')?.click();

      expect(encontroService.pedirIniciativa).toHaveBeenCalledWith(montagem.id);
    });

    it('libera "Iniciar combate" com todo mundo com iniciativa e bloqueia "Rolar iniciativas"', () => {
      const { fixture, encontroService } = montar(montagem);
      const elemento = fixture.nativeElement as HTMLElement;

      expect(botaoDaConducao(elemento, 'Rolar iniciativas')?.disabled).toBe(true);
      const iniciar = botaoDaConducao(elemento, 'Iniciar combate')!;
      expect(iniciar.disabled).toBe(false);

      iniciar.click();
      expect(encontroService.iniciarEncontro).toHaveBeenCalledWith(montagem.id);
    });

    it('bloqueia "Iniciar combate" enquanto falta iniciativa e libera "Rolar iniciativas"', () => {
      const { fixture, encontroService } = montar(semIniciativa);
      const elemento = fixture.nativeElement as HTMLElement;

      const iniciar = botaoDaConducao(elemento, 'Iniciar combate')!;
      expect(iniciar.disabled).toBe(true);
      expect(botaoDaConducao(elemento, 'Rolar iniciativas')?.disabled).toBe(false);

      iniciar.click();
      expect(encontroService.iniciarEncontro).not.toHaveBeenCalled();
    });
  });

  describe('combate: condução na barra da vez e "Encerrar combate" na coluna de ações', () => {
    it('põe "Encerrar" ao lado de Voltar/Avançar e repete a ação na coluna de ações', () => {
      const elemento = montar(encontroAtivo).fixture.nativeElement as HTMLElement;

      expect(botaoDaConducao(elemento, 'Encerrar')).toBeDefined();
      expect(itemDaColuna(elemento, 'Encerrar combate')).toBeDefined();
    });

    it('avança e volta o turno pelos botões da barra', () => {
      const { fixture, encontroService } = montar(encontroAtivo);
      const elemento = fixture.nativeElement as HTMLElement;

      botaoDaConducao(elemento, 'Passar ao próximo turno')?.click();
      botaoDaConducao(elemento, 'Voltar ao turno anterior')?.click();

      expect(encontroService.avancarTurno).toHaveBeenCalledWith(encontroAtivo.id);
      expect(encontroService.voltarTurno).toHaveBeenCalledWith(encontroAtivo.id);
    });

    it('pede confirmação (ui-15) antes de encerrar; cancelar não chama encerrarEncontro', async () => {
      const { fixture, encontroService } = montar(encontroAtivo);
      const confirmar = vi
        .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
        .mockResolvedValue(false);
      const elemento = fixture.nativeElement as HTMLElement;

      botaoDaConducao(elemento, 'Encerrar')?.click();
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Encerrar combate' }));
      expect(encontroService.encerrarEncontro).not.toHaveBeenCalled();
    });

    it('confirmar (ui-15) chama encerrarEncontro', async () => {
      const { fixture, encontroService } = montar(encontroAtivo);
      vi.spyOn(TestBed.inject(ConfirmacaoService), 'confirmar').mockResolvedValue(true);
      const elemento = fixture.nativeElement as HTMLElement;

      botaoDaConducao(elemento, 'Encerrar')?.click();
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(encontroService.encerrarEncontro).toHaveBeenCalledWith(encontroAtivo.id);
    });

    it('a coluna de ações encerra com a mesma confirmação', async () => {
      const { fixture, encontroService } = montar(encontroAtivo);
      const confirmar = vi
        .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
        .mockResolvedValue(true);
      const elemento = fixture.nativeElement as HTMLElement;

      itemDaColuna(elemento, 'Encerrar combate')?.click();
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(confirmar).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Encerrar combate' }));
      expect(encontroService.encerrarEncontro).toHaveBeenCalledWith(encontroAtivo.id);
    });

    it('nunca mostra "Rolar iniciativas" depois que o combate começou', () => {
      const elemento = montar(encontroAtivo).fixture.nativeElement as HTMLElement;
      const textos = Array.from(elemento.querySelectorAll('button')).map((botao) => texto(botao));
      expect(textos).not.toContain('Rolar iniciativas');
    });
  });

  describe('histórico: só o mestre vê "Encontros anteriores"', () => {
    const encerrado: EncontroResumoDto = {
      id: 2,
      campanhaId: CAMPANHA_ID,
      nome: 'Emboscada no Setor 4',
      status: EncontroStatusEnum.ENCERRADO,
      rodadaAtual: 5,
      quantidadeCombatentes: 3,
      createdDate: '2026-08-10T12:00:00.000Z', // meio-dia UTC: a mesma data em qualquer fuso
    };

    /** Abre o menu do histórico pelo gatilho "N encerrados" do cabeçalho. */
    const abrirMenu = (raiz: HTMLElement, fixture: ReturnType<typeof montar>['fixture']) => {
      const gatilho = Array.from(
        raiz.querySelectorAll<HTMLButtonElement>('.iniciativa-mestre__cabecalho button'),
      ).find((botao) => botao.textContent?.includes('encerrado'))!;
      gatilho.click();
      fixture.detectChanges();
      return gatilho;
    };

    it('mostra o link "N encerrados" no cabeçalho pro mestre, e abre o menu do histórico', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_MESTRE, [encerrado]);
      const elemento = fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('.historico__menu')).toBeNull();

      const gatilho = abrirMenu(elemento, fixture);

      expect(gatilho.getAttribute('aria-expanded')).toBe('true');
      expect(texto(elemento.querySelector('.historico__legenda'))).toBe('Combates encerrados');
      expect(elemento.querySelector('.historico__nome')?.textContent?.trim()).toBe(
        'Emboscada no Setor 4',
      );
      // Data, rodadas e combatentes na mesma linha de meta.
      expect(texto(elemento.querySelector('.historico__meta'))).toBe(
        '10/08/2026 · 5 rodadas · 3 combatentes',
      );
    });

    it('escolher um combate do menu abre o registro dele e fecha o menu', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_MESTRE, [encerrado]);
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const elemento = fixture.nativeElement as HTMLElement;
      abrirMenu(elemento, fixture);

      elemento.querySelector<HTMLButtonElement>('.historico__item')!.click();
      fixture.detectChanges();

      expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID, 'iniciativa', encerrado.id]);
      expect(elemento.querySelector('.historico__menu')).toBeNull();
    });

    it('Escape fecha o menu e devolve o foco ao gatilho; clicar de novo no gatilho também fecha', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_MESTRE, [encerrado]);
      const elemento = fixture.nativeElement as HTMLElement;
      const gatilho = abrirMenu(elemento, fixture);

      // Escape no documento (foco em qualquer lugar): o listener vive no `host` da página.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(elemento.querySelector('.historico__menu')).toBeNull();
      expect(document.activeElement).toBe(gatilho);

      gatilho.click();
      fixture.detectChanges();
      expect(elemento.querySelector('.historico__menu')).not.toBeNull();
      gatilho.click();
      fixture.detectChanges();
      expect(elemento.querySelector('.historico__menu')).toBeNull();
    });

    it('nunca mostra o link de "Encontros anteriores" pro jogador, mesmo havendo histórico', () => {
      const elemento = montar(encontroAtivo, USUARIO_JOGADOR, [encerrado]).fixture
        .nativeElement as HTMLElement;
      expect(elemento.querySelector('.iniciativa__historico')).toBeNull();
      expect(elemento.querySelector('.historico__menu')).toBeNull();
      expect(elemento.querySelector('.historico__card')).toBeNull();
    });
  });

  describe('recorte mobile (m7-08) — leitura do jogador', () => {
    /**
     * O que estes testes provam é a **estrutura** que o CSS usa para decidir o recorte: a classe do
     * bloco redundante e o contador condensado. A largura em si é verificada na aplicação real
     * (skill `verify`, 360×800) — jsdom não aplica media query. A gaveta de ações e a barra fixa de
     * condução do mestre saíram na ui-37: a coluna de ações vira a barra inferior por conta própria.
     */
    const emMontagem: EncontroRecuperadoDto = {
      ...encontroAtivo,
      status: EncontroStatusEnum.MONTAGEM,
      turnoIndice: 0,
      ordemRodada: [],
    };

    it('carrega o contador condensado `R · T` ao lado da contagem de participantes', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_JOGADOR);
      const elemento = fixture.nativeElement as HTMLElement;
      // Rodada 2, 3º dos 4 slots da ordem intercalada.
      expect(texto(elemento.querySelector('.iniciativa__meta--compacta'))).toBe('R2 · T3/4');
      expect(
        elemento.querySelector('.iniciativa__meta:not(.iniciativa__meta--compacta)')?.textContent,
      ).toContain('participantes');
    });

    it('marca como redundante no mobile o bloco de contadores durante o combate', () => {
      const emCombate = montar(encontroAtivo, USUARIO_JOGADOR).fixture
        .nativeElement as HTMLElement;
      expect(
        emCombate.querySelector('.painel__bloco--contadores')?.classList,
      ).toContain('painel__bloco--redundante-mobile');
    });

    it('mantém o bloco de contadores no mobile em montagem, onde ele carrega a "Situação"', () => {
      // O cabeçalho compacto só mostra `R · T`, que em montagem ainda não existe.
      const elemento = montar(emMontagem, USUARIO_JOGADOR).fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('.iniciativa__meta--compacta')).toBeNull();
      expect(
        elemento.querySelector('.painel__bloco--contadores')?.classList,
      ).not.toContain('painel__bloco--redundante-mobile');
    });

    it('não dá coluna de ações nem barra de condução ao jogador', () => {
      const elemento = montar(encontroAtivo, USUARIO_JOGADOR).fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('app-coluna-acoes')).toBeNull();
      expect(elemento.querySelector('app-conducao-turno')).toBeNull();
    });
  });

  describe('visão do mestre (ui-37)', () => {
    describe('carregamento', () => {
      /** `carregandoEncontro` é privado; o teste só precisa reacender o estado de carga. */
      const carregar = (fixture: ReturnType<typeof montar>['fixture']) => {
        (
          fixture.componentInstance as unknown as { carregandoEncontro: { set(v: boolean): void } }
        ).carregandoEncontro.set(true);
        fixture.detectChanges();
      };

      it('mostra a silhueta da casca do mestre, sem cair no estado vazio nem na tela de jogador', () => {
        const { fixture } = montar();
        carregar(fixture);
        const elemento = fixture.nativeElement as HTMLElement;

        const conteudo = elemento.querySelector('.iniciativa-mestre__conteudo');
        expect(conteudo?.getAttribute('role')).toBe('status');
        expect(conteudo?.getAttribute('aria-label')).toBe('Carregando o combate');
        expect(elemento.querySelector('app-coluna-acoes')).not.toBeNull();
        expect(elemento.querySelectorAll('app-coluna-acoes app-esqueleto').length).toBeGreaterThan(0);
        expect(elemento.querySelectorAll('.grade app-esqueleto').length).toBeGreaterThan(0);
        expect(elemento.querySelector('.iniciativa-mestre__vazio')).toBeNull();
        expect(elemento.querySelector('app-trilha-turnos')).toBeNull();
        expect(elemento.querySelector('.iniciativa-tela')).toBeNull();
      });

      it('para quem já se sabe jogador, segue a tela de leitura de sempre', () => {
        const { fixture } = montar(encontroAtivo, USUARIO_JOGADOR);
        carregar(fixture);
        const elemento = fixture.nativeElement as HTMLElement;

        expect(elemento.querySelector('.iniciativa-mestre')).toBeNull();
        expect(texto(elemento.querySelector('.iniciativa__carregando'))).toBe(
          'Carregando o combate…',
        );
      });
    });

    it('monta a casca: coluna de ações, trilha, rolagens fixa, condução, ficha resumida e grade', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('.iniciativa-tela')).toBeNull();
      expect(elemento.querySelector('app-coluna-acoes')).not.toBeNull();
      expect(elemento.querySelector('app-trilha-turnos')).not.toBeNull();
      expect(elemento.querySelector('app-conducao-turno')).not.toBeNull();
      expect(elemento.querySelector('app-resumo-combatente')).not.toBeNull();
      expect(elemento.querySelectorAll('app-cartao-combatente')).toHaveLength(4);
      // As rolagens são uma coluna da página, não o painel sobreposto com gatilho.
      expect(elemento.querySelector('.historico-rolagens__painel--fixo')).not.toBeNull();
      expect(elemento.querySelector('.historico-rolagens__gatilho')).toBeNull();
    });

    it('marca Calculadora e Caderno como pressionados enquanto as janelas estão abertas', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;

      for (const rotulo of ['Calculadora', 'Caderno']) {
        const item = itemDaColuna(elemento, rotulo)!;
        expect(item.getAttribute('aria-pressed')).toBe('false');

        item.click();
        fixture.detectChanges();
        expect(item.getAttribute('aria-pressed')).toBe('true');
        expect(item.classList).toContain('coluna-acoes__item--ativo');
      }
    });

    it('descreve o encontro no cabeçalho: título, campanha e estado', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;

      expect(texto(elemento.querySelector('.iniciativa-mestre__titulo'))).toBe(
        'Iniciativa · Contenção no Setor 12',
      );
      expect(texto(elemento.querySelector('.iniciativa-mestre__campanha'))).toBe(
        'Campanha de Teste',
      );
      expect(texto(elemento.querySelector('.iniciativa-mestre__cabecalho app-chip'))).toBe(
        'Em combate',
      );
    });

    it('reúne na coluna de ações o que é do Combate e o que é Ferramenta', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;
      const rotulos = Array.from(
        elemento.querySelectorAll('app-coluna-acoes .coluna-acoes__item'),
      ).map((item) => texto(item));

      expect(rotulos).toEqual([
        'Selecionar combatentes',
        'Adicionar avulso',
        'Editar combatentes',
        'Encerrar combate',
        'Calculadora',
        'Caderno',
      ]);
      const categorias = Array.from(
        elemento.querySelectorAll('app-coluna-acoes .coluna-acoes__categoria'),
      ).map((categoria) => texto(categoria));
      expect(categorias).toEqual(['Combate', 'Ferramentas']);
    });

    it('a ficha resumida é a de quem age agora, com o nível de Ameaça e a Cadência', () => {
      const elemento = montar().fixture.nativeElement as HTMLElement;
      const resumo = elemento.querySelector('app-resumo-combatente');

      expect(texto(resumo?.querySelector('.resumo__nome'))).toBe('SCP-1471-A');
      const chips = Array.from(resumo?.querySelectorAll('app-chip') ?? []).map((chip) => texto(chip));
      expect(chips).toEqual(['Ameaça · Alta', 'Cadência 2']);
    });

    it('a ficha resumida acompanha a troca de turno', () => {
      const { fixture, encontroAlterado$ } = montar();
      const elemento = fixture.nativeElement as HTMLElement;

      encontroAlterado$.next({ encontro: { ...encontroAtivo, turnoIndice: 1 } });
      fixture.detectChanges();

      expect(texto(elemento.querySelector('.resumo__nome'))).toBe('K. Amaral');
      expect(texto(elemento.querySelector('app-trilha-turnos .trilha__item--ativa'))).toContain(
        'K. Amaral',
      );
    });

    it('alterna o modo Editar pela coluna de ações', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const editar = itemDaColuna(elemento, 'Editar combatentes')!;

      expect(elemento.querySelector('.combatente__iniciativa-campo')).toBeNull();
      expect(editar.getAttribute('aria-pressed')).toBe('false');

      editar.click();
      fixture.detectChanges();

      expect(editar.getAttribute('aria-pressed')).toBe('true');
      expect(elemento.querySelector('.combatente__iniciativa-campo')).not.toBeNull();
    });

    it('em montagem, não há ficha resumida nem estado vazio e a trilha mostra a situação', () => {
      const emMontagem: EncontroRecuperadoDto = {
        ...encontroAtivo,
        status: EncontroStatusEnum.MONTAGEM,
        turnoIndice: 0,
        ordemRodada: [],
      };
      const elemento = montar(emMontagem).fixture.nativeElement as HTMLElement;

      expect(elemento.querySelector('app-resumo-combatente')).toBeNull();
      expect(elemento.querySelector('.iniciativa-mestre__resumo')).toBeNull();
      expect(elemento.textContent).not.toContain('Ninguém age ainda.');
      expect(elemento.querySelector('.iniciativa-mestre__todos app-cartao-combatente')).not.toBeNull();
      expect(texto(elemento.querySelector('app-trilha-turnos .trilha__contadores'))).toContain(
        'Montagem',
      );
    });

    it('encerrado: só leitura — sem ações de combate na coluna nem na condução', () => {
      const encerrado: EncontroRecuperadoDto = {
        ...encontroAtivo,
        status: EncontroStatusEnum.ENCERRADO,
      };
      // Um encerrado só chega à tela pela rota do histórico ou pelo broadcast — a tela do combate
      // corrente nunca o escolhe sozinha —, então o teste o entrega pelo broadcast.
      const { fixture, encontroAlterado$ } = montar();
      encontroAlterado$.next({ encontro: encerrado });
      fixture.detectChanges();
      const elemento = fixture.nativeElement as HTMLElement;

      expect(itemDaColuna(elemento, 'Selecionar combatentes')).toBeUndefined();
      expect(itemDaColuna(elemento, 'Editar combatentes')).toBeUndefined();
      expect(itemDaColuna(elemento, 'Calculadora')).toBeDefined();
      expect(elemento.querySelectorAll('app-conducao-turno button')).toHaveLength(0);
      expect(texto(elemento.querySelector('app-conducao-turno'))).toContain('só leitura');
      expect(texto(elemento.querySelector('.iniciativa-mestre__cabecalho app-chip'))).toBe(
        'Encerrado',
      );
      // Cartões sem steppers: o encontro encerrado é imutável.
      expect(elemento.querySelectorAll('.combatente__stepper')).toHaveLength(0);
      // Ninguém está na vez: sem coluna da ficha resumida e sem cartão "Combate encerrado."
      expect(elemento.querySelector('.iniciativa-mestre__resumo')).toBeNull();
      expect(elemento.textContent).not.toContain('Combate encerrado.');
    });

    describe('sem combate aberto (ui-38)', () => {
      /** Só há um encontro na campanha e ele já está encerrado: nenhum combate aberto. */
      const soEncerrado: EncontroRecuperadoDto = {
        ...encontroAtivo,
        status: EncontroStatusEnum.ENCERRADO,
      };

      const abrirDialog = (raiz: HTMLElement, fixture: ReturnType<typeof montar>['fixture']) => {
        itemDaColuna(raiz, 'Novo combate')!.click();
        fixture.detectChanges();
        return raiz.querySelector('app-modal dialog') as HTMLDialogElement | null;
      };

      it('mantém a casca do mestre: coluna com "Novo combate", cabeçalho sem nome e estado vazio', () => {
        const { fixture } = montar(soEncerrado);
        const elemento = fixture.nativeElement as HTMLElement;

        expect(elemento.querySelector('.iniciativa-mestre')).not.toBeNull();
        expect(elemento.querySelector('form.abertura')).toBeNull();
        expect(itemDaColuna(elemento, 'Novo combate')).toBeDefined();
        expect(itemDaColuna(elemento, 'Selecionar combatentes')).toBeUndefined();
        expect(itemDaColuna(elemento, 'Calculadora')).toBeDefined();
        expect(texto(elemento.querySelector('.iniciativa-mestre__titulo'))).toBe('Iniciativa');
        expect(elemento.querySelector('.iniciativa-mestre__cabecalho app-chip')).toBeNull();
        expect(texto(elemento.querySelector('.iniciativa-mestre__vazio'))).toContain(
          'Nenhum combate em andamento.',
        );
        expect(elemento.querySelector('app-trilha-turnos')).toBeNull();
        expect(elemento.querySelector('app-modal')).toBeNull();
      });

      it('lista os combates anteriores no próprio estado vazio, sem gatilho no cabeçalho', () => {
        const { fixture } = montar(soEncerrado);
        const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        const elemento = fixture.nativeElement as HTMLElement;

        expect(texto(elemento.querySelector('.iniciativa-mestre__anteriores h2'))).toBe(
          'Combates anteriores',
        );
        const cartoes = elemento.querySelectorAll<HTMLButtonElement>('.historico__card');
        expect(cartoes).toHaveLength(1);
        expect(texto(cartoes[0].querySelector('.historico__nome'))).toBe(soEncerrado.nome);
        expect(
          Array.from(
            elemento.querySelectorAll('.iniciativa-mestre__cabecalho button'),
          ).some((botao) => texto(botao).includes('encerrado')),
        ).toBe(false);

        cartoes[0].click();
        expect(navegar).toHaveBeenCalledWith(['/campanhas', CAMPANHA_ID, 'iniciativa', soEncerrado.id]);
      });

      it('o estado vazio e a coluna abrem o dialog "Novo combate"', () => {
        const { fixture } = montar(soEncerrado);
        const elemento = fixture.nativeElement as HTMLElement;

        elemento.querySelector<HTMLButtonElement>('.iniciativa-mestre__vazio button')!.click();
        fixture.detectChanges();

        expect(elemento.querySelector('app-modal')).not.toBeNull();
        expect(texto(elemento.querySelector('app-modal .modal__titulo'))).toBe('Novo combate');
        expect(itemDaColuna(elemento, 'Novo combate')!.getAttribute('aria-pressed')).toBe('true');
      });

      it('Abrir combate fica desabilitado sem nome e envia o nome (com trim), fechando o dialog', () => {
        const { fixture, encontroService } = montar(soEncerrado);
        const elemento = fixture.nativeElement as HTMLElement;
        abrirDialog(elemento, fixture);
        const enviar = elemento.querySelector<HTMLButtonElement>('app-modal button[type="submit"]')!;
        const campo = elemento.querySelector<HTMLInputElement>('app-modal input')!;

        expect(enviar.disabled).toBe(true);

        campo.value = '  Contenção no Setor 12  ';
        campo.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        expect(enviar.disabled).toBe(false);

        elemento
          .querySelector<HTMLFormElement>('app-modal form')!
          .dispatchEvent(new Event('submit'));
        fixture.detectChanges();

        expect(encontroService.criarEncontro).toHaveBeenCalledWith(CAMPANHA_ID, {
          nome: 'Contenção no Setor 12',
        });
        expect(elemento.querySelector('app-modal')).toBeNull();
      });

      it('Cancelar fecha o dialog sem criar nada', () => {
        const { fixture, encontroService } = montar(soEncerrado);
        const elemento = fixture.nativeElement as HTMLElement;
        abrirDialog(elemento, fixture);

        Array.from(elemento.querySelectorAll<HTMLButtonElement>('app-modal button'))
          .find((botao) => texto(botao) === 'Cancelar')!
          .click();
        fixture.detectChanges();

        expect(elemento.querySelector('app-modal')).toBeNull();
        expect(encontroService.criarEncontro).not.toHaveBeenCalled();
      });

      it('lendo um encerrado, "Combate atual" só aparece havendo combate aberto', () => {
        const encerrado: EncontroRecuperadoDto = {
          ...encontroAtivo,
          id: 99,
          status: EncontroStatusEnum.ENCERRADO,
        };
        const rotulos = (raiz: HTMLElement): string[] =>
          Array.from(
            raiz.querySelectorAll<HTMLButtonElement>('.iniciativa-mestre__cabecalho button'),
          ).map((botao) => texto(botao));

        // Há combate aberto (o padrão de `montar`): o botão volta a ele.
        const comAberto = montar();
        comAberto.encontroAlterado$.next({ encontro: encerrado });
        comAberto.fixture.detectChanges();
        const comAbertoRaiz = comAberto.fixture.nativeElement as HTMLElement;
        expect(rotulos(comAbertoRaiz)).toContain('Combate atual');
        expect(rotulos(comAbertoRaiz)).not.toContain('Novo combate');
        TestBed.resetTestingModule();

        // Nenhum aberto: o mesmo lugar oferece criar um.
        const semAberto = montar(soEncerrado);
        semAberto.encontroAlterado$.next({ encontro: encerrado });
        semAberto.fixture.detectChanges();
        const semAbertoRaiz = semAberto.fixture.nativeElement as HTMLElement;
        expect(rotulos(semAbertoRaiz)).not.toContain('Combate atual');
        expect(rotulos(semAbertoRaiz)).toContain('Novo combate');
      });
    });
  });
});
