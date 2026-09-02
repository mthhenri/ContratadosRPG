import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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
      rolarIniciativasFaltantes: vi.fn(() => of(estado)),
      atribuirIniciativa: vi.fn(() => of(estado)),
      alterarFormulaIniciativa: vi.fn(() => of(estado)),
      avancarTurno: vi.fn(() => of(estado)),
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
    expect(elemento.querySelector('.cartao__meta')?.textContent).toContain('3 participantes');
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

    expect(elemento.querySelector('.rolagem-avulso__visibilidade')?.textContent).toContain('Rolagem pública');
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

    it('preserva a grade canônica do mestre', () => {
      const mestre = montar(encontroAtivo, USUARIO_MESTRE).fixture.nativeElement as HTMLElement;
      expect(mestre.querySelector('.grade')?.classList).not.toContain('grade--compacta');
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
      const textos = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
      ).map((botao) => botao.textContent?.replace(/\s+/g, ' ').trim());

      // "Avançar turno" no mobile, "Avançar" no desktop: os dois rótulos moram no DOM e é o CSS
      // que escolhe (m7-08), então o teste afirma o prefixo, não a string inteira.
      expect(textos.some((texto) => texto?.startsWith('Avançar'))).toBe(true);
      expect(textos).toContain('Encerrar');
      expect((fixture.nativeElement as HTMLElement).querySelector('.iniciativa__papel')).toBeNull();
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

    it('mantém a caixinha "Age agora"/"Aguardando" para o mestre', () => {
      const doMestre = montar(encontroAtivo, USUARIO_MESTRE).fixture.nativeElement as HTMLElement;
      expect(doMestre.querySelector('.painel__bloco--vez')).not.toBeNull();
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

      elemento
        .querySelectorAll<HTMLButtonElement>('.secundarias__acao')
        .forEach((botao) => {
          if (botao.textContent?.includes('Selecionar combatentes')) {
            botao.click();
          }
        });
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
      Array.from(elemento.querySelectorAll<HTMLButtonElement>('.secundarias__acao'))
        .find((botao) => botao.textContent?.includes('Selecionar combatentes'))
        ?.click();
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
      Array.from(elemento.querySelectorAll<HTMLButtonElement>('.secundarias__acao'))
        .find((botao) => botao.textContent?.includes('Selecionar combatentes'))
        ?.click();
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
      Array.from(elemento.querySelectorAll<HTMLButtonElement>('.secundarias__acao'))
        .find((botao) => botao.textContent?.includes('Adicionar avulso'))
        ?.click();
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
      Array.from(elemento.querySelectorAll<HTMLButtonElement>('.secundarias__acao'))
        .find((botao) => botao.textContent?.includes('Adicionar avulso'))
        ?.click();
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
      Array.from(elemento.querySelectorAll<HTMLButtonElement>('.secundarias__acao'))
        .find((botao) => botao.textContent?.includes('Adicionar avulso'))
        ?.click();
      fixture.detectChanges();

      const botaoSubmeter = elemento.querySelector<HTMLButtonElement>('.adicionar__acao')!;
      expect(botaoSubmeter.disabled).toBe(true);

      elemento.querySelector('form.adicionar')?.dispatchEvent(new Event('submit'));
      expect(encontroService.adicionarCombatente).not.toHaveBeenCalled();
    });

    it('vira botão filled (não mais "Fechar") enquanto o seletor está aberto', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const botao = Array.from(
        elemento.querySelectorAll<HTMLButtonElement>('.secundarias__acao'),
      ).find((item) => item.textContent?.includes('Selecionar combatentes'))!;

      expect(botao.classList).toContain('botao--secundario');
      expect(botao.getAttribute('aria-pressed')).toBe('false');

      botao.click();
      fixture.detectChanges();

      expect(botao.textContent?.trim()).toContain('Selecionar combatentes');
      expect(botao.classList).toContain('botao--primario');
      expect(botao.classList).not.toContain('botao--secundario');
      expect(botao.getAttribute('aria-pressed')).toBe('true');
    });

    it('vira botão filled enquanto o avulso está aberto, e "Cancelar" limpa e fecha o formulário', () => {
      const { fixture, encontroService } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const botaoAbrir = Array.from(
        elemento.querySelectorAll<HTMLButtonElement>('.secundarias__acao'),
      ).find((item) => item.textContent?.includes('Adicionar avulso'))!;

      botaoAbrir.click();
      fixture.detectChanges();

      expect(botaoAbrir.classList).toContain('botao--primario');
      expect(botaoAbrir.getAttribute('aria-pressed')).toBe('true');

      const nome = elemento.querySelector<HTMLInputElement>('input[formControlName="nomeAvulso"]')!;
      nome.value = 'Sujeito Contido';
      nome.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const botaoCancelar = Array.from(
        elemento.querySelectorAll<HTMLButtonElement>('form.adicionar .adicionar__acao'),
      ).find((item) => item.textContent?.includes('Cancelar'))!;
      botaoCancelar.click();
      fixture.detectChanges();

      expect(elemento.querySelector('form.adicionar')).toBeNull();
      expect(botaoAbrir.classList).toContain('botao--secundario');
      expect(encontroService.adicionarCombatente).not.toHaveBeenCalled();

      // Reabrir prova que o formulário voltou limpo.
      botaoAbrir.click();
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

    /** "Pedir iniciativa" e "Rolar iniciativas" ficam juntos numa caixinha; "Iniciar combate" mora
     *  na sua própria, ao lado — ela é quem vira a barra fixa do rodapé no mobile (m7-08). */
    it('agrupa "Pedir iniciativa" e "Rolar iniciativas" numa caixinha, separada da de "Iniciar combate"', () => {
      const { fixture } = montar(montagem);
      const elemento = fixture.nativeElement as HTMLElement;

      const blocos = Array.from(elemento.querySelectorAll('.painel__bloco--controles'));
      const blocoPedidos = blocos.find((bloco) =>
        bloco.textContent?.includes('Pedir iniciativa'),
      )!;
      const blocoIniciar = blocos.find((bloco) => bloco.textContent?.includes('Iniciar combate'))!;

      expect(blocoPedidos).not.toBe(blocoIniciar);
      expect(blocoPedidos.textContent).toContain('Rolar iniciativas');
      expect(blocoPedidos.classList).not.toContain('painel__bloco--conducao');
      expect(blocoIniciar.classList).toContain('painel__bloco--conducao');

      const botaoPedir = blocoPedidos.querySelector('button')!;
      expect(botaoPedir.textContent?.trim()).toBe('Pedir iniciativa');
      expect(botaoPedir.classList).toContain('botao--positivo');

      // "Rolar iniciativas" some da gaveta de "mais ações": em montagem ela já está na caixinha.
      const gaveta = Array.from(elemento.querySelectorAll('.secundarias__acao')).map((botao) =>
        botao.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(gaveta).not.toContain('Rolar iniciativas');
    });
  });

  describe('combate: "Encerrar" ao lado da condução, sem "Rolar iniciativas"', () => {
    it('põe "Encerrar" na própria caixinha, ao lado de Voltar/Avançar — fora da gaveta', () => {
      const { fixture } = montar(encontroAtivo);
      const elemento = fixture.nativeElement as HTMLElement;

      const blocos = Array.from(elemento.querySelectorAll('.painel__bloco--controles'));
      const blocoConducao = blocos.find((bloco) => bloco.textContent?.includes('Avançar'))!;
      const blocoEncerrar = blocos.find(
        (bloco) => bloco.textContent?.replace(/\s+/g, ' ').trim() === 'Encerrar',
      )!;

      expect(blocoEncerrar).not.toBe(blocoConducao);
      expect(blocoEncerrar.classList).not.toContain('painel__bloco--conducao');
      expect(
        Array.from(elemento.querySelectorAll('.secundarias__acao')).some(
          (botao) => botao.textContent?.trim() === 'Encerrar',
        ),
      ).toBe(false);
    });

    it('pede confirmação (ui-15) antes de encerrar; cancelar não chama encerrarEncontro', async () => {
      const { fixture, encontroService } = montar(encontroAtivo);
      const confirmar = vi
        .spyOn(TestBed.inject(ConfirmacaoService), 'confirmar')
        .mockResolvedValue(false);
      const elemento = fixture.nativeElement as HTMLElement;

      Array.from(elemento.querySelectorAll<HTMLButtonElement>('.painel__acao'))
        .find((botao) => botao.textContent?.trim() === 'Encerrar')
        ?.click();
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

      Array.from(elemento.querySelectorAll<HTMLButtonElement>('.painel__acao'))
        .find((botao) => botao.textContent?.trim() === 'Encerrar')
        ?.click();
      fixture.detectChanges();
      await Promise.resolve();
      await Promise.resolve();

      expect(encontroService.encerrarEncontro).toHaveBeenCalledWith(encontroAtivo.id);
    });

    it('nunca mostra "Rolar iniciativas" depois que o combate começou', () => {
      const elemento = montar(encontroAtivo).fixture.nativeElement as HTMLElement;
      const textos = Array.from(elemento.querySelectorAll('button')).map((botao) =>
        botao.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(textos).not.toContain('Rolar iniciativas');
    });
  });

  it('esconde o log da rodada (por enquanto) para o mestre', () => {
    const doMestre = montar(encontroAtivo, USUARIO_MESTRE).fixture.nativeElement as HTMLElement;
    expect(doMestre.querySelector('app-log-encontro')).toBeNull();
  });

  it('esconde o log da rodada (por enquanto) para o jogador', () => {
    const doJogador = montar(encontroAtivo, USUARIO_JOGADOR).fixture.nativeElement as HTMLElement;
    expect(doJogador.querySelector('app-log-encontro')).toBeNull();
  });

  describe('histórico: só o mestre vê "Encontros anteriores"', () => {
    const encerrado: EncontroResumoDto = {
      id: 2,
      campanhaId: CAMPANHA_ID,
      nome: 'Emboscada no Setor 4',
      status: EncontroStatusEnum.ENCERRADO,
      rodadaAtual: 5,
      quantidadeCombatentes: 3,
      createdDate: '2026-08-10T00:00:00.000Z',
    };

    it('mostra o link "N encerrados" no cabeçalho pro mestre, e abre o painel do histórico', () => {
      const { fixture } = montar(encontroAtivo, USUARIO_MESTRE, [encerrado]);
      const elemento = fixture.nativeElement as HTMLElement;
      const gatilho = Array.from(
        elemento.querySelectorAll<HTMLButtonElement>('.iniciativa__historico'),
      ).find((botao) => botao.textContent?.includes('encerrado'))!;
      expect(gatilho).not.toBeUndefined();
      expect(elemento.querySelector('.historico__painel')).toBeNull();

      gatilho.click();
      fixture.detectChanges();

      expect(elemento.querySelector('.historico__painel')).not.toBeNull();
      expect(elemento.querySelector('.historico__nome')?.textContent?.trim()).toBe(
        'Emboscada no Setor 4',
      );
    });

    it('nunca mostra o link de "Encontros anteriores" pro jogador, mesmo havendo histórico', () => {
      const elemento = montar(encontroAtivo, USUARIO_JOGADOR, [encerrado]).fixture
        .nativeElement as HTMLElement;
      expect(elemento.querySelector('.iniciativa__historico')).toBeNull();
      expect(elemento.querySelector('.historico__painel')).toBeNull();
    });
  });

  describe('recorte mobile (m7-08)', () => {
    /**
     * O que estes testes provam é a **estrutura** que o CSS usa para decidir o recorte: os dois
     * rótulos no DOM, a classe do bloco redundante, a gaveta de ações. A largura em si é verificada
     * na aplicação real (skill `verify`, 360×800) — jsdom não aplica media query.
     */
    const emMontagem: EncontroRecuperadoDto = {
      ...encontroAtivo,
      status: EncontroStatusEnum.MONTAGEM,
      turnoIndice: 0,
      ordemRodada: [],
    };

    it('carrega o contador condensado `R · T` ao lado da contagem de participantes', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const compacta = (elemento.querySelector('.cartao__meta--compacta')?.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      // Rodada 2, 3º dos 4 slots da ordem intercalada.
      expect(compacta).toBe('R2 · T3/4');
      expect(elemento.querySelector('.cartao__meta:not(.cartao__meta--compacta)')?.textContent)
        .toContain('participantes');
    });

    it('marca como redundante no mobile o bloco de contadores durante o combate', () => {
      const emCombate = montar().fixture.nativeElement as HTMLElement;
      expect(
        emCombate.querySelector('.painel__bloco--contadores')?.classList,
      ).toContain('painel__bloco--redundante-mobile');
    });

    it('mantém o bloco de contadores no mobile em montagem, onde ele carrega a "Situação"', () => {
      // O cabeçalho compacto só mostra `R · T`, que em montagem ainda não existe.
      const elemento = montar(emMontagem).fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('.cartao__meta--compacta')).toBeNull();
      expect(
        elemento.querySelector('.painel__bloco--contadores')?.classList,
      ).not.toContain('painel__bloco--redundante-mobile');
    });

    it('deixa só a ação primária no bloco de condução e manda o resto para a gaveta', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const conducao = Array.from(
        elemento.querySelectorAll('.painel__bloco--conducao button'),
      ).map((botao) => (botao.textContent ?? '').replace(/\s+/g, ' ').trim());
      expect(conducao).toEqual(['Voltar', 'Avançar turno']);

      const gaveta = Array.from(elemento.querySelectorAll('.secundarias__acao')).map((botao) =>
        (botao.textContent ?? '').replace(/\s+/g, ' ').trim(),
      );
      expect(gaveta).toEqual(['Selecionar combatentes', 'Adicionar avulso', 'Editar combatentes']);
    });

    it('abre e fecha a gaveta de ações secundárias', () => {
      const { fixture } = montar();
      const elemento = fixture.nativeElement as HTMLElement;
      const gatilho = elemento.querySelector<HTMLButtonElement>('.secundarias__gatilho');
      expect(gatilho?.textContent?.trim()).toBe('Mais ações');
      expect(elemento.querySelector('.secundarias')?.classList).not.toContain(
        'secundarias--abertas',
      );

      gatilho?.click();
      fixture.detectChanges();
      expect(elemento.querySelector('.secundarias')?.classList).toContain('secundarias--abertas');
      expect(
        elemento.querySelector<HTMLButtonElement>('.secundarias__gatilho')?.textContent?.trim(),
      ).toBe('Fechar ações');
    });

    it('não dá gaveta nem barra de condução ao jogador', () => {
      const elemento = montar(encontroAtivo, USUARIO_JOGADOR).fixture.nativeElement as HTMLElement;
      expect(elemento.querySelector('.secundarias')).toBeNull();
      expect(elemento.querySelector('.painel__bloco--conducao')).toBeNull();
    });
  });
});
