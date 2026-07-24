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
 * `true` quando `classe` é uma subclasse de Experimento **e** `habilidades` contém a "Peculiaridade"
 * de Subclasse — nesse caso a ficha não pode ter `identidade.origem` definida (`FichaService`
 * bloqueia salvar; o mini-editor de Origem trava no frontend, `ficha-visualizacao.component.ts`).
 */
export function experimentoComPeculiaridade(
  classe: ClasseEnum,
  habilidades: readonly FichaHabilidadeDto[],
): boolean {
  if (!CLASSES_EXPERIMENTO.includes(classe)) {
    return false;
  }
  return habilidades.some(
    (habilidade) => habilidade.nome === 'Peculiaridade' && habilidade.categoria === HabilidadeCategoriaEnum.SUBCLASSE,
  );
}
