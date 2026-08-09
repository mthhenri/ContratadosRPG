# Guia de criação — bônus de atributo "à escolha" no passo // Classe — design

## Problema

`obterBonusAtributos` (`shared/src/regras/agente/arquetipo.ts`) só concede a parte **fixa** e
determinística do "Atributos Bônus" de cada arquétipo/subclasse (doc — `sistema-v4.1.0.md`,
"⬡ Classes e Arquétipos" / "⬡ Subclasse"). Quatro perfis têm um ponto que o documento marca como
"à escolha" e que hoje **não existe em lugar nenhum do código**:

- **Engenheiro**: +1 Intelecto (fixo) — +1 em **Força ou Destreza** (escolha entre 2 opções).
- **Assassino**: +1 Destreza (fixo) — +1 em **Luta ou Pontaria** (escolha entre 2 opções).
- **Acadêmico**: +1 Intelecto (fixo) — +1 em **ESCOLHA** (qualquer atributo, exceto Luta ou
  Pontaria — livre entre 8 opções).
- **Experimento Híbrido** (subclasse): dois pontos, cada um **ESCOLHA** (exceto Luta ou Pontaria).
  As duas escolhas são independentes — o jogador pode repetir o mesmo atributo nas duas
  (empilhando +2 nele), confirmado como leitura correta do documento (não há "sem repetir" anotado
  nessa linha, ao contrário da habilidade "Mutável" da mesma subclasse, que anota explicitamente).

O comentário do próprio `arquetipo.ts` já previa isso: *"a distribuição da escolha fica com o
jogador"* — mas nenhuma tela captura essa escolha. Hoje, ao criar um agente com um desses quatro
perfis, o jogador simplesmente não recebe o ponto "à escolha": `bonusAtributos()`
(`criar.page.ts:136`) e `construirFichaInicial` (`ficha-padrao.ts:98`) usam só
`obterBonusAtributos`, que devolve exclusivamente o fixo.

## Escopo

Só o **guia de criação** (`criar.page.ts` / `criar.page.html`, passo `// Classe`) e o motor
`shared/src/regras/agente/arquetipo.ts`. Fora de escopo: o editor de ficha pós-criação
(`ficha-edicao.service.ts`, troca de arquétipo via `ajustarClasse`/m3-08) — continua só com o
bônus fixo, como hoje; nenhuma mudança na regra de jogo em si (o documento já define os slots,
aqui só implementamos a captura da escolha do jogador).

## 1. Motor de regras — `shared/src/regras/agente/arquetipo.ts`

Duas funções novas, ao lado da `obterBonusAtributos` existente (que **não muda** — continua
determinística, só o fixo):

```ts
/** Um "slot" de bônus à escolha: as chaves elegíveis para aquele ponto. */
export type SlotEscolhaAtributo = readonly (keyof FichaAtributosDto)[];

const TODOS_ATRIBUTOS: readonly (keyof FichaAtributosDto)[] = [
  'destreza', 'forca', 'luta', 'pontaria', 'vigor',
  'intelecto', 'medicina', 'sentidos', 'social', 'vontade',
];
const SEM_LUTA_OU_PONTARIA = TODOS_ATRIBUTOS.filter((a) => a !== 'luta' && a !== 'pontaria');

const SLOTS_ARQUETIPO: Partial<Record<ArquetipoEnum, readonly SlotEscolhaAtributo[]>> = {
  [ArquetipoEnum.ENGENHEIRO]: [['forca', 'destreza']],
  [ArquetipoEnum.ASSASSINO]: [['luta', 'pontaria']],
  [ArquetipoEnum.ACADEMICO]: [SEM_LUTA_OU_PONTARIA],
};

const SLOTS_SUBCLASSE: Partial<Record<ClasseEnum, readonly SlotEscolhaAtributo[]>> = {
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: [SEM_LUTA_OU_PONTARIA, SEM_LUTA_OU_PONTARIA],
};

/** Slots de bônus "à escolha" do perfil — `[]` quando não há nenhum (mesma precedência de
 * `obterBonusAtributos`: subclasse vence arquétipo). */
export function obterSlotsEscolhaBonus(dto: BonusAtributosObterDto): readonly SlotEscolhaAtributo[];

/** Combina o bônus fixo com as escolhas do jogador (uma por slot, na mesma ordem de
 * `obterSlotsEscolhaBonus`). Escolha `null` ou fora das opções do slot não soma nada nesse slot. */
export function obterBonusAtributosComEscolha(
  dto: BonusAtributosObterDto,
  escolhas: readonly (keyof FichaAtributosDto | null)[],
): BonusAtributos;
```

## 2. Estado do guia — `criar.page.ts`

- Novo campo em `EstadoGuiaCriacao`: `readonly bonusEscolhido: readonly (ChaveAtributo | null)[]`.
  Vazio (`[]`) por padrão; normalizado em `normalizarEstado` (`estado.bonusEscolhido ?? []`) para
  rascunhos salvos antes desta mudança.
- `mudarClasse` e `mudarArquetipo` resetam `bonusEscolhido: []` — mesmo padrão que já reseta
  `arquetipo`/`pacoteHabilidadesId`/`melhorias` ao trocar classe.
- Novo computed `slotsEscolhaBonus = computed(() => obterSlotsEscolhaBonus({ classe:
  this.classeCalculada(), arquetipo: this.estado().arquetipo }))`.
- `bonusAtributos` (linha 136) passa a chamar `obterBonusAtributosComEscolha({ classe, arquetipo },
  this.estado().bonusEscolhido)` no lugar de `obterBonusAtributos`.
- Novo método `escolherBonusAtributo(indice: number, chave: ChaveAtributo | null): void` — grava a
  escolha na posição `indice` do array (substitui, não acumula).
- `passoValido()`, caso `'Classe'` (linha 382): ganha mais uma condição — todo slot de
  `slotsEscolhaBonus()` precisa ter uma escolha não-nula na mesma posição de `bonusEscolhido`.

## 3. Template — `criar.page.html`, passo `// Classe`

Logo após o `<select>` de Arquétipo (linha 147-157), quando `slotsEscolhaBonus().length`, um
`<select>` por slot:

- 1 slot → rótulo "Bônus à escolha".
- 2 slots (só o Híbrido) → "1ª escolha de bônus" / "2ª escolha de bônus".
- Opções do select = `campos` (lista já existente de `{ chave, nome }`) filtrado pelas chaves do
  slot correspondente.
- `[value]` ligado a `estado().bonusEscolhido[indice] ?? ''`; `(change)` chama
  `escolherBonusAtributo(indice, valor)`.

O rótulo da prévia "Bônus fixo de atributos" (linha 175) vira "Bônus de atributos" — a partir
desta mudança os chips (`bonusAtributosLista`) já incluem a escolha resolvida, então "fixo"
deixa de ser preciso. Nenhuma outra parte do template muda: os chips do passo `// Atributos`
(linha 274-276) e o resumo (`rotuloOrigemBonus`) já leem de `bonusAtributos()`, que passa a vir
combinado automaticamente.

## 4. Ficha final — `ficha-padrao.ts`

- `OpcoesFichaInicial` ganha `readonly bonusEscolhido?: readonly (keyof FichaAtributosDto |
  null)[]`.
- `construirFichaInicial` troca `obterBonusAtributos({ classe, arquetipo })` (linha 98) por
  `obterBonusAtributosComEscolha({ classe, arquetipo }, opcoes.bonusEscolhido ?? [])`.
- `criar.page.ts:criar()` passa `bonusEscolhido: e.bonusEscolhido` na chamada de
  `construirFichaInicial`.

## Critério de verificação (obrigatório antes de fechar)

Verificação **ao vivo** (stack real, skill `verify`):

- Escolher Especialista → Engenheiro: aparece um select "Bônus à escolha" com só Força/Destreza;
  "Avançar" fica bloqueado até escolher; escolhendo Força, o passo `// Atributos` mostra
  `+1 Intelecto` e `+1 Força` do Engenheiro.
- Especialista → Assassino: mesmo fluxo com Luta/Pontaria.
- Especialista → Acadêmico: select com as 8 opções (sem Luta/Pontaria); escolher Vontade soma
  `+1 Intelecto` e `+1 Vontade`.
- Subclasse Experimento Híbrido: dois selects independentes; escolher Vigor nos dois soma `+2
  Vigor` no passo `// Atributos` e na ficha final.
- Trocar de Classe ou de Arquétipo depois de já ter escolhido: a escolha antiga é limpa e
  "Avançar" volta a travar até escolher de novo.
- Combatente/Suporte sem ponto "à escolha" (Lutador, Mercenário, Vanguarda, Paramédico,
  Diplomata, Comandante) e Civil: nenhum select novo aparece, comportamento idêntico ao atual.
- Criar a ficha até o fim (passo `// Revisão` → "Criar ficha") com um dos quatro perfis: os
  atributos finais persistidos incluem o bônus escolhido.
- Mobile (360–430px) e desktop: novo(s) select(s) sem quebra de layout na grade
  `guia__campos--duas-colunas`.

## Testes

- `shared/src/regras/agente/arquetipo.spec.ts`: `obterSlotsEscolhaBonus` (os 4 perfis com slot +
  todos os outros perfis/Civil/classe-base-sem-arquétipo → `[]`); `obterBonusAtributosComEscolha`
  (escolha válida soma, escolha `null` não soma, escolha fora do slot é ignorada, Híbrido com
  escolha repetida soma `+2` no mesmo atributo).
- `criar.page.spec.ts`: `mudarClasse`/`mudarArquetipo` resetam `bonusEscolhido`;
  `passoValido('Classe')` bloqueia sem escolha e libera com todas preenchidas;
  `bonusAtributos()`/`atributosFinais()` refletem a escolha; ficha final montada via `criar()`
  inclui o bônus escolhido nos atributos persistidos.

## Fora de Escopo

- Editor de ficha pós-criação (`ficha-edicao.service.ts`) — troca de arquétipo continua só com o
  bônus fixo.
- Qualquer novo cálculo de saúde/energia/habilidades — só o bônus de atributo.

## Dependências

- `shared/src/regras/agente/arquetipo.ts` (`obterBonusAtributos`, m3-10).
- `m3-57` (guia de criação, passo `// Classe`).
