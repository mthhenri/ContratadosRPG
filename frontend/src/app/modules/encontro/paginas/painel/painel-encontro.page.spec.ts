import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';

import type { EncontroAlteradoDto, EncontroRecuperadoDto } from '@contratados-rpg/shared/dtos/encontro';
import type { CampanhaMembroResumoDto } from '@contratados-rpg/shared/dtos/campanha';
import type { FichaResumoDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  CadenciaEnum,
  ClasseEnum,
  CombatenteOrigemEnum,
  EncontroStatusEnum,
  NivelAmeacaEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
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
    corFicha: null,
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
      usuarioId: 7,
      nome: 'Bia',
      papel: TipoCampanhaMembroPapelEnum.JOGADOR,
      fichas: [{ id: 200, nome: 'K. Amaral' }] as unknown as CampanhaMembroResumoDto['fichas'],
    },
  ];

  const fichas = [
    {
      id: 100,
      campanhaId: CAMPANHA_ID,
      campanhaNome: null,
      usuarioId: 7,
      nome: 'SCP-1471-A',
      tipo: TipoFichaEnum.CRIATURA,
      na: NivelAmeacaEnum.ALTA,
      classe: ClasseEnum.COMBATENTE,
      arquetipo: null,
      nivel: 0,
      vidaAtual: 40,
      energiaAtual: 0,
      morrendo: false,
      machucado: false,
      inconsciente: false,
    },
  ] as unknown as FichaResumoDto[];

  function montar(estado: EncontroRecuperadoDto = encontroAtivo) {
    const encontroAlterado$ = new Subject<EncontroAlteradoDto>();
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
        ]),
      ),
      recuperarEncontro: vi.fn(() => of(estado)),
      rolarIniciativasFaltantes: vi.fn(() => of(estado)),
      avancarTurno: vi.fn(() => of(estado)),
      ajustarVida: vi.fn(() => of(estado)),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        MessageService,
        { provide: EncontroService, useValue: encontroService },
        { provide: FichaService, useValue: { listarFichas: vi.fn(() => of(fichas)) } },
        { provide: CampanhaService, useValue: { listarMembros: vi.fn(() => of(membros)) } },
        {
          provide: TempoRealService,
          useValue: {
            conectar: vi.fn(),
            entrarSalaCampanha: vi.fn(),
            sairSalaCampanha: vi.fn(),
            conectado: () => true,
            reconexao: () => 0,
            encontroAlterado$,
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['campanhaId', String(CAMPANHA_ID)]]) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(PainelEncontro);
    fixture.detectChanges();
    return { fixture, encontroService, encontroAlterado$ };
  }

  /** Os membros `protected` que o template consome — o teste lê exatamente o que a tela lê. */
  interface PainelInterno {
    readonly encontro: () => EncontroRecuperadoDto | null;
    readonly combatentes: () => readonly { id: number; nome: string }[];
    readonly combatenteDaVez: () => { nome: string } | null;
    readonly acoesRestantesDaVez: () => number;
    readonly totalDeTurnos: () => number;
    readonly jaAgiu: (combatente: { id: number }) => boolean;
    readonly donoNome: (combatente: { fichaId: number | null }) => string | null;
    readonly nivelAmeaca: (combatente: unknown) => NivelAmeacaEnum | null;
    readonly rolarTudo: () => void;
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

  it('ordena os cartões pela ordem em que agem, cada combatente uma vez', () => {
    const { fixture } = montar();
    const nomes = interno(fixture).combatentes().map((combatente) => combatente.nome);
    expect(nomes).toEqual(['SCP-1471-A', 'K. Amaral', 'V. Corvalho']);
  });

  it('resolve dono e Nível de Ameaça do contexto já carregado, sem consulta extra', () => {
    const { fixture } = montar();
    const painel = interno(fixture);
    const [criatura, agente] = painel.combatentes() as unknown as {
      fichaId: number | null;
    }[];

    expect(painel.donoNome(agente)).toBe('Bia');
    expect(painel.nivelAmeaca(criatura)).toBe(NivelAmeacaEnum.ALTA);
    expect(painel.nivelAmeaca(agente)).toBeNull();
  });

  it('`Rolar tudo` só manda quem está sem iniciativa, somando o bônus da criatura', () => {
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
});
