import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';

/**
 * Rótulos legíveis de classe/registro e arquétipo — mesma grafia dos `<select>` do formulário
 * (m3-06). Centralizados aqui para a exibição read-only (m3-07: lista e visualização) reusar sem
 * redefinir. Puro mapa de apresentação — não é regra de jogo.
 */

/** Rótulos legíveis das classes/registros. */
const ROTULO_CLASSE: Record<ClasseEnum, string> = {
  [ClasseEnum.COMBATENTE]: 'Combatente',
  [ClasseEnum.ESPECIALISTA]: 'Especialista',
  [ClasseEnum.SUPORTE]: 'Suporte',
  [ClasseEnum.EXPERIMENTO_BESTIAL]: 'Experimento Bestial',
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]: 'Experimento Artificial',
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: 'Experimento Híbrido',
  [ClasseEnum.CIVIL]: 'Civil',
};

/** Rótulos legíveis dos arquétipos. */
const ROTULO_ARQUETIPO: Record<ArquetipoEnum, string> = {
  [ArquetipoEnum.LUTADOR]: 'Lutador',
  [ArquetipoEnum.MERCENARIO]: 'Mercenário',
  [ArquetipoEnum.VANGUARDA]: 'Vanguarda',
  [ArquetipoEnum.ENGENHEIRO]: 'Engenheiro',
  [ArquetipoEnum.ASSASSINO]: 'Assassino',
  [ArquetipoEnum.ACADEMICO]: 'Acadêmico',
  [ArquetipoEnum.PARAMEDICO]: 'Paramédico',
  [ArquetipoEnum.DIPLOMATA]: 'Diplomata',
  [ArquetipoEnum.COMANDANTE]: 'Comandante',
};

/** Rótulo legível de uma classe/registro. */
export function rotuloClasse(classe: ClasseEnum): string {
  return ROTULO_CLASSE[classe];
}

/** Rótulo legível de um arquétipo. */
export function rotuloArquetipo(arquetipo: ArquetipoEnum): string {
  return ROTULO_ARQUETIPO[arquetipo];
}

/**
 * Subclasse de cada `EXPERIMENTO_*` — a subclasse, não o próprio arquétipo, ocupa o lugar do
 * arquétipo (`sistema-v4.1.0.md`, "Subclasse": "abdicar de ganhar o seu arquétipo tornando a sua
 * subclasse o seu arquétipo"). `ClasseEnum` funde classe+subclasse num só valor (proibição #21),
 * daí extrair aqui só a metade "Bestial/Artificial/Híbrido" para a exibição combinada.
 */
const SUBCLASSE_EXPERIMENTO: Partial<Record<ClasseEnum, string>> = {
  [ClasseEnum.EXPERIMENTO_BESTIAL]: 'Bestial',
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]: 'Artificial',
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: 'Híbrido',
};

/**
 * Rótulo combinado "Classe - Arquétipo/Subclasse" para exibição compacta (mini-card da campanha).
 * Classe base com arquétipo: `"Combatente - Lutador"`. Subclasse Experimento: `"Experimento -
 * Bestial"` (a subclasse é o complemento no lugar do arquétipo, não um nome de classe único).
 * `CIVIL` (sem arquétipo nem subclasse): só `"Civil"`.
 */
export function rotuloClasseCompleto(classe: ClasseEnum, arquetipo: ArquetipoEnum | null): string {
  const subclasse = SUBCLASSE_EXPERIMENTO[classe];
  if (subclasse) {
    return `Experimento - ${subclasse}`;
  }
  if (arquetipo === null) {
    return rotuloClasse(classe);
  }
  return `${rotuloClasse(classe)} - ${rotuloArquetipo(arquetipo)}`;
}
