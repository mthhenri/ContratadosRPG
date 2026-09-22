import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

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
  RolagemVisibilidadeEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';

import { SessaoService } from '../../../../core/services/sessao.service';
import { TempoRealService } from '../../../../core/services/tempo-real.service';
import { CampanhaService } from '../../../campanha/campanha.service';
import { FichaService } from '../../../ficha/ficha.service';
import { RolagemService } from '../../../ficha/rolagem.service';
import { EncontroService } from '../../encontro.service';
import { EncontroPainelDadosService } from './encontro-painel-dados.service';

/**
 * Apoio de teste da tela "Iniciativa" (`ui-39`): fixtures e providers compartilhados pelos specs da
 * casca, do serviço de dados e das páginas do mestre e do jogador. O foco dos testes é o que a
 * **tela** deriva — de quem é a vez, quem já agiu, quantas ações restam — a partir da
 * `ordemRodada` que o backend calculou com `shared/regras/encontro`: nenhuma regra de
 * ordem/Cadência é recalculada aqui, e a ordem chega pronta.
 */
export const CAMPANHA_ID = 9;
export const USUARIO_MESTRE = 1;
export const USUARIO_JOGADOR = 7;

export const criarCombatente = (
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

/** Uma criatura de Cadência Dupla intercalada entre dois agentes — o caso canônico do guia. */
export const encontroAtivo: EncontroRecuperadoDto = {
  id: 1,
  campanhaId: CAMPANHA_ID,
  nome: 'Contenção no Setor 12',
  status: EncontroStatusEnum.ATIVO,
  rodadaAtual: 2,
  turnoIndice: 2,
  combatentes: [
    criarCombatente(1, 'SCP-1471-A', {
      tipoFicha: TipoFichaEnum.CRIATURA,
      cadencia: CadenciaEnum.DUPLA,
      iniciativa: 24,
      iniciativaBonus: 3,
      destreza: 5,
    }),
    criarCombatente(2, 'K. Amaral', { iniciativa: 18 }),
    criarCombatente(3, 'V. Corvalho', { iniciativa: 12 }),
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

/** O mesmo encontro em montagem: sem `ordemRodada`, ninguém age. */
export const encontroEmMontagem: EncontroRecuperadoDto = {
  ...encontroAtivo,
  status: EncontroStatusEnum.MONTAGEM,
  turnoIndice: 0,
  ordemRodada: [],
};

export const membrosDeTeste: CampanhaMembroResumoDto[] = [
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
export const fichaDoJogador = {
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
    rolagens: [{ nome: 'Iniciativa', formula: 'DESd6', habilidadesVinculadas: [], passos: [] }],
    identidade: { personalidade: null, origem: null },
  },
} as unknown as FichaRecuperadaDto;

/** Resumo usado apenas quando o teste precisa exercitar a abertura da própria ficha. */
export const fichaResumoDoJogador = {
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

export const fichasDeTeste = [
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

export interface OpcoesDoPainel {
  readonly estado?: EncontroRecuperadoDto;
  readonly usuarioId?: number;
  readonly historicoExtra?: readonly EncontroResumoDto[];
  readonly incluirFichaDoJogador?: boolean;
  /** Os membros nunca chegam (`listarMembros` fica pendente) — o papel é desconhecido. */
  readonly membrosPendentes?: boolean;
  /** A lista de encontros chega, mas o encontro em si (`recuperarEncontro`) fica pendente. */
  readonly encontroPendente?: boolean;
  /**
   * Não provê o `EncontroPainelDadosService` no `TestBed`: a casca o declara nos próprios
   * `providers`, e um segundo provedor na raiz criaria duas instâncias (duas cargas).
   */
  readonly semServicoDeDados?: boolean;
}

/**
 * Configura o `TestBed` com o que a tela consome — serviços com dublê, sessão do usuário, rota e o
 * `EncontroPainelDadosService` (que na aplicação é provido pela casca) — e devolve os dublês e as
 * fontes de tempo real para o teste dirigir.
 */
export function configurarPainel(opcoes: OpcoesDoPainel = {}) {
  const {
    estado = encontroAtivo,
    usuarioId = USUARIO_MESTRE,
    historicoExtra = [],
    incluirFichaDoJogador = false,
    membrosPendentes = false,
    encontroPendente = false,
    semServicoDeDados = false,
  } = opcoes;
  const encontroAlterado$ = new Subject<EncontroAlteradoDto>();
  const encontroIniciativaPedido$ = new Subject<{ id: number; campanhaId: number }>();
  const rolagemRegistrada$ = new Subject<RolagemResumoDto>();
  const paginaEsquadraoCriada$ = new Subject<PaginaCadernoResumoDto>();
  const paginaEsquadraoAlterada$ = new Subject<PaginaCadernoEsquadraoAlteradaDto>();
  const paginaEsquadraoExcluida$ = new Subject<{ campanhaId: number; paginaId: number }>();
  const presencaEsquadraoCaderno$ = new Subject<unknown>();
  const membrosPendentes$ = new Subject<CampanhaMembroResumoDto[]>();
  const encontroPendente$ = new Subject<EncontroRecuperadoDto>();
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
    recuperarEncontro: vi.fn(() => (encontroPendente ? encontroPendente$ : of(estado))),
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
      of(incluirFichaDoJogador ? [...fichasDeTeste, fichaResumoDoJogador] : fichasDeTeste),
    ),
    recuperarFicha: vi.fn(() => of(fichaDoJogador)),
  };
  const campanhaService = {
    listarMembros: vi.fn(() => (membrosPendentes ? membrosPendentes$ : of(membrosDeTeste))),
    recuperarCampanha: vi.fn(() => of({ id: CAMPANHA_ID, nome: 'Campanha de Teste' })),
  };

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      ...(semServicoDeDados ? [] : [EncontroPainelDadosService]),
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
      { provide: CampanhaService, useValue: campanhaService },
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
          rolagemExcluida$: new Subject<never>(),
          paginaEsquadraoCriada$,
          paginaEsquadraoAlterada$,
          paginaEsquadraoExcluida$,
          presencaEsquadraoCaderno$,
        },
      },
      {
        // `paramMap` como Observable: o serviço escuta a troca de `:encontroId` (histórico) em vez
        // de ler o snapshot uma vez, porque o Angular reusa o componente entre esses dois estados.
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: new Map([['campanhaId', String(CAMPANHA_ID)]]) },
          paramMap: of(convertToParamMap({ campanhaId: String(CAMPANHA_ID) })),
        },
      },
    ],
  });

  return {
    encontroService,
    fichaService,
    campanhaService,
    encontroAlterado$,
    encontroIniciativaPedido$,
    rolagemRegistrada$,
    membrosPendentes$,
    encontroPendente$,
  };
}

/**
 * Configura o painel e monta a página/casca `tipo` já com a primeira detecção de mudanças. O
 * `dados` devolvido é o que a árvore da fixture enxerga — o da raiz para as páginas, o da própria
 * casca (`providers`) para ela.
 */
export function montarPainel<T>(tipo: Type<T>, opcoes: OpcoesDoPainel = {}) {
  const dublês = configurarPainel(opcoes);
  const fixture = TestBed.createComponent(tipo);
  fixture.detectChanges();
  const dados = fixture.debugElement.injector.get(EncontroPainelDadosService);
  return { fixture, dados, ...dublês };
}

/** Texto de um elemento sem quebras/espaços duplicados — o template quebra linhas ao formatar. */
export const texto = (elemento: Element | null | undefined): string =>
  (elemento?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Um item de `app-coluna-acoes` pelo rótulo. */
export const itemDaColuna = (raiz: HTMLElement, rotulo: string): HTMLButtonElement | undefined =>
  Array.from(raiz.querySelectorAll<HTMLButtonElement>('app-coluna-acoes .coluna-acoes__item')).find(
    (item) => texto(item) === rotulo,
  );

/** Um botão da barra de condução do mestre pelo `aria-label` ou pelo texto. */
export const botaoDaConducao = (raiz: HTMLElement, rotulo: string): HTMLButtonElement | undefined =>
  Array.from(raiz.querySelectorAll<HTMLButtonElement>('app-conducao-turno button')).find(
    (botao) => botao.getAttribute('aria-label') === rotulo || texto(botao) === rotulo,
  );
