import type { FichaAtributosDto } from '../../dtos/ficha';
import type { AmplificadorAplicadoDto } from '../compras';

/**
 * Efeito mecânico dos Amplificadores (`docs/core/sistema-v4.1.0.md` — "⬡ Amplificadores"). Um
 * amplificador é "muito similar à modificação" (doc) — assim como uma modificação de item, seu
 * **bônus principal escala linearmente com os empilhamentos** (`valorPorEmpilhamento × empilhamentos`,
 * mesma regra de `Reforçada`/`Blindada` em `compras.ts`, mesmo quando a tabela não escreve "por
 * empilhamento" explicitamente — só a tabela de item escreve isso por extenso às vezes). **A partir
 * do 2º empilhamento**, soma-se ainda uma **penalidade que escala** com `empilhamentos − 1`
 * (clarificado pelo doc: "amplificadores que iniciam em ■■ já aplicam a penalidade... " — ou seja, a
 * contagem de empilhamento é sempre literal, mesmo quando a aquisição mínima já é 2). `Veloz` é a
 * única exceção onde o **próprio bônus** muda de ritmo depois do 1º empilhamento (doc: "+3 metros...
 * empilhamentos adicionais aumentam **apenas** em +1 metro" — o advérbio "apenas" marca o contraste
 * com a escala normal das demais).
 *
 * Funções puras, testáveis isoladamente — quem consome (frontend) soma o resultado **por cima** do
 * valor manual/calculado de cada stat, nunca escreve de volta no `derivados` (mesma filosofia do
 * "manual + equipamento" de `resistencia.ts`, que este módulo generaliza para as demais stats).
 */

/** Empilhamentos de um amplificador pelo nome — 0 se não portado. */
export function empilhamentosAmplificador(
  amplificadores: readonly AmplificadorAplicadoDto[],
  nome: string,
): number {
  return amplificadores.find((amplificador) => amplificador.nome === nome)?.empilhamentos ?? 0;
}

/** `valorPorEmpilhamento × empilhamentos` — o bônus principal do amplificador, escalando com os stacks. */
function bonusEscalado(
  amplificadores: readonly AmplificadorAplicadoDto[],
  nome: string,
  valorPorEmpilhamento: number,
): number {
  return valorPorEmpilhamento * empilhamentosAmplificador(amplificadores, nome);
}

/** `valorPorEmpilhamento × (empilhamentos − 1)` — penalidade que só passa a escalar do 2º empilhamento em diante. */
function penalidadeEscalada(
  amplificadores: readonly AmplificadorAplicadoDto[],
  nome: string,
  valorPorEmpilhamento: number,
): number {
  const empilhamentos = empilhamentosAmplificador(amplificadores, nome);
  return valorPorEmpilhamento * Math.max(0, empilhamentos - 1);
}

/**
 * Ajuste de **Defesa**: `Defesa` concede +1 por empilhamento; `Resistente` penaliza −1 por
 * empilhamento além do 1º (doc — "Resistente ... À partir do 2ª Empilhamento é aplicado -1 de
 * Defesa a cada empilhamento"). Pode negativar — sem piso (mesma liberdade de `montarResistencias`).
 */
export function ajusteDefesaAmplificadores(amplificadores: readonly AmplificadorAplicadoDto[]): number {
  return bonusEscalado(amplificadores, 'Defesa', 1) - penalidadeEscalada(amplificadores, 'Resistente', 1);
}

/** Ajuste de **Esquiva**: `Reflexos` concede +1 por empilhamento. */
export function ajusteEsquivaAmplificadores(amplificadores: readonly AmplificadorAplicadoDto[]): number {
  return bonusEscalado(amplificadores, 'Reflexos', 1);
}

/** Ajuste de **Bloqueio**: `Resiliência` concede +1 por empilhamento. */
export function ajusteBloqueioAmplificadores(amplificadores: readonly AmplificadorAplicadoDto[]): number {
  return bonusEscalado(amplificadores, 'Resiliência', 1);
}

/** Um amplificador que concede bônus escalável em dois testes de atributo e penaliza outros a partir do 2º empilhamento. */
interface EfeitoAtributoAmplificador {
  readonly nome: string;
  readonly bonus: readonly (keyof FichaAtributosDto)[];
  readonly valorBonusPorEmpilhamento: number;
  readonly penalidade: readonly (keyof FichaAtributosDto)[];
  readonly valorPenalidadePorEmpilhamento: number;
}

/** Os seis amplificadores que mexem em testes de atributo (doc — "⬡ Amplificadores"). */
const EFEITOS_ATRIBUTO: readonly EfeitoAtributoAmplificador[] = [
  { nome: 'Interpessoal', bonus: ['social', 'vontade'], valorBonusPorEmpilhamento: 2, penalidade: ['luta', 'pontaria'], valorPenalidadePorEmpilhamento: 1 },
  { nome: 'Muscular', bonus: ['luta', 'forca'], valorBonusPorEmpilhamento: 2, penalidade: ['intelecto'], valorPenalidadePorEmpilhamento: 1 },
  { nome: 'Precisão', bonus: ['pontaria', 'medicina'], valorBonusPorEmpilhamento: 2, penalidade: ['social'], valorPenalidadePorEmpilhamento: 1 },
  { nome: 'Reflexos', bonus: ['destreza'], valorBonusPorEmpilhamento: 1, penalidade: ['vigor'], valorPenalidadePorEmpilhamento: 1 },
  { nome: 'Resiliência', bonus: ['vigor'], valorBonusPorEmpilhamento: 1, penalidade: ['destreza'], valorPenalidadePorEmpilhamento: 1 },
  { nome: 'Sinapses', bonus: ['intelecto', 'sentidos'], valorBonusPorEmpilhamento: 2, penalidade: ['forca'], valorPenalidadePorEmpilhamento: 1 },
];

/**
 * Modificadores de teste por atributo vindos dos amplificadores portados — mesma semântica de
 * `FichaJogadorDadosDto.modificadoresTeste` ("somam direto na fórmula rolada, sem alterar o
 * atributo base"). Quem consome soma isto **por cima** do modificador manual já persistido, nunca
 * substitui (o jogador pode ter outros ajustes situacionais no mesmo campo).
 */
export function modificadoresTesteAmplificadores(
  amplificadores: readonly AmplificadorAplicadoDto[],
): Partial<Record<keyof FichaAtributosDto, number>> {
  const total: Partial<Record<keyof FichaAtributosDto, number>> = {};
  const somar = (atributo: keyof FichaAtributosDto, valor: number): void => {
    if (valor === 0) {
      return;
    }
    total[atributo] = (total[atributo] ?? 0) + valor;
  };

  EFEITOS_ATRIBUTO.forEach((efeito) => {
    const bonus = bonusEscalado(amplificadores, efeito.nome, efeito.valorBonusPorEmpilhamento);
    efeito.bonus.forEach((atributo) => somar(atributo, bonus));
    const penalidade = penalidadeEscalada(amplificadores, efeito.nome, efeito.valorPenalidadePorEmpilhamento);
    efeito.penalidade.forEach((atributo) => somar(atributo, -penalidade));
  });

  return total;
}

/**
 * Ajuste de **Deslocamento**: `Veloz` concede +3m no 1º empilhamento e +1m por empilhamento
 * adicional (única exceção com ritmo de escala diferente — doc: "Empilhamentos adicionais aumentam
 * apenas em +1 metro"); `Inventário` penaliza −1m por empilhamento além do 1º.
 */
export function ajusteDeslocamentoAmplificadores(amplificadores: readonly AmplificadorAplicadoDto[]): number {
  const empilhamentosVeloz = empilhamentosAmplificador(amplificadores, 'Veloz');
  const bonusVeloz = empilhamentosVeloz > 0 ? 3 + Math.max(0, empilhamentosVeloz - 1) : 0;
  return bonusVeloz - penalidadeEscalada(amplificadores, 'Inventário', 1);
}

/**
 * Ajuste de **Inventário** (base): `Inventário` concede +5 por empilhamento; `Veloz` penaliza −2
 * por empilhamento além do 1º.
 */
export function ajusteInventarioAmplificadores(amplificadores: readonly AmplificadorAplicadoDto[]): number {
  return bonusEscalado(amplificadores, 'Inventário', 5) - penalidadeEscalada(amplificadores, 'Veloz', 2);
}

/**
 * Marcos de **Dano Furtivo** (`+1D6+1` cada, mesma unidade de `incrementarDanoFurtivo`) vindos de
 * `Letalidade` — um marco por empilhamento.
 */
export function ajusteDanoFurtivoAmplificadores(amplificadores: readonly AmplificadorAplicadoDto[]): number {
  return bonusEscalado(amplificadores, 'Letalidade', 1);
}

/**
 * Ajuste de **Vida máxima**, multiplicado pelo Nível: `Vida` concede +1/Nível por empilhamento;
 * `Energia` penaliza −1/Nível por empilhamento além do 1º (doc — "a cada Nível a cada empilhamento").
 */
export function ajusteVidaAmplificadores(
  amplificadores: readonly AmplificadorAplicadoDto[],
  nivel: number,
): number {
  const bonus = bonusEscalado(amplificadores, 'Vida', 1);
  const penalidade = penalidadeEscalada(amplificadores, 'Energia', 1);
  return (bonus - penalidade) * nivel;
}

/**
 * Ajuste de **Energia máxima**, multiplicado pelo Nível: `Energia` concede +1/Nível por
 * empilhamento; `Vida` penaliza −1/Nível por empilhamento além do 1º.
 */
export function ajusteEnergiaAmplificadores(
  amplificadores: readonly AmplificadorAplicadoDto[],
  nivel: number,
): number {
  const bonus = bonusEscalado(amplificadores, 'Energia', 1);
  const penalidade = penalidadeEscalada(amplificadores, 'Vida', 1);
  return (bonus - penalidade) * nivel;
}

/**
 * Aplica o desconto de `Conservador` (−1 de Energia em custos de habilidades por empilhamento,
 * mínimo 1) a um custo de Energia. Custos que já são 0 (habilidades sem custo) ficam intactos — o
 * "mínimo 1" do doc só vale para habilidades que de fato custam Energia. `Conservador` só existe em
 * 0 ou 2 empilhamentos (`empilhamentosIniciais === empilhamentoMaximo === 2`), então na prática o
 * desconto ativo é sempre −2.
 */
export function aplicarReducaoCustoEnergia(
  amplificadores: readonly AmplificadorAplicadoDto[],
  custoEnergia: number,
): number {
  if (custoEnergia <= 0) {
    return custoEnergia;
  }
  const reducao = bonusEscalado(amplificadores, 'Conservador', 1);
  return Math.max(1, custoEnergia - reducao);
}
