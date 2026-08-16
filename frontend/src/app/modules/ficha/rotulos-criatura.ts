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

/**
 * Quebra um rótulo composto `"Nome (detalhe)"` em suas duas partes. Tenacidade, Porte e Cadência
 * carregam o número/dimensão entre parênteses no próprio rótulo, mas o mockup
 * (`docs/design/examples/ficha-de-criatura.html`) mostra as duas partes com pesos diferentes
 * ("Resiliente" grande + "×35" apagado; "Porte Médio" no chip + "1×1m" na dica) — derivar do mapa
 * existente evita uma segunda tabela que possa divergir da primeira.
 */
const separarRotulo = (rotulo: string): { readonly nome: string; readonly detalhe: string | null } => {
  const partes = /^(.*?)\s*\(([^)]*)\)$/.exec(rotulo);
  return partes ? { nome: partes[1], detalhe: partes[2] } : { nome: rotulo, detalhe: null };
};

export const rotuloOrigemCriatura = (valor: OrigemCriaturaEnum): string => ROTULO_ORIGEM[valor];
export const rotuloComportamento = (valor: ComportamentoCriaturaEnum): string => ROTULO_COMPORTAMENTO[valor];
export const rotuloNivelAmeaca = (valor: NivelAmeacaEnum): string => ROTULO_NA[valor];
export const rotuloTenacidade = (valor: TenacidadeEnum): string => ROTULO_TENACIDADE[valor];
export const rotuloPorte = (valor: PorteCriaturaEnum): string => ROTULO_PORTE[valor];
export const rotuloCadencia = (valor: CadenciaEnum): string => ROTULO_CADENCIA[valor];
export const rotuloModificadorCriatura = (valor: ModificadorCriaturaEnum): string => ROTULO_MODIFICADOR[valor];
export const rotuloCustoAcao = (valor: CustoAcaoEnum): string => ROTULO_CUSTO_ACAO[valor];
/** "Padrão" de `"Ação Padrão"` — forma curta usada nos selos do card de Ataque, onde o prefixo
 * "Ação" se repetiria em todos e só ocuparia largura (o rótulo inteiro fica no formulário). */
export const rotuloCustoAcaoCurto = (valor: CustoAcaoEnum): string =>
  ROTULO_CUSTO_ACAO[valor].replace(/^Ação\s+/, '');
export const rotuloHabilidadeTipoCriatura = (valor: HabilidadeTipoCriaturaEnum): string =>
  ROTULO_HABILIDADE_TIPO[valor];
export const rotuloRegeneracaoIntensidade = (valor: RegeneracaoIntensidadeEnum): string =>
  ROTULO_REGENERACAO_INTENSIDADE[valor];
export const rotuloRegeneracaoModo = (valor: RegeneracaoModoEnum): string => ROTULO_REGENERACAO_MODO[valor];

/** "Padrão" de `"Padrão (×35)"` — o nome da Tenacidade sem o multiplicador. */
export const nomeTenacidade = (valor: TenacidadeEnum): string => separarRotulo(ROTULO_TENACIDADE[valor]).nome;
/** "×35" de `"Padrão (×35)"` — o multiplicador de Vida da Tenacidade. */
export const multiplicadorTenacidade = (valor: TenacidadeEnum): string | null =>
  separarRotulo(ROTULO_TENACIDADE[valor]).detalhe;
/** "Médio" de `"Médio (1×1m)"` — o nome do Porte sem a dimensão. */
export const nomePorte = (valor: PorteCriaturaEnum): string => separarRotulo(ROTULO_PORTE[valor]).nome;
/** "1×1m" de `"Médio (1×1m)"` — a dimensão ocupada pelo Porte. */
export const dimensaoPorte = (valor: PorteCriaturaEnum): string | null =>
  separarRotulo(ROTULO_PORTE[valor]).detalhe;
/** "Singular" de `"Singular (1 turno/rodada)"` — o nome da Cadência sem o ritmo. */
export const nomeCadencia = (valor: CadenciaEnum): string => separarRotulo(ROTULO_CADENCIA[valor]).nome;
/** "1 turno/rodada" de `"Singular (1 turno/rodada)"` — o ritmo de turnos da Cadência. */
export const ritmoCadencia = (valor: CadenciaEnum): string | null =>
  separarRotulo(ROTULO_CADENCIA[valor]).detalhe;
