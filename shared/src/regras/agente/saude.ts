import { ClasseEnum } from '../../enums';
import { EnergiaCalcularDto, LimiteEnergiaCalcularDto, VidaCalcularDto } from './agente.dtos';

/**
 * Coeficientes de saúde por classe. Vida e Energia seguem a mesma forma:
 *
 *   Vida    = (vidaBase    + Vigor    × vidaPorVigor)    + Nível × (vidaPorNivel    + Vigor    × vidaPorNivelVigor)
 *   Energia = (energiaBase + Destreza × energiaPorDestreza) + Nível × (energiaPorNivel + Destreza × energiaPorNivelDestreza)
 *
 * Fonte: docs/core/sistema-v4.1.0.md — blocos "⬦ Saúde"/"⬦ Progressão por Nível"
 * de cada classe e "Jogando como um Civil" > "Saúde". Sem divergências vs
 * `contratados-calculadora/src/script.js`.
 */
interface CoeficientesSaude {
  readonly vidaBase: number;
  readonly vidaPorVigor: number;
  readonly vidaPorNivel: number;
  readonly vidaPorNivelVigor: number;
  readonly energiaBase: number;
  readonly energiaPorDestreza: number;
  readonly energiaPorNivel: number;
  readonly energiaPorNivelDestreza: number;
}

const SAUDE_POR_CLASSE: Readonly<Record<ClasseEnum, CoeficientesSaude>> = {
  [ClasseEnum.COMBATENTE]: {
    vidaBase: 30, vidaPorVigor: 4, vidaPorNivel: 7, vidaPorNivelVigor: 2,
    energiaBase: 15, energiaPorDestreza: 2, energiaPorNivel: 4, energiaPorNivelDestreza: 2,
  },
  [ClasseEnum.ESPECIALISTA]: {
    vidaBase: 20, vidaPorVigor: 3, vidaPorNivel: 4, vidaPorNivelVigor: 2,
    energiaBase: 22, energiaPorDestreza: 3, energiaPorNivel: 7, energiaPorNivelDestreza: 2,
  },
  [ClasseEnum.SUPORTE]: {
    vidaBase: 25, vidaPorVigor: 3, vidaPorNivel: 5, vidaPorNivelVigor: 2,
    energiaBase: 18, energiaPorDestreza: 2, energiaPorNivel: 6, energiaPorNivelDestreza: 2,
  },
  [ClasseEnum.EXPERIMENTO_BESTIAL]: {
    vidaBase: 30, vidaPorVigor: 5, vidaPorNivel: 9, vidaPorNivelVigor: 2,
    energiaBase: 22, energiaPorDestreza: 2, energiaPorNivel: 5, energiaPorNivelDestreza: 2,
  },
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]: {
    vidaBase: 27, vidaPorVigor: 3, vidaPorNivel: 5, vidaPorNivelVigor: 2,
    energiaBase: 22, energiaPorDestreza: 4, energiaPorNivel: 9, energiaPorNivelDestreza: 2,
  },
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: {
    vidaBase: 25, vidaPorVigor: 4, vidaPorNivel: 7, vidaPorNivelVigor: 2,
    energiaBase: 18, energiaPorDestreza: 3, energiaPorNivel: 7, energiaPorNivelDestreza: 2,
  },
  [ClasseEnum.CIVIL]: {
    vidaBase: 10, vidaPorVigor: 1, vidaPorNivel: 0, vidaPorNivelVigor: 1,
    energiaBase: 5, energiaPorDestreza: 2, energiaPorNivel: 0, energiaPorNivelDestreza: 1,
  },
};

/** Se a classe é Civil (regras de saúde/defesa/etc. próprias). */
function ehCivil(classe: ClasseEnum): boolean {
  return classe === ClasseEnum.CIVIL;
}

/**
 * Vida máxima do agente para a classe, Nível e Vigor informados. Aumentos de
 * Vigor são retroativos (já embutido na fórmula: cada Nível soma `Vigor × 2`).
 */
export function calcularVida(dto: VidaCalcularDto): number {
  const coeficientes = SAUDE_POR_CLASSE[dto.classe];
  const vida =
    coeficientes.vidaBase +
    dto.vigor * coeficientes.vidaPorVigor +
    dto.nivel * (coeficientes.vidaPorNivel + dto.vigor * coeficientes.vidaPorNivelVigor);
  return Math.floor(vida);
}

/**
 * Energia máxima do agente para a classe, Nível e Destreza informados. Aumentos
 * de Destreza são retroativos (cada Nível soma `Destreza × 2`).
 */
export function calcularEnergia(dto: EnergiaCalcularDto): number {
  const coeficientes = SAUDE_POR_CLASSE[dto.classe];
  const energia =
    coeficientes.energiaBase +
    dto.destreza * coeficientes.energiaPorDestreza +
    dto.nivel * (coeficientes.energiaPorNivel + dto.destreza * coeficientes.energiaPorNivelDestreza);
  return Math.floor(energia);
}

/**
 * Limite de Energia: pontos que a Energia pode ser negativada antes de cada
 * penalidade. Destreza × 2 para agentes, apenas Destreza para Civis.
 *
 * Fonte: docs/core/sistema-v4.1.0.md — "Energia" > "Limites de Energia" e
 * "Jogando como um Civil" > "Informações Adicionais". Diverge de
 * `contratados-calculadora/src/script.js`, que usava `(Vigor + Destreza) × 2`
 * para agentes — o documento vence (proibição #27).
 */
export function calcularLimiteEnergia(dto: LimiteEnergiaCalcularDto): number {
  return ehCivil(dto.classe) ? dto.destreza : dto.destreza * 2;
}
