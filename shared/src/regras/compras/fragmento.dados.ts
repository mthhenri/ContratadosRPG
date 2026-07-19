import { FragmentoModuloEnum } from '../../enums';

/**
 * Dados tipados de Fragmentos (m3-32) — custo em Energia por módulo e o cardápio de bônus do
 * Potencializador "em um item". Conferidos contra `docs/core/sistema-v4.1.0.md` — "⬡ Fragmentos"
 * (⬥ Módulos, ⬥ Acoplamento, ⬥ Função > Potencializador). Em conflito, o documento vence
 * (proibição #27).
 *
 * **Recorte desta task (núcleo, decisão do autor):** só o custo de Energia de
 * adquirir/acoplar/remover e o bônus "em um item" do Potencializador (a opção "N× valor máximo do
 * maior tipo de dado" fica de fora — depende de resolver o maior dado do item-alvo, uma primitiva
 * que ainda não existe em `shared/regras`). Afinidade, Anomalia Biológica, Colapso, Consumo com
 * Preço de Sanidade, Redução de Módulo, Forja e a tabela de bônus fixos do Construtor
 * (arma/proteção por módulo) ficam de fora — specs futuras.
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
