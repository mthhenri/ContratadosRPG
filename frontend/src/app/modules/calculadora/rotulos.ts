import {
  ItemCategoriaEnum,
  MotivoEntradaAgenteEnum,
  PatenteEnum,
} from '@contratados-rpg/shared/enums';

import { IconeNome } from '../../shared/icone/icone.component';

/**
 * Rótulos humanos (pt-BR) para os enums de conteúdo de jogo consumidos pelas páginas
 * `novo-agente` e `patente` da calculadora. É **formatação de UI** — a fonte da verdade dos
 * valores continua em `shared/regras` (enums SCREAMING_SNAKE_CASE); aqui só se traduz o
 * código do enum para o texto exibido, como o mapeamento `null`→"N/A" da aba `agente` (m1-07).
 * Os nomes de patente seguem os nomes completos do documento (docs/core/sistema-v4.1.0.md —
 * "Prestígio e Patentes"), não as abreviações do site antigo ("FT Especial"/"Op. Especiais").
 */
export const ROTULOS_PATENTE: Readonly<Record<PatenteEnum, string>> = {
  [PatenteEnum.AGENTE]: 'Agente',
  [PatenteEnum.OPERADOR]: 'Operador',
  [PatenteEnum.EXPERIENTE]: 'Experiente',
  [PatenteEnum.VETERANO]: 'Veterano',
  [PatenteEnum.FORCA_TAREFA]: 'Força Tarefa',
  [PatenteEnum.FORCA_TAREFA_ESPECIAL]: 'Força Tarefa Especial',
  [PatenteEnum.OPERACOES_ESPECIAIS]: 'Operações Especiais',
  [PatenteEnum.LIDER_OPERACIONAL]: 'Líder Operacional',
};

/**
 * Rótulos das opções do `<select>` de motivo de entrada da aba `novo-agente`. Paridade com as
 * opções do site antigo, com o texto ajustado para os nomes do documento (sucessor
 * convencional / sucessor Experimento — ver `MotivoEntradaAgenteEnum`).
 */
export const ROTULOS_MOTIVO_ENTRADA: Readonly<Record<MotivoEntradaAgenteEnum, string>> = {
  [MotivoEntradaAgenteEnum.MORTE_OU_INICIO_DO_ZERO]: 'Morte / Entrada do zero',
  [MotivoEntradaAgenteEnum.APOSENTADORIA]: 'Aposentadoria',
  [MotivoEntradaAgenteEnum.EXPERIMENTO_SUCESSOR_CONVENCIONAL]:
    'Experimento (subclasse) — sucessor convencional',
  [MotivoEntradaAgenteEnum.EXPERIMENTO_SUCESSOR_EXPERIMENTO]:
    'Experimento (subclasse) — sucessor Experimento',
  [MotivoEntradaAgenteEnum.CONTIDO_OU_EXTERMINADO_SUCESSOR_CONVENCIONAL]:
    'Contido / Exterminado — sucessor convencional',
  [MotivoEntradaAgenteEnum.CONTIDO_OU_EXTERMINADO_SUCESSOR_EXPERIMENTO]:
    'Contido / Exterminado — sucessor Experimento',
};

/**
 * Ícone de linha de cada categoria do catálogo de compras. **Formatação de UI** — substitui os
 * emojis do `CATALOGO_CATEGORIAS` do site antigo (`⚔ 🎯 …`), proibidos pelo tema "Terminal de
 * Contenção", por glifos monocromáticos do componente `Icone`.
 */
export const ICONES_CATEGORIA: Readonly<Record<ItemCategoriaEnum, IconeNome>> = {
  [ItemCategoriaEnum.CORPO_A_CORPO]: 'corpo-a-corpo',
  [ItemCategoriaEnum.EXPLOSIVOS]: 'explosivos',
  [ItemCategoriaEnum.ARMAS_DE_FOGO]: 'armas-de-fogo',
  [ItemCategoriaEnum.MUNICOES]: 'municoes',
  [ItemCategoriaEnum.PROTECOES]: 'protecoes',
  [ItemCategoriaEnum.EXOTICOS]: 'exoticos',
  [ItemCategoriaEnum.ARMAZENAMENTO]: 'armazenamento',
  [ItemCategoriaEnum.OPERACIONAL]: 'operacional',
  [ItemCategoriaEnum.MEDICINAL]: 'medicinal',
  [ItemCategoriaEnum.AMPLIFICADOR]: 'amplificador',
};
