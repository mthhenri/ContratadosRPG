# m10-07-blocos-ricos.spec.md

> Task do milestone `m10-regras.spec.md`, depois de `m10-02`, `m10-03`, `m10-06` e da entrega 1 de
> `icones-recursos-sistema` (trio Vida/Energia/Defesa no `app-icone`). Fonte visual: exemplão, aba
> *Protótipo* — cada bloco tem o seu exemplo lá.

> **Antes de qualquer UI:** `docs/design/DESIGN.md` e `docs/design/tema/`; skills
> `design-fidelity` e `verify`. Análogos: a própria página da `m10-06` e os chips/stats da ficha.

## Objetivo

Renderizar os blocos tipados da `m10-02` no leitor.

## Entregáveis

1. **Dossiê de Classe:** cabeçalho com ícone da classe e citação, Vida/Energia em destaque com os
   ícones do trio, habilidades de classe, **arquétipos em `app-abas`** (ícone do arquétipo +
   "Habilidade inicial do arquétipo"), habilidades gerais melhoradas. Subclasses com seu ícone.
2. **Habilidades** em duas colunas na página (lista densa da `m10-06`).
3. **Origens:** cartão de dossiê em grade de 2 colunas.
4. **Equipamentos:** lista densa, nunca tabela — nome, custo, chips Dano/Porte/Peso, descrição
   curta; Uma/Duas Mãos com dois chips de dano rotulados; modificações com ■□ e "Bloqueia".
5. **Módulos de fragmento:** cinco blocos V → I, "mais fraco ← → mais forte".
6. **Tabelas de dados** (Patentes, Módulos, Nível de Criatura, NA): no celular rolam de lado
   dentro da própria caixa, 1ª coluna fixa e esmaecimento na borda.
7. **Guia:** roteiro numerado, ficha de identidade, grade de atributos com modificador por cor,
   selo de tipo de habilidade de criatura.
8. **Ficha completa** (A Estátua): logo do NA, citação, Vida/Defesa em destaque, resistências em
   chips, ataques em linha.
9. **Níveis de ameaça:** silhueta da marca própria ContratadosRPG (SCP + D20,
   `m10-04`) pintada pela cor do nível. O logo SCP oficial identifica somente
   Criatura, não os níveis, inclusive o logo do NA da ficha completa acima.
10. Chip de Energia e destaques de Vida/Defesa com `appTooltip` por extenso ("3 de Energia").

## Verificação

`verify` em 1920×1080, 1366×768 e 360×800, percorrendo cada bloco no Sistema e no Guia, abas de
arquétipo, tabela rolando no celular, temas escuro e claro. Comparação bloco a bloco com o exemplão.

## Fora de escopo

Descrição longa e ícone de item; pontes site → regra.
