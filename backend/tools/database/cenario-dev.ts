import type {
  FichaAtributosDto,
  FichaCriaturaDadosDto,
  FichaJogadorDadosDto,
} from '@contratados-rpg/shared/dtos/ficha';
import {
  ArquetipoEnum,
  CadenciaEnum,
  ClasseEnum,
  ComportamentoCriaturaEnum,
  CustoAcaoEnum,
  HabilidadeTipoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  TenacidadeEnum,
  TipoCampanhaMembroPapelEnum,
  TipoDanoEnum,
  TipoFichaEnum,
} from '@contratados-rpg/shared/enums';
import {
  calcularDerivados,
  calcularEnergia,
  calcularVida,
  habilidadesIniciais,
} from '@contratados-rpg/shared/regras/agente';

export const SENHA_CONTAS_DEV = 'contratados.dev';

export type ChaveUsuarioDev = 'matheus' | 'codex' | 'stub1' | 'stub2' | 'espectador';
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
  /** Convite de `ESPECTADOR` (m8-01) — independente de `codigoConvite`, de `JOGADOR`. */
  readonly codigoConviteEspectador: string;
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

/**
 * Criatura de teste (Ameaça, `m4-01`) — sempre pertence ao mestre da campanha (§14: dono é
 * sempre o mestre, nunca delegado). Fica invisível aos demais membros pela ausência de linha
 * em `usuario_ficha_acesso` (nenhuma criada aqui) — a coluna `oculta` é um recurso à parte
 * (m3-65, ficha que o próprio dono esconde de si) e não entra neste cenário.
 */
export interface DefinicaoCriaturaDev {
  readonly campanha: ChaveCampanhaDev;
  readonly usuario: ChaveUsuarioDev;
  readonly tipo: TipoFichaEnum.CRIATURA;
  readonly nome: string;
  readonly cor: string;
  readonly dados: FichaCriaturaDadosDto;
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
    { chave: 'espectador', login: 'espectador.stub', nome: 'Espectador Stub', alterarSenha: true },
  ],
  campanhas: [
    {
      chave: 'campanha-matheus',
      nome: 'Campanha do Matheus',
      descricao: 'Fixture local do Matheus',
      codigoConvite: 'DEVMT001',
      codigoConviteEspectador: 'DEVMTESP',
    },
    {
      chave: 'campanha-codex',
      nome: 'Campanha do Codex',
      descricao: 'Fixture local do Codex',
      codigoConvite: 'DEVCD001',
      codigoConviteEspectador: 'DEVCDESP',
    },
  ],
  membros: [
    { campanha: 'campanha-matheus', usuario: 'matheus', papel: TipoCampanhaMembroPapelEnum.MESTRE },
    { campanha: 'campanha-matheus', usuario: 'codex', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-matheus', usuario: 'stub1', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-matheus', usuario: 'stub2', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    {
      campanha: 'campanha-matheus',
      usuario: 'espectador',
      papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
    },
    { campanha: 'campanha-codex', usuario: 'codex', papel: TipoCampanhaMembroPapelEnum.MESTRE },
    { campanha: 'campanha-codex', usuario: 'matheus', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-codex', usuario: 'stub1', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    { campanha: 'campanha-codex', usuario: 'stub2', papel: TipoCampanhaMembroPapelEnum.JOGADOR },
    {
      campanha: 'campanha-codex',
      usuario: 'espectador',
      papel: TipoCampanhaMembroPapelEnum.ESPECTADOR,
    },
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
  criaturas: [
    {
      campanha: 'campanha-matheus',
      usuario: 'matheus',
      tipo: TipoFichaEnum.CRIATURA,
      nome: 'A Estátua',
      cor: '#78716C',
      dados: {
        identidade: {
          designacao: 'A Estátua',
          origem: OrigemCriaturaEnum.SCP_ADAPTADO,
          conceito:
            'Uma figura de pedra humanoide que só se move quando ninguém a observa diretamente.',
          naturezaFisica:
            'Humanoide, altura entre 1,8m e 2,1m, aparência de pedra calcária escura. Sem feições definidas.',
          comportamento: ComportamentoCriaturaEnum.CACADORA,
          motivacao:
            'Desconhecida. Não demonstra comunicação, territorialidade ou padrão de seleção de alvos.',
          ganchoUnico: 'Imóvel enquanto observada. Letal em frações de segundo quando não é.',
          temaHorror: 'Paranoia, atenção dividida, cooperação forçada.',
        },
        na: NivelAmeacaEnum.MEDIA,
        vd: 30,
        atributos: {
          forca: 3,
          destreza: 4,
          luta: 5,
          pontaria: 2,
          vigor: 3,
          intelecto: 2,
          medicina: 2,
          sentidos: 3,
          social: 0,
          vontade: 2,
        },
        modificadores: {
          destreza: ModificadorCriaturaEnum.FORTE,
          luta: ModificadorCriaturaEnum.FORTE,
          forca: ModificadorCriaturaEnum.MEDIO,
          vigor: ModificadorCriaturaEnum.MEDIO,
          sentidos: ModificadorCriaturaEnum.MEDIO,
          intelecto: ModificadorCriaturaEnum.FRACO,
          medicina: ModificadorCriaturaEnum.FRACO,
          vontade: ModificadorCriaturaEnum.FRACO,
          pontaria: ModificadorCriaturaEnum.FRAGIL,
          social: ModificadorCriaturaEnum.FRAGIL,
        },
        tenacidade: TenacidadeEnum.PADRAO,
        vidaMaxima: 1050,
        vidaAtual: 1050,
        defesa: 30,
        resistencias: [
          { tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 36 },
          { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 16 },
        ],
        fraquezas: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: null, valor: 26 }],
        porte: PorteCriaturaEnum.MEDIO,
        deslocamento: { terrestre: 9 },
        cadencia: CadenciaEnum.SINGULAR,
        ataques: [
          {
            nome: 'Pancada',
            teste: '5d20kh1+12',
            custoAcao: CustoAcaoEnum.MOVIMENTO,
            dano: '3D12+4',
            danoCritico: '6D12+8',
            area: false,
          },
          {
            nome: 'Esmagamento',
            teste: '5d20kh1+12',
            custoAcao: CustoAcaoEnum.PADRAO,
            dano: '4D12+10',
            danoCritico: '8D12+20',
            area: false,
            efeito: 'O alvo realiza um teste de Vigor (DT 20) ou fica Imobilizado por 1 turno.',
          },
        ],
        habilidades: [
          {
            nome: 'Imobilidade Absoluta',
            tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
            descricao:
              'Enquanto ao menos um agente mantiver contato visual direto com a criatura, ela não pode se mover, ' +
              'atacar ou usar habilidades de nenhum tipo. Dano, condições e efeitos externos continuam a afetá-la normalmente.',
          },
          {
            nome: 'Velocidade Impossível',
            tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
            descricao:
              'Quando não está sendo observada, a criatura ignora o custo de Ação de Movimento para se deslocar.',
          },
          {
            nome: 'Ruptura de Observação',
            tipo: HabilidadeTipoCriaturaEnum.GATILHO,
            descricao:
              'Quando o número de agentes com contato visual direto com a criatura cai para zero por qualquer ' +
              'motivo, ela age imediatamente fora da ordem de iniciativa com uma Ação Padrão.',
          },
        ],
      },
    },
    {
      campanha: 'campanha-matheus',
      usuario: 'matheus',
      tipo: TipoFichaEnum.CRIATURA,
      nome: 'Enxame Ceifa-Drones',
      cor: '#94A3B8',
      dados: {
        identidade: {
          designacao: 'Enxame Ceifa-Drones',
          origem: OrigemCriaturaEnum.ORIGINAL,
          conceito:
            'Um enxame de pequenos drones autônomos que caça em grupo e se dispersa quando confrontado.',
          naturezaFisica:
            'Dezenas de drones metálicos do tamanho de um punho, movendo-se em formação sincronizada.',
          comportamento: ComportamentoCriaturaEnum.OPORTUNISTA,
          motivacao:
            'Eliminar qualquer alvo isolado identificado como ameaça pelos protocolos de enxame.',
          ganchoUnico:
            'Destruir uma unidade não reduz a ameaça — o enxame se redistribui instantaneamente.',
        },
        na: NivelAmeacaEnum.BAIXA,
        vd: 15,
        atributos: {
          forca: 1,
          destreza: 4,
          luta: 1,
          pontaria: 3,
          vigor: 2,
          intelecto: 2,
          medicina: 1,
          sentidos: 3,
          social: 0,
          vontade: 1,
        },
        modificadores: {
          destreza: ModificadorCriaturaEnum.FORTE,
          pontaria: ModificadorCriaturaEnum.FORTE,
          sentidos: ModificadorCriaturaEnum.MEDIO,
          vigor: ModificadorCriaturaEnum.MEDIO,
          intelecto: ModificadorCriaturaEnum.MEDIO,
          luta: ModificadorCriaturaEnum.FRACO,
          forca: ModificadorCriaturaEnum.FRACO,
          medicina: ModificadorCriaturaEnum.FRACO,
          vontade: ModificadorCriaturaEnum.FRAGIL,
          social: ModificadorCriaturaEnum.FRAGIL,
        },
        tenacidade: TenacidadeEnum.FRAGIL,
        vidaMaxima: 375,
        vidaAtual: 375,
        defesa: 22,
        resistencias: [
          { tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 8 },
          { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 10 },
        ],
        fraquezas: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: null, valor: 15 }],
        porte: PorteCriaturaEnum.MINUSCULO,
        deslocamento: { voador: 14 },
        cadencia: CadenciaEnum.SINGULAR,
        ataques: [
          {
            nome: 'Rajada',
            teste: '3d20kh1+5',
            custoAcao: CustoAcaoEnum.MOVIMENTO,
            dano: '2D10',
            danoCritico: '4D10',
            area: false,
          },
          {
            nome: 'Enxurrada de Fragmentos',
            teste: '3d20kh1+5',
            custoAcao: CustoAcaoEnum.PADRAO,
            dano: '2D12+6',
            danoCritico: '4D12+12',
            area: true,
            efeito:
              'Todos os alvos num raio de 3m realizam um teste de Destreza (DT 15) ou ficam Sangrando por 1 turno.',
          },
        ],
        habilidades: [
          {
            nome: 'Enxame Distribuído',
            tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
            descricao:
              'A perda de unidades individuais do enxame não reduz seus atributos, ataques ou Vida Máxima — ' +
              'só a Vida Atual registra o desgaste acumulado.',
          },
          {
            nome: 'Dispersão Evasiva',
            tipo: HabilidadeTipoCriaturaEnum.GATILHO,
            descricao:
              'Quando sofre dano de Área pela primeira vez numa cena, o enxame se dispersa e ganha +10 de ' +
              'Defesa até o fim do turno seguinte.',
          },
        ],
      },
    },
    {
      campanha: 'campanha-codex',
      usuario: 'codex',
      tipo: TipoFichaEnum.CRIATURA,
      nome: 'O Colecionador de Rostos',
      cor: '#7C2D12',
      dados: {
        identidade: {
          designacao: 'O Colecionador de Rostos',
          origem: OrigemCriaturaEnum.ORIGINAL,
          conceito:
            'Um predador humanoide que usa rostos arrancados de vítimas como máscaras para se aproximar de novos alvos.',
          naturezaFisica:
            'Humanoide magro e alto, pele cinzenta, rosto sem feições sob a máscara mais recente.',
          comportamento: ComportamentoCriaturaEnum.CACADORA,
          motivacao:
            'Colecionar rostos de vítimas para ampliar seu repertório de disfarces e se aproximar de comunidades isoladas.',
          ganchoUnico: 'Pode assumir a aparência e a voz de qualquer rosto que já colecionou.',
          temaHorror:
            'Identidade roubada, confiança traída, o rosto familiar que já não é quem parece.',
        },
        na: NivelAmeacaEnum.ALTA,
        vd: 45,
        atributos: {
          forca: 4,
          destreza: 5,
          luta: 5,
          pontaria: 2,
          vigor: 4,
          intelecto: 3,
          medicina: 1,
          sentidos: 4,
          social: 2,
          vontade: 3,
        },
        modificadores: {
          luta: ModificadorCriaturaEnum.FORTE,
          destreza: ModificadorCriaturaEnum.FORTE,
          vigor: ModificadorCriaturaEnum.MEDIO,
          forca: ModificadorCriaturaEnum.MEDIO,
          sentidos: ModificadorCriaturaEnum.MEDIO,
          intelecto: ModificadorCriaturaEnum.FRACO,
          vontade: ModificadorCriaturaEnum.FRACO,
          social: ModificadorCriaturaEnum.FRACO,
          pontaria: ModificadorCriaturaEnum.FRAGIL,
          medicina: ModificadorCriaturaEnum.FRAGIL,
        },
        tenacidade: TenacidadeEnum.ROBUSTA,
        vidaMaxima: 2475,
        vidaAtual: 2475,
        defesa: 37,
        resistencias: [
          { tipo: TipoDanoEnum.FISICO, subtipo: null, valor: 40 },
          { tipo: TipoDanoEnum.BALISTICO, subtipo: null, valor: 20 },
        ],
        fraquezas: [{ tipo: TipoDanoEnum.EXPLOSAO, subtipo: null, valor: 32 }],
        porte: PorteCriaturaEnum.GRANDE,
        deslocamento: { terrestre: 14 },
        cadencia: CadenciaEnum.SINGULAR,
        ataques: [
          {
            nome: 'Garras Longas',
            teste: '5d20kh1+20',
            custoAcao: CustoAcaoEnum.MOVIMENTO,
            dano: '5D12+4',
            danoCritico: '10D12+8',
            area: false,
          },
          {
            nome: 'Investida Predatória',
            teste: '5d20kh1+20',
            custoAcao: CustoAcaoEnum.PADRAO,
            dano: '6D12+18',
            danoCritico: '12D12+36',
            area: false,
            efeito: 'O alvo realiza um teste de Vigor (DT 25) ou fica Atordoado por 1 turno.',
          },
        ],
        habilidades: [
          {
            nome: 'Camuflagem de Rostos',
            tipo: HabilidadeTipoCriaturaEnum.PASSIVA,
            descricao:
              'Enquanto usa uma máscara de rosto colecionado, é tratado como um humano comum por qualquer ' +
              'teste de Sentidos que não busque especificamente por ele.',
          },
          {
            nome: 'Arrancar Face',
            tipo: HabilidadeTipoCriaturaEnum.ATIVA,
            descricao:
              'Contra um alvo Imobilizado ou Inconsciente, arranca seu rosto e passa a poder usá-lo como nova máscara.',
            restricao: 'uma vez por cena',
          },
          {
            nome: 'Fúria ao Ser Reconhecido',
            tipo: HabilidadeTipoCriaturaEnum.GATILHO,
            descricao:
              'Quando um agente identifica corretamente que está usando uma máscara, ganha uma Ação Padrão ' +
              'extra imediata contra esse agente.',
          },
        ],
      },
    },
  ],
} as const satisfies {
  readonly usuarios: readonly DefinicaoUsuarioDev[];
  readonly campanhas: readonly DefinicaoCampanhaDev[];
  readonly membros: readonly DefinicaoMembroDev[];
  readonly fichas: readonly DefinicaoFichaDev[];
  readonly criaturas: readonly DefinicaoCriaturaDev[];
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
