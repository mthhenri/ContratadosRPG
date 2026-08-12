import type { FichaAtributosDto, FichaJogadorDadosDto } from '@contratados-rpg/shared/dtos/ficha';
import {
  ArquetipoEnum,
  ClasseEnum,
  TipoCampanhaMembroPapelEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import {
  calcularDerivados,
  calcularEnergia,
  calcularVida,
  habilidadesIniciais,
} from '@contratados-rpg/shared/regras/agente';

export const SENHA_CONTAS_DEV = 'contratados.dev';

export type ChaveUsuarioDev = 'matheus' | 'codex' | 'stub1' | 'stub2';
export type ChaveCampanhaDev = 'campanha-matheus' | 'campanha-codex';

export interface DefinicaoUsuarioDev {
  readonly chave: ChaveUsuarioDev;
  readonly login: string;
  readonly nome: string;
  readonly alterarSenha: boolean;
}

export interface DefinicaoCampanhaDev {
  readonly chave: ChaveCampanhaDev;
  readonly nome: string;
  readonly descricao: string;
  readonly codigoConvite: string;
}

export interface DefinicaoMembroDev {
  readonly campanha: ChaveCampanhaDev;
  readonly usuario: ChaveUsuarioDev;
  readonly papel: TipoCampanhaMembroPapelEnum;
}

export interface DefinicaoFichaDev {
  readonly campanha: ChaveCampanhaDev;
  readonly usuario: ChaveUsuarioDev;
  readonly tipo: TipoFichaEnum.JOGADOR;
  readonly nome: string;
  readonly cor: string;
  readonly classe: ClasseEnum;
  readonly arquetipo: ArquetipoEnum | null;
  readonly nivel: number;
  readonly prestigio: number;
  readonly atributos: FichaAtributosDto;
  readonly dinheiro: number;
}

const ATRIBUTOS_COMBATENTE: FichaAtributosDto = {
  destreza: 2,
  forca: 3,
  luta: 3,
  pontaria: 2,
  vigor: 3,
  intelecto: 1,
  medicina: 1,
  sentidos: 2,
  social: 1,
  vontade: 2,
};

const ATRIBUTOS_ESPECIALISTA: FichaAtributosDto = {
  destreza: 3,
  forca: 1,
  luta: 1,
  pontaria: 2,
  vigor: 2,
  intelecto: 4,
  medicina: 2,
  sentidos: 3,
  social: 1,
  vontade: 2,
};

const ATRIBUTOS_SUPORTE: FichaAtributosDto = {
  destreza: 2,
  forca: 1,
  luta: 1,
  pontaria: 1,
  vigor: 2,
  intelecto: 2,
  medicina: 4,
  sentidos: 2,
  social: 3,
  vontade: 3,
};

const ATRIBUTOS_EXPERIMENTO: FichaAtributosDto = {
  destreza: 3,
  forca: 4,
  luta: 3,
  pontaria: 1,
  vigor: 4,
  intelecto: 1,
  medicina: 1,
  sentidos: 3,
  social: 1,
  vontade: 2,
};

export const CENARIO_DEV = {
  usuarios: [
    { chave: 'matheus', login: 'senhor.contratados', nome: 'Matheus', alterarSenha: false },
    { chave: 'codex', login: 'codex.dev', nome: 'Codex', alterarSenha: true },
    { chave: 'stub1', login: 'jogador.stub.1', nome: 'Jogador Stub 1', alterarSenha: true },
    { chave: 'stub2', login: 'jogador.stub.2', nome: 'Jogador Stub 2', alterarSenha: true },
  ],
  campanhas: [
    {
      chave: 'campanha-matheus',
      nome: 'Campanha do Matheus',
      descricao: 'Fixture local do Matheus',
      codigoConvite: 'DEVMT001',
    },
    {
      chave: 'campanha-codex',
      nome: 'Campanha do Codex',
      descricao: 'Fixture local do Codex',
      codigoConvite: 'DEVCD001',
    },
  ],
  membros: [
    { campanha: 'campanha-matheus', usuario: 'matheus', papel: TipoCampanhaMembroPapelEnum.MESTRE },
    { campanha: 'campanha-matheus', usuario: 'codex', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-matheus', usuario: 'stub1', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-matheus', usuario: 'stub2', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-codex', usuario: 'codex', papel: TipoCampanhaMembroPapelEnum.MESTRE },
    { campanha: 'campanha-codex', usuario: 'matheus', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-codex', usuario: 'stub1', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-codex', usuario: 'stub2', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
  ],
  fichas: [
    {
      campanha: 'campanha-matheus',
      usuario: 'matheus',
      tipo: TipoFichaEnum.JOGADOR,
      nome: 'Sentinela Matheus',
      cor: '#D97706',
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.MERCENARIO,
      nivel: 3,
      prestigio: 2,
      atributos: ATRIBUTOS_COMBATENTE,
      dinheiro: 2500,
    },
    {
      campanha: 'campanha-matheus',
      usuario: 'codex',
      tipo: TipoFichaEnum.JOGADOR,
      nome: 'Operador Codex',
      cor: '#2563EB',
      classe: ClasseEnum.ESPECIALISTA,
      arquetipo: ArquetipoEnum.ENGENHEIRO,
      nivel: 2,
      prestigio: 1,
      atributos: ATRIBUTOS_ESPECIALISTA,
      dinheiro: 2250,
    },
    {
      campanha: 'campanha-matheus',
      usuario: 'stub1',
      tipo: TipoFichaEnum.JOGADOR,
      nome: 'Vanguarda Stub 1',
      cor: '#0891B2',
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.VANGUARDA,
      nivel: 2,
      prestigio: 1,
      atributos: ATRIBUTOS_COMBATENTE,
      dinheiro: 2100,
    },
    {
      campanha: 'campanha-matheus',
      usuario: 'stub2',
      tipo: TipoFichaEnum.JOGADOR,
      nome: 'Diplomata Stub 2',
      cor: '#DB2777',
      classe: ClasseEnum.SUPORTE,
      arquetipo: ArquetipoEnum.DIPLOMATA,
      nivel: 1,
      prestigio: 0,
      atributos: ATRIBUTOS_SUPORTE,
      dinheiro: 1900,
    },
    {
      campanha: 'campanha-codex',
      usuario: 'matheus',
      tipo: TipoFichaEnum.JOGADOR,
      nome: 'Paramédico Matheus',
      cor: '#16A34A',
      classe: ClasseEnum.SUPORTE,
      arquetipo: ArquetipoEnum.PARAMEDICO,
      nivel: 2,
      prestigio: 1,
      atributos: ATRIBUTOS_SUPORTE,
      dinheiro: 2000,
    },
    {
      campanha: 'campanha-codex',
      usuario: 'codex',
      tipo: TipoFichaEnum.JOGADOR,
      nome: 'Quimera Codex',
      cor: '#9333EA',
      classe: ClasseEnum.EXPERIMENTO_BESTIAL,
      arquetipo: null,
      nivel: 1,
      prestigio: -1,
      atributos: ATRIBUTOS_EXPERIMENTO,
      dinheiro: 1750,
    },
    {
      campanha: 'campanha-codex',
      usuario: 'stub1',
      tipo: TipoFichaEnum.JOGADOR,
      nome: 'Acadêmico Stub 1',
      cor: '#0D9488',
      classe: ClasseEnum.ESPECIALISTA,
      arquetipo: ArquetipoEnum.ACADEMICO,
      nivel: 3,
      prestigio: 2,
      atributos: ATRIBUTOS_ESPECIALISTA,
      dinheiro: 2400,
    },
    {
      campanha: 'campanha-codex',
      usuario: 'stub2',
      tipo: TipoFichaEnum.JOGADOR,
      nome: 'Lutador Stub 2',
      cor: '#DC2626',
      classe: ClasseEnum.COMBATENTE,
      arquetipo: ArquetipoEnum.LUTADOR,
      nivel: 2,
      prestigio: 1,
      atributos: ATRIBUTOS_COMBATENTE,
      dinheiro: 2050,
    },
  ],
} as const satisfies {
  readonly usuarios: readonly DefinicaoUsuarioDev[];
  readonly campanhas: readonly DefinicaoCampanhaDev[];
  readonly membros: readonly DefinicaoMembroDev[];
  readonly fichas: readonly DefinicaoFichaDev[];
};

export function montarDadosFichaDev(ficha: DefinicaoFichaDev): FichaJogadorDadosDto {
  const vidaMaxima = calcularVida({
    classe: ficha.classe,
    nivel: ficha.nivel,
    vigor: ficha.atributos.vigor,
  });
  const energiaMaxima = calcularEnergia({
    classe: ficha.classe,
    nivel: ficha.nivel,
    destreza: ficha.atributos.destreza,
  });
  const habilidades = habilidadesIniciais(ficha.classe, ficha.arquetipo).map(
    ({ nome, categoria, custoEnergia, descricao, origem }) => ({
      nome,
      categoria,
      custoEnergia,
      descricao,
      ...(origem === undefined ? {} : { origem }),
    }),
  );

  return {
    classe: ficha.classe,
    arquetipo: ficha.arquetipo,
    nivel: ficha.nivel,
    prestigio: ficha.prestigio,
    atributos: ficha.atributos,
    maestria: null,
    estado: {
      vidaAtual: vidaMaxima,
      energiaAtual: energiaMaxima,
      vidaMaxima,
      energiaMaxima,
      sequelas: [],
      traumas: [],
      lesoes: [],
    },
    derivados: calcularDerivados(ficha.classe, ficha.nivel, ficha.atributos, habilidades),
    habilidades,
    inventario: { itens: [], amplificadores: [] },
    rolagens: [],
    combos: [],
    anotacoes: '',
    historia: '',
    dinheiro: ficha.dinheiro,
  } satisfies FichaJogadorDadosDto;
}
