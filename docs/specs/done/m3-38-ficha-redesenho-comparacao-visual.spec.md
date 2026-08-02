# m3-38-ficha-redesenho-comparacao-visual.spec.md

> Nasceu como um experimento de "comparação visual" (branch `claude/redesign-ficha-screen-*`,
> fora da sequência normal `m3-27`+) e cresceu até virar o layout real da tela de visualização.
> Este spec **documenta retroativamente** o que já foi implementado e continua **ativo**: novos
> ajustes desta mesma frente entram aqui como entregáveis adicionais, em vez de specs soltos.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Substituir a `FichaVisualizacao` por abas (m3-11) por um layout de três colunas lado a lado —
Identidade, Atributos (compacto) e Status (abas internas Informações/Inventário) — visando
menos cliques pra ver o essencial da ficha de relance, mantendo toda a edição no próprio lugar
já estabelecida em m3-10/m3-12/m3-13/m3-14.

## Entregáveis

1. **Layout de três colunas** (`ficha-visao__linha-colunas`, `align-items: stretch`):
   Identidade (420px fixo), Atributos (260px fixo, versão compacta 2 colunas), Status
   (flexível, ocupa o resto). `.ficha-pagina` alargada de 960px → 1480px pra caber as três
   sem espremer.
2. **Card Identidade consolidado**: avatar/codinome, Personalidade/Origem em glance (editor de
   Origem agora abre em `p-dialog` — formulário grande demais pro card), Classe/Arquétipo em
   chips com editor lado a lado, grade Nível/Prestígio/Dinheiro/Salário/Patente, barras de
   Vida/Energia, Condições, **Reações** (Defesa/Esquiva/Bloqueio — editáveis no próprio lugar,
   antes só leitura) e **Resistências** (idem, edita a base manual — total soma com
   equipamento). **Nível** validado aos limites da classe (`shared/regras/agente/limites`):
   0–20 Agente, 0–5 Civil — clamp na confirmação, `min`/`max` no input como dica nativa.
3. **Contra-ataque**: novo stat na linha de Reações — editável só quando o jogador tem a
   habilidade "Contra-Ataque" no catálogo; sem ela, segue placeholder tracejado só-leitura.
   Nasceu como override manual puro (`FichaDerivadosDto.contraAtaque`, sem fórmula em
   `shared/regras`); a fórmula por variante da habilidade entrou em `m3-39`, override manual
   segue disponível como em Defesa/Esquiva/Bloqueio.
4. **Card Atributos compacto**: grade 2 colunas (era 5), Proficiência/Maestria some durante a
   edição (mais espaço pro stepper), modificador de teste sempre visível (inclusive em `+0`).
5. **Card Status (3ª coluna)**: barra de abas própria (Informações/Inventário, uma posição
   reservada). Aba **Informações**: glance de Deslocamento/Dano C. a C./Dano Furtivo/Percepção
   (dadinho de rolar direto nos dois danos), `<app-ficha-sanidade>` e uma caixa de preview de
   Anotações. Aba **Inventário**: `<app-ficha-inventario>` completo.
6. **`FichaSanidade` ganha `apresentacao: 'inline' | 'dialog'`**: no modo `dialog` (usado pelo
   card de Status) os formulários de Sequela/Trauma/Lesão abrem num `p-dialog` central em vez
   de inline na lista, e os botões "+ Adicionar" viram só ícone. Lista com teto de altura +
   scroll interno (não estica a coluna vizinha). Marca de lesão permanente vira ícone (`infinito`)
   ao invés do texto "(permanente)".
7. **Lesões sempre vermelhas de verdade**: marca do grupo (borda superior + botão "+"), borda
   esquerda do item e a tag de severidade usam `var(--vida)` — fixo, **não** `var(--accent)` —
   assim continuam vermelhas mesmo se o usuário trocar o accent do tema (presets/color-picker,
   spec M1). `--vida` já existe em `_tokens.scss` exatamente pra isso (mesmo racional da stat
   de Vida).
8. **`FichaInventario` ganha `apresentacao: 'inline' | 'dialog'`**: no modo `dialog` (Status),
   catálogo+amplificadores, item custom, painel "Modificar" e "Aplicar Fragmento" abrem cada um
   num `p-dialog` de largura fixa (460px form / 50vw catálogo, breakpoint 95vw ≤560px) —
   corrige o dialog "pulando" de tamanho entre o estado de grade e o de formulário. Lista de
   itens+amplificadores com teto de altura + scroll interno (não estica a coluna Status além da
   Identidade).
9. **Linha "Inventário" consolidada**: substitui as caixas separadas "Inventário Máx." e
   "Inventário usado" por uma linha única (`peso usado / máximo`, máximo editável no próprio
   lugar) com barra de preenchimento (mesmo padrão visual de Vida/Energia). Excesso de peso vira
   um ícone de alerta com dica "Sobrecarregado!" ao lado do valor (era um texto fixo abaixo).
   Caixas de referência "Modificações"/"Dinheiro restante" removidas do resumo compacto.
10. **Mini-aba "Rolagens" renomeada "Rolagens & Combos"** e passa a hospedar `<app-ficha-combos>`
    (m3-37) logo abaixo de `<app-ficha-rolagens>` — o componente já existia (editor CRUD + runner
    "Executar combo") mas nunca tinha sido reencaixado no layout de 3 colunas; a página já escutava
    `(ajusteCombos)`, só faltava o `<app-ficha-combos>` no template.
11. **Preset "só energia"** (`FichaRolagens`): a fórmula de um passo (primário ou seguinte) agora é
    opcional — com ao menos uma habilidade vinculada e nenhuma fórmula, o passo vira um botão
    "Gastar" que debita de uma vez a Energia de todas as habilidades vinculadas, sem rolar nada
    (útil pra "gastar tudo" de um pacote de habilidades passivas sem clicar uma a uma na aba
    Habilidades). Um preset não pode ficar sem fórmula **e** sem habilidade ao mesmo tempo.
12. **"Duplicar preset"** (`FichaRolagens`): novo botão na lista de presets que copia o preset
    inteiro (fórmula, passos seguintes, habilidades) com o nome sufixado `" (cópia)"`
    (`" (cópia 2)"`, … se já existir), como ponto de partida pra uma variante.

## Critérios de Aceite

- As três colunas renderizam lado a lado em desktop (≥1480px de página) sem quebrar; Status
  nunca estica a página além da altura da coluna de Identidade (listas internas rolam).
- Nível não aceita valor fora de [0,20] (Agente) / [0,5] (Civil) — tentativa fora do range
  clampa pro limite mais próximo.
- Contra-ataque só é editável com a habilidade correspondente; sem ela, mostra "—" tracejado.
- Lesões continuam vermelhas com qualquer preset de accent selecionado (testado com preset
  "azul" ao vivo).
- Dialogs de formulário do Inventário (Item custom / Modificar / Aplicar Fragmento) têm largura
  estável entre os estados internos de cada um.
- Suíte de testes do `frontend` verde; verificação ao vivo (Playwright, stack real) cobrindo
  cada entregável visual.

## Fora de Escopo

- Refino mobile dedicado deste layout de 3 colunas (fica pra uma rodada própria, mesmo padrão
  responsivo por tokens de m1-15/m3-26 — hoje o foco é desktop).
- Restilizar `FichaCombos` no padrão compacto (dialog + grade) da rodada de `FichaRolagens` —
  entrou só reencaixado no layout (item 10); segue com o visual mais antigo (form inline).
- Histórico de rolagem (`m3-27`, backlog separado).

## Dependências

- `m3-10` (edição no próprio lugar), `m3-12` (Sanidade), `m3-14` (Inventário), `m3-25`
  (Identidade/Origem), `m3-36` (Resistências).
