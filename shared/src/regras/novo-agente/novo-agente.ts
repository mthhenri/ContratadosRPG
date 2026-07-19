import { MotivoEntradaAgenteEnum } from '../../enums';
import { PATENTES } from '../dados';
import { obterPatente } from '../patente';
import { rolarDados } from '../descanso';
import {
  BonusMonetarioCalcularDto,
  BonusMonetarioDto,
  DinheiroInicialCalcularDto,
  DinheiroInicialDto,
  NivelInicialCalcularDto,
  NovoAgenteCalcularDto,
  NovoAgenteDto,
  PrestigioInicialCalcularDto,
  PrestigioInicialDto,
} from './novo-agente.dtos';

/**
 * Regras de dedução de Prestígio por motivo de entrada:
 *
 * - `divisor` — reduz 1 ponto da média a cada `divisor` pontos (dedução
 *   `⌊média ÷ divisor⌋`).
 * - `permitePatenteAbaixo` — o piso do Prestígio pode cair até o mínimo da
 *   patente imediatamente inferior à da média do grupo (senão o piso é a própria
 *   patente da média).
 * - `recebeAmaldicoadoPeloPassado` — sucessores de Contenção ou Extermínio
 *   recebem a condição permanente Amaldiçoado pelo Passado.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Prestígio Inicial" (÷7 morte/início do
 * zero; ÷10 aposentadoria; ÷5 Experimento) e "Aposentadoria" > "Contido ou
 * Exterminado" (÷5 sucessor convencional; ÷3 sucessor Experimento; Amaldiçoado
 * pelo Passado em ambos). Divisores idênticos a `calcNovoAgente` do site antigo.
 */
interface MotivoEntradaDados {
  readonly divisor: number;
  readonly permitePatenteAbaixo: boolean;
  readonly recebeAmaldicoadoPeloPassado: boolean;
}

const MOTIVOS_ENTRADA: Readonly<Record<MotivoEntradaAgenteEnum, MotivoEntradaDados>> = {
  [MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO]: {
    divisor: 7,
    permitePatenteAbaixo: false,
    recebeAmaldicoadoPeloPassado: false,
  },
  [MotivoEntradaAgenteEnum.APOSENTADORIA]: {
    divisor: 10,
    permitePatenteAbaixo: false,
    recebeAmaldicoadoPeloPassado: false,
  },
  [MotivoEntradaAgenteEnum.EXPERIMENTO_SUCESSOR_CONVENCIONAL]: {
    divisor: 5,
    permitePatenteAbaixo: true,
    recebeAmaldicoadoPeloPassado: false,
  },
  [MotivoEntradaAgenteEnum.EXPERIMENTO_SUCESSOR_EXPERIMENTO]: {
    divisor: 3,
    permitePatenteAbaixo: true,
    recebeAmaldicoadoPeloPassado: false,
  },
  [MotivoEntradaAgenteEnum.CONTIDO_OU_EXTERMINADO_SUCESSOR_CONVENCIONAL]: {
    divisor: 5,
    permitePatenteAbaixo: true,
    recebeAmaldicoadoPeloPassado: true,
  },
  [MotivoEntradaAgenteEnum.CONTIDO_OU_EXTERMINADO_SUCESSOR_EXPERIMENTO]: {
    divisor: 3,
    permitePatenteAbaixo: true,
    recebeAmaldicoadoPeloPassado: true,
  },
};

/**
 * Nível inicial de um novo agente: arredonda a média de Nível do esquadrão para
 * o inteiro mais próximo (0,5 para cima) e subtrai 1, com mínimo 0.
 *
 * `Math.round` arredonda 0,5 para cima (em direção a +∞), o que equivale à regra
 * do documento para médias não-negativas.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Nível Inicial". Ex.: média 5,0 → 4.
 */
export function calcularNivelInicial(dto: NivelInicialCalcularDto): number {
  return Math.max(0, Math.round(dto.mediaNivel) - 1);
}

/**
 * Prestígio inicial de um novo agente: aplica a dedução escalada do motivo sobre
 * a média de Prestígio do esquadrão, com piso na patente correspondente.
 *
 *   dedução  = ⌊média ÷ divisor⌋
 *   prestígio = ⌊média − dedução⌋, limitado ao mínimo de `patenteCapMinimo`
 *
 * O piso nunca deixa o Prestígio cair abaixo da patente da média do grupo —
 * exceto nos motivos que permitem iniciar uma patente abaixo (Experimento /
 * Contido ou Exterminado), quando o piso é o mínimo da patente imediatamente
 * inferior.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Prestígio Inicial" e "Contido ou
 * Exterminado". Espelha `calcNovoAgente` do site antigo.
 */
export function calcularPrestigioInicial(dto: PrestigioInicialCalcularDto): PrestigioInicialDto {
  const regra = MOTIVOS_ENTRADA[dto.motivo];

  const deducao = Math.floor(dto.mediaPrestigio / regra.divisor);
  const prestigioAntesDoPiso = Math.floor(dto.mediaPrestigio - deducao);

  const patenteGrupo = obterPatente({ prestigio: Math.floor(dto.mediaPrestigio) });
  const indicePatenteGrupo = PATENTES.findIndex((patente) => patente.patente === patenteGrupo.patente);
  const patenteCapMinimo =
    regra.permitePatenteAbaixo && indicePatenteGrupo > 0
      ? PATENTES[indicePatenteGrupo - 1]
      : patenteGrupo;

  const prestigioInicial = Math.max(prestigioAntesDoPiso, patenteCapMinimo.prestigioMinimo);

  return {
    prestigioInicial,
    divisor: regra.divisor,
    deducao,
    patenteGrupo,
    patenteCapMinimo,
  };
}

/**
 * Bônus monetário do novo agente: `Prestígio Inicial × (500 × Multiplicador da
 * Patente)`. O multiplicador começa em 1× na patente Agente e sobe 0,5× por
 * patente. Não soma o dinheiro inicial padrão (1000 + 4D4 × 250), aleatório.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Bônus Monetário". Ex.: Prestígio 24 na
 * Força Tarefa (3×) → 24 × (500 × 3) = 36.000. Espelha `calcBonus` do site antigo.
 */
export function calcularBonusMonetario(dto: BonusMonetarioCalcularDto): BonusMonetarioDto {
  const patente = obterPatente({ prestigio: dto.prestigioInicial });
  return {
    bonus: dto.prestigioInicial * (500 * patente.multiplicador),
    patente,
  };
}

/**
 * Dinheiro inicial a partir de uma soma de 4D4 **já rolada** — função pura, sem aleatoriedade
 * (mesma separação de `calcularResultadoDescanso`/`rolarDados`).
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Iniciando um Novo Agente" > "Dinheiro Inicial".
 */
export function calcularDinheiroInicial(dto: DinheiroInicialCalcularDto): DinheiroInicialDto {
  return { dinheiro: 1000 + dto.somaDados * 250, somaDados: dto.somaDados };
}

/**
 * Rola o dinheiro inicial (`1000 + 4D4 × 250`): rola os 4D4 via `rolarDados` (a utilidade
 * explícita de rolagem, única brecha a `Math.random` no motor — SYSTEM.SPEC §6.6) e aplica
 * `calcularDinheiroInicial`. Faixa: $2.000 (4×1) a $5.000 (4×4).
 */
export function rolarDinheiroInicial(): DinheiroInicialDto {
  const somaDados = rolarDados({ quantidade: 4, faces: 4 }).reduce((soma, valor) => soma + valor, 0);
  return calcularDinheiroInicial({ somaDados });
}

/**
 * Resultado completo da aba novo agente: Nível inicial, Prestígio inicial (com
 * detalhamento e piso de patente), patente resultante, bônus monetário e se
 * recebe a condição Amaldiçoado pelo Passado.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Iniciando um Novo Agente".
 */
export function calcularNovoAgente(dto: NovoAgenteCalcularDto): NovoAgenteDto {
  const prestigio = calcularPrestigioInicial({ motivo: dto.motivo, mediaPrestigio: dto.mediaPrestigio });

  return {
    nivelInicial: calcularNivelInicial({ mediaNivel: dto.mediaNivel }),
    prestigio,
    patenteResultante: obterPatente({ prestigio: prestigio.prestigioInicial }),
    bonus: calcularBonusMonetario({ prestigioInicial: prestigio.prestigioInicial }),
    recebeAmaldicoadoPeloPassado: MOTIVOS_ENTRADA[dto.motivo].recebeAmaldicoadoPeloPassado,
  };
}
