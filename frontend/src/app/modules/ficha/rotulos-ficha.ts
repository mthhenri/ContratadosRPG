import { ArquetipoEnum, ClasseEnum } from '@contratados-rpg/shared/enums';
import { classeBaseDeHabilidades } from '@contratados-rpg/shared/regras/agente';
import type { CarrinhoItemDto } from '@contratados-rpg/shared/regras/compras';

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
 * Rótulo combinado "Classe - Arquétipo/Subclasse" para exibição compacta (mini-card da campanha).
 * Classe base com arquétipo: `"Combatente - Lutador"`. Subclasse Experimento: `"Combatente -
 * Experimento Bestial"` — a subclasse **é** daquela classe-base (`sistema-v4.1.0.md`, "Subclasse":
 * "abdicar de ganhar o seu arquétipo tornando a sua subclasse o seu arquétipo"; o vínculo
 * fixo Bestial→Combatente/Artificial→Especialista/Híbrido→Suporte já vem de
 * `classeBaseDeHabilidades`, a mesma fonte usada pelo seletor de habilidades — nenhum mapa
 * duplicado aqui). `CIVIL` (sem classe-base, sem arquétipo): só `"Civil"`.
 */
export function rotuloClasseCompleto(classe: ClasseEnum, arquetipo: ArquetipoEnum | null): string {
  const classeBase = classeBaseDeHabilidades(classe);
  if (classeBase !== null && classeBase !== classe) {
    return `${rotuloClasse(classeBase)} - ${rotuloClasse(classe)}`;
  }
  if (arquetipo === null) {
    return rotuloClasse(classe);
  }
  return `${rotuloClasse(classe)} - ${rotuloArquetipo(arquetipo)}`;
}

/**
 * Nome exibido de um item do inventário (m3-33): o **apelido** que o jogador deu à instância
 * (ex.: "Espada Excalibur"), ou o nome mecânico do catálogo quando não tem. Ponto único de
 * formatação — reusado pelo Inventário e, mais tarde, pelo seletor de Combos (`m3-37`).
 */
export function rotuloItem(item: Pick<CarrinhoItemDto, 'nome' | 'apelido'>): string {
  return item.apelido?.trim() || item.nome;
}
