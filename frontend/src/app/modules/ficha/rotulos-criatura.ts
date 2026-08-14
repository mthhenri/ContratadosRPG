import {
  CadenciaEnum,
  ComportamentoCriaturaEnum,
  CustoAcaoEnum,
  HabilidadeTipoCriaturaEnum,
  ModificadorCriaturaEnum,
  NivelAmeacaEnum,
  OrigemCriaturaEnum,
  PorteCriaturaEnum,
  RegeneracaoIntensidadeEnum,
  RegeneracaoModoEnum,
  TenacidadeEnum,
} from '@contratados-rpg/shared/enums';

/**
 * Rótulos legíveis dos enums de criatura (`m4-04`) — mesma grafia de `docs/core/guia_de_mestre-
 * v4.0.0.md` — "Guia de Criação de Ameaças". Puro mapa de apresentação, sem regra de jogo (mesmo
 * papel de `rotulos-ficha.ts` para o guia de jogador). `TipoDanoEnum` não precisa de mapa — seus
 * valores já são a grafia legível ("Físico", "Balístico"...).
 */

const ROTULO_ORIGEM: Record<OrigemCriaturaEnum, string> = {
  [OrigemCriaturaEnum.SCP_ADAPTADO]: 'SCP Adaptado',
  [OrigemCriaturaEnum.ORIGINAL]: 'Criação Original',
};

const ROTULO_COMPORTAMENTO: Record<ComportamentoCriaturaEnum, string> = {
  [ComportamentoCriaturaEnum.CACADORA]: 'Caçadora',
  [ComportamentoCriaturaEnum.TERRITORIAL]: 'Territorial',
  [ComportamentoCriaturaEnum.OPORTUNISTA]: 'Oportunista',
  [ComportamentoCriaturaEnum.INDIFERENTE]: 'Indiferente',
  [ComportamentoCriaturaEnum.INTELIGENTE]: 'Inteligente',
  [ComportamentoCriaturaEnum.CAOTICA]: 'Caótica',
};

const ROTULO_NA: Record<NivelAmeacaEnum, string> = {
  [NivelAmeacaEnum.NULA]: 'Nula',
  [NivelAmeacaEnum.BAIXA]: 'Baixa',
  [NivelAmeacaEnum.MEDIA]: 'Média',
  [NivelAmeacaEnum.ALTA]: 'Alta',
  [NivelAmeacaEnum.EXTREMA]: 'Extrema',
  [NivelAmeacaEnum.CATASTROFICA]: 'Catastrófica',
  [NivelAmeacaEnum.APOCALIPTICA]: 'Apocalíptica',
};

const ROTULO_TENACIDADE: Record<TenacidadeEnum, string> = {
  [TenacidadeEnum.DESCARTAVEL]: 'Descartável (×10)',
  [TenacidadeEnum.FRAGIL]: 'Frágil (×25)',
  [TenacidadeEnum.PADRAO]: 'Padrão (×35)',
  [TenacidadeEnum.ROBUSTA]: 'Robusta (×55)',
  [TenacidadeEnum.RESISTENTE]: 'Resistente (×75)',
  [TenacidadeEnum.IMPLACAVEL]: 'Implacável (×100)',
  [TenacidadeEnum.ABSOLUTA]: 'Absoluta (×120)',
};

const ROTULO_PORTE: Record<PorteCriaturaEnum, string> = {
  [PorteCriaturaEnum.MINUSCULO]: 'Minúsculo (< 1×1m)',
  [PorteCriaturaEnum.MEDIO]: 'Médio (1×1m)',
  [PorteCriaturaEnum.GRANDE]: 'Grande (2×2m)',
  [PorteCriaturaEnum.ENORME]: 'Enorme (3×3m)',
  [PorteCriaturaEnum.GIGANTE]: 'Gigante (5×5m)',
  [PorteCriaturaEnum.TITANICO]: 'Titânico (8×8m)',
  [PorteCriaturaEnum.COLOSSAL]: 'Colossal (12×12m+)',
};

const ROTULO_CADENCIA: Record<CadenciaEnum, string> = {
  [CadenciaEnum.SINGULAR]: 'Singular (1 turno/rodada)',
  [CadenciaEnum.DUPLA]: 'Dupla (2 turnos/rodada)',
  [CadenciaEnum.TRIPLICE]: 'Tríplice (3 turnos/rodada)',
  [CadenciaEnum.FRENETICA]: 'Frenética (4+ turnos/rodada)',
};

const ROTULO_MODIFICADOR: Record<ModificadorCriaturaEnum, string> = {
  [ModificadorCriaturaEnum.FORTE]: 'Forte',
  [ModificadorCriaturaEnum.MEDIO]: 'Médio',
  [ModificadorCriaturaEnum.FRACO]: 'Fraco',
  [ModificadorCriaturaEnum.FRAGIL]: 'Frágil',
};

const ROTULO_CUSTO_ACAO: Record<CustoAcaoEnum, string> = {
  [CustoAcaoEnum.MOVIMENTO]: 'Ação de Movimento',
  [CustoAcaoEnum.PADRAO]: 'Ação Padrão',
  [CustoAcaoEnum.COMPLETA]: 'Ação Completa',
};

const ROTULO_HABILIDADE_TIPO: Record<HabilidadeTipoCriaturaEnum, string> = {
  [HabilidadeTipoCriaturaEnum.PASSIVA]: 'Passiva',
  [HabilidadeTipoCriaturaEnum.ATIVA]: 'Ativa',
  [HabilidadeTipoCriaturaEnum.GATILHO]: 'De Gatilho',
};

const ROTULO_REGENERACAO_INTENSIDADE: Record<RegeneracaoIntensidadeEnum, string> = {
  [RegeneracaoIntensidadeEnum.RESIDUAL]: 'Residual',
  [RegeneracaoIntensidadeEnum.MODERADA]: 'Moderada',
  [RegeneracaoIntensidadeEnum.ALTA]: 'Alta',
  [RegeneracaoIntensidadeEnum.SEVERA]: 'Severa',
  [RegeneracaoIntensidadeEnum.IMPARAVEL]: 'Imparável',
};

const ROTULO_REGENERACAO_MODO: Record<RegeneracaoModoEnum, string> = {
  [RegeneracaoModoEnum.PASSIVA]: 'Passiva',
  [RegeneracaoModoEnum.CONDICIONAL]: 'Condicional',
};

export const rotuloOrigemCriatura = (valor: OrigemCriaturaEnum): string => ROTULO_ORIGEM[valor];
export const rotuloComportamento = (valor: ComportamentoCriaturaEnum): string => ROTULO_COMPORTAMENTO[valor];
export const rotuloNivelAmeaca = (valor: NivelAmeacaEnum): string => ROTULO_NA[valor];
export const rotuloTenacidade = (valor: TenacidadeEnum): string => ROTULO_TENACIDADE[valor];
export const rotuloPorte = (valor: PorteCriaturaEnum): string => ROTULO_PORTE[valor];
export const rotuloCadencia = (valor: CadenciaEnum): string => ROTULO_CADENCIA[valor];
export const rotuloModificadorCriatura = (valor: ModificadorCriaturaEnum): string => ROTULO_MODIFICADOR[valor];
export const rotuloCustoAcao = (valor: CustoAcaoEnum): string => ROTULO_CUSTO_ACAO[valor];
export const rotuloHabilidadeTipoCriatura = (valor: HabilidadeTipoCriaturaEnum): string =>
  ROTULO_HABILIDADE_TIPO[valor];
export const rotuloRegeneracaoIntensidade = (valor: RegeneracaoIntensidadeEnum): string =>
  ROTULO_REGENERACAO_INTENSIDADE[valor];
export const rotuloRegeneracaoModo = (valor: RegeneracaoModoEnum): string => ROTULO_REGENERACAO_MODO[valor];
