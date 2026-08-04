import { FragmentoModuloEnum } from '../../enums';

/**
 * Dados tipados de Fragmentos (m3-35/m3-42/m3-63/m3-64) — custo em Energia por módulo, os cardápios
 * de bônus do Potencializador "em um item" (5 opções, incluindo a de "N× valor máximo do maior
 * dado", `m3-63`) e "Consumido" (`m3-64`), a Afinidade e o Preço de Sanidade do Consumo. Conferidos
 * contra `docs/core/sistema-v4.1.0.md` — "⬡ Fragmentos" (⬥ Módulos, ⬥ Acoplamento, ⬥ Função >
 * Potencializador > Consumo de Fragmentos, ⬥ Afinidade com Fragmentos). Em conflito, o documento
 * vence (proibição #27).
 *
 * **Recorte (núcleo, decisão do autor):** o custo de Energia de adquirir/acoplar/remover, os dois
 * cardápios de bônus do Potencializador (em item e Consumido), a Afinidade e o Preço de Sanidade do
 * Consumo. Anomalia Biológica, Colapso, Redução de Módulo, Forja e a tabela de bônus fixos do
 * Construtor (arma/proteção por módulo, `m3-65`) ficam de fora — specs futuras.
 */

/**
 * Custo em Energia Máxima de **adquirir** (portar) um fragmento Potencializador — drena enquanto
 * ele estiver no inventário, cessa ao removê-lo (doc — "⬥ Módulos"). Um fragmento **Construtor**
 * custa o **dobro** deste valor (doc — "⬦ Construtor": "seu valor... é dobrado").
 */
export const CUSTO_ENERGIA_MAXIMA_MODULO: Readonly<Record<FragmentoModuloEnum, number>> = {
  [FragmentoModuloEnum.V]: 3,
  [FragmentoModuloEnum.IV]: 7,
  [FragmentoModuloEnum.III]: 12,
  [FragmentoModuloEnum.II]: 16,
  [FragmentoModuloEnum.I]: 20,
};

/** Uma opção do cardápio de bônus "em um item" do Potencializador para um módulo. */
export interface OpcaoBonusPotencializadorDados {
  readonly dadosBase: number;
  readonly dadoTeste: number;
  readonly valorFixo: number;
}

/**
 * Bônus "em um item" do Fragmento Potencializador por módulo (doc — tabela "⬦ Potencializador"):
 * `dadosBase` = "+N dados (efeito) ao dano" (mapeado a `DANO_DADOS_BASE`); `dadoTeste` = "+N dado(s)
 * no teste"; `valorFixo` = "+N no valor (de teste, efeito ou resistência)" — o jogador escolhe UM
 * dos três destinos do valor fixo na hora de aplicar.
 */
export const BONUS_POTENCIALIZADOR: Readonly<Record<FragmentoModuloEnum, OpcaoBonusPotencializadorDados>> = {
  [FragmentoModuloEnum.V]: { dadosBase: 2, dadoTeste: 1, valorFixo: 2 },
  [FragmentoModuloEnum.IV]: { dadosBase: 3, dadoTeste: 1, valorFixo: 3 },
  [FragmentoModuloEnum.III]: { dadosBase: 4, dadoTeste: 2, valorFixo: 5 },
  [FragmentoModuloEnum.II]: { dadosBase: 5, dadoTeste: 2, valorFixo: 7 },
  [FragmentoModuloEnum.I]: { dadosBase: 7, dadoTeste: 3, valorFixo: 10 },
};

/**
 * Multiplicador `N` da 5ª opção do cardápio "em um item" — "N× valor máximo do maior tipo de dado"
 * ao dano (doc — tabela "⬦ Potencializador": V=1×, IV=2×, III=3×, II=4×, I=5×; `m3-63`). Depende do
 * **alvo** escolhido (o maior dado do item), então fica fora de `BONUS_POTENCIALIZADOR` — só o
 * multiplicador é fixo por módulo, o valor final (`multiplicador × faces`) é resolvido em
 * `listarBonusFragmentoPotencializador`.
 */
export const MULTIPLICADOR_MAIOR_DADO_MODULO: Readonly<Record<FragmentoModuloEnum, number>> = {
  [FragmentoModuloEnum.V]: 1,
  [FragmentoModuloEnum.IV]: 2,
  [FragmentoModuloEnum.III]: 3,
  [FragmentoModuloEnum.II]: 4,
  [FragmentoModuloEnum.I]: 5,
};

/**
 * Valor de Afinidade que um único fragmento de `modulo` contribui (doc — "⬥ Afinidade com
 * Fragmentos": "Afinidade = 6 - Módulo"). Substituindo o numeral romano pelo seu valor (I=1 ...
 * V=5): conferido contra o exemplo do documento — 2 fragmentos de módulo V + 1 de módulo IV soma
 * (6-5) + (6-5) + (6-4) = 1 + 1 + 2 = 4 de afinidade. O mesmo valor reaparece no multiplicador da
 * sequela do Preço de Sanidade (doc — "Consumo de Fragmentos": "multiplicada por Módulo - 6", que,
 * resolvido pelo mesmo numeral, dá o exemplo do documento — módulo III, 3× mais forte).
 */
export const VALOR_AFINIDADE_MODULO: Readonly<Record<FragmentoModuloEnum, number>> = {
  [FragmentoModuloEnum.V]: 1,
  [FragmentoModuloEnum.IV]: 2,
  [FragmentoModuloEnum.III]: 3,
  [FragmentoModuloEnum.II]: 4,
  [FragmentoModuloEnum.I]: 5,
};

/**
 * Nome da sequela aplicada ao **consumir** um fragmento (doc — "⬦ Consumo de Fragmentos":
 * "a adição da sequela 'Rejeição Biológica'").
 */
export const SEQUELA_CONSUMO_FRAGMENTO = 'Rejeição Biológica';

/** Uma opção do cardápio de bônus "Consumido" do Potencializador para um módulo (m3-64). */
export interface OpcaoBonusConsumidoDados {
  /** "+N em todos os testes do atributo à escolha" — Módulo I soma também +1 ponto no atributo. */
  readonly teste: number;
  readonly defesa: number;
  readonly danoCorpo: number;
}

/**
 * Bônus "Consumido" do Fragmento Potencializador por módulo (doc — tabela "⬦ Potencializador",
 * coluna "Consumido"). Ao contrário do bônus "em item", este é do **agente**, permanente — o
 * fragmento é destruído ao ser consumido, não há como desfazer.
 */
export const BONUS_CONSUMIDO: Readonly<Record<FragmentoModuloEnum, OpcaoBonusConsumidoDados>> = {
  [FragmentoModuloEnum.V]: { teste: 1, defesa: 1, danoCorpo: 2 },
  [FragmentoModuloEnum.IV]: { teste: 2, defesa: 2, danoCorpo: 4 },
  [FragmentoModuloEnum.III]: { teste: 3, defesa: 3, danoCorpo: 6 },
  [FragmentoModuloEnum.II]: { teste: 5, defesa: 4, danoCorpo: 8 },
  [FragmentoModuloEnum.I]: { teste: 5, defesa: 5, danoCorpo: 10 },
};
