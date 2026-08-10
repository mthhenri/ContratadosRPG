import type { FichaHabilidadeDto } from '../../dtos/ficha';
import { ClasseEnum, HabilidadeCategoriaEnum } from '../../enums';

/**
 * Regra "Experimento com Peculiaridade perde a Origem" (m3-41; `docs/core/sistema-v4.1.0.md` —
 * "⬡ Subclasse"): as três subclasses de Experimento têm, no catálogo de Subclasse
 * (`shared/regras/agente/habilidades-catalogo.dados`), a habilidade "Peculiaridade" — "Ao criar seu
 * agente, escolha uma característica anômala, ela lhe concederá um bônus e uma penalidade
 * desconhecida **substituindo seus bônus originais de Origem**". Quando ela é tomada, a Origem
 * (Formação/Especialidade/Saber de Campo) deixa de existir para aquele agente.
 */

/** As três subclasses de Experimento (`docs/core/sistema-v4.1.0.md` — "⬡ Subclasse"). */
const CLASSES_EXPERIMENTO: readonly ClasseEnum[] = [
  ClasseEnum.EXPERIMENTO_BESTIAL,
  ClasseEnum.EXPERIMENTO_ARTIFICIAL,
  ClasseEnum.EXPERIMENTO_HIBRIDO,
];

/**
 * `true` quando `classe` é uma das três subclasses de Experimento (`docs/core/sistema-v4.1.0.md` —
 * "⬡ Subclasse"). Reusado pelo guia de criação para conceder a vaga garantida de Habilidade de
 * Subclasse mesmo no Nível 0 (m3-58 só concede vagas a partir do Nível 1).
 */
export function ehClasseExperimento(classe: ClasseEnum): boolean {
  return CLASSES_EXPERIMENTO.includes(classe);
}

/**
 * `true` quando `classe` é uma subclasse de Experimento **e** `habilidades` contém a "Peculiaridade"
 * de Subclasse — nesse caso a ficha não pode ter `identidade.origem` definida (`FichaService`
 * bloqueia salvar; o mini-editor de Origem trava no frontend, `ficha-visualizacao.component.ts`).
 */
export function experimentoComPeculiaridade(
  classe: ClasseEnum,
  habilidades: readonly FichaHabilidadeDto[],
): boolean {
  if (!ehClasseExperimento(classe)) {
    return false;
  }
  return habilidades.some(
    (habilidade) => habilidade.nome === 'Peculiaridade' && habilidade.categoria === HabilidadeCategoriaEnum.SUBCLASSE,
  );
}

/**
 * `true` quando `classe` é Experimento Artificial **e** `habilidades` contém a "Anomalia" de
 * Subclasse (`docs/core/sistema-v4.1.0.md` — "⬦ Habilidades de Subclasse": "Fragmentos custam o
 * dobro de Energia em seu uso, mas têm todos os seus efeitos dobrados"). Diferente de
 * `experimentoComPeculiaridade`, a habilidade só existe no catálogo de Artificial (`P-013`) — as
 * outras duas subclasses de Experimento não a têm, então não há por que checar `ehClasseExperimento`
 * aqui. Consumida por `shared/regras/compras/fragmento` (custo em Energia e cardápio de bônus do
 * Potencializador), que recebe o booleano já resolvido — mantém as funções de fragmento puras, sem
 * import de `identidade/`.
 */
export function experimentoComAnomalia(
  classe: ClasseEnum,
  habilidades: readonly FichaHabilidadeDto[],
): boolean {
  if (classe !== ClasseEnum.EXPERIMENTO_ARTIFICIAL) {
    return false;
  }
  return habilidades.some(
    (habilidade) => habilidade.nome === 'Anomalia' && habilidade.categoria === HabilidadeCategoriaEnum.SUBCLASSE,
  );
}
