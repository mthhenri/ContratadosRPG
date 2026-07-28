# m3-60-ficha-mobile-navegacao.spec.md

> Continuação do lote de refino da ficha (`m3-40`…`m3-56`). Sucede a `m3-56`, que fez o passe
> mobile mecânico (overflow + alvos de toque) mas manteve a hierarquia do desktop empilhada.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Tornar a ficha **usável em mesa no celular**, trocando o empilhamento das 3 colunas do desktop
por navegação real, sem alterar o desktop e sem perder a identidade visual da ficha.

## Diagnóstico (medido ao vivo, 390×844, ficha cheia)

| Métrica | Valor |
|---|---|
| Altura da página (aba Informações) | **3.224px** (3,8 telas) |
| Topo da barra de abas | **y = 1.903px** (2,25 telas de rolagem cega) |
| Reposicionamento ao trocar de aba | **nenhum** — painel nasce a y=705 de 844 |
| Sanidade: vazio por `min-height: 260px` × 3 | **537px** |
| Inventário cheio visível na janela de 458px | **24%** |
| História visível na janela de 195px | **19%** |
| Controles < 44px (aba Inventário) | **68** |

## Entregáveis

1. **HUD fixo de vitais.** Bloco `sticky` no topo com nome do agente, patente/classe/nível,
   Vida e Energia (valor + barra proporcional) e selos de condição ativa. Substitui, no mobile,
   a leitura desses dados dentro do card de Identidade. Toque abre a folha inferior de ajuste
   rápido (steppers de 44px + toggles de condição), preservando o `appHoldRepeat` atual.
2. **Navegação inferior fixa.** A barra de abas de status vira barra fixa no rodapé no mobile,
   seguindo o padrão canônico já existente em `calculadora-shell.component.scss` (`flex: 1 1 0`,
   z-index na faixa 10–19, `env(safe-area-inset-bottom)`), com **ícone + rótulo sempre visíveis**
   — sem rolagem horizontal, sem rótulo cortado. Ganha um destino mobile-only **`Agente`**
   (atributos + dossiê), correspondente às colunas 1 e 2 do desktop.
3. **Reposicionar a rolagem ao trocar de aba** — o painel da aba escolhida passa a nascer no topo
   da área de conteúdo.
4. **Convivência no rodapé.** Bandeja de dados e gatilho da calculadora flutuante sobem acima da
   barra de navegação via CSS custom property de piso, sem cobrir a navegação.
5. **Alvos de toque ≥44px nos controles que a `m3-56` não cobriu** — dadinho de rolar teste do
   atributo, todos os `--editavel` (valor clicável vira alvo), lápis de apelido do inventário,
   equipar/modificar item, estrela de maestria. Inclui corrigir `.ficha-atributo__mod-passo`, cujo
   `width: 18px` posterior anula o `@extend .ficha-passo` dentro do media query.
6. **Sanidade e rolagem aninhada.** `minmax(0, 1fr)` + `min-width: 0` até o texto (hoje a coluna
   cresce até 483px de min-content e o `overflow-x: clip` do layout torna o texto inalcançável);
   `min-height` dos grupos liberado no mobile; tetos de `max-height` das listas (458/476/410px)
   removidos no mobile para não haver rolagem dentro de rolagem.
7. **Grade de atributos em 3 colunas no mobile** — corrigir a especificidade de
   `.ficha-atributos--2col`, que hoje anula a regra `bp.mobile { repeat(3) }` já escrita e produz
   dois órfãos centralizados.
8. **Tooltips acessíveis no toque.** Hoje `pointerenter` + `pointerdown` se cancelam e o conteúdo
   só existe no hover — some inteiro no celular (DT do atributo, progressão de classe de
   Vida/Energia, decomposição das resistências, Contra-ataque, requisito de Maestria).
9. **Feedback de salvamento.** O signal `edicaoPendente` existe e nunca é referenciado no
   template; o sucesso do auto-save é mudo. Tornar o estado de persistência visível.
10. Verificação responsiva ao vivo (skill `verify`) em 360/390/430px e desktop, com **ficha cheia**.

## Critérios de Aceite

- Nenhuma tarefa de mesa exige rolagem cega até a navegação; trocar de aba mostra o conteúdo da aba.
- Nome do agente e Vida/Energia visíveis em qualquer posição de rolagem no mobile.
- Barra de navegação sem rolagem horizontal e sem rótulo cortado em 360/390/430px; alvos ≥44px.
- Texto de sequela/trauma/lesão legível por inteiro no mobile.
- Informação hoje presa em tooltip acessível por toque.
- **Desktop inalterado** acima de `$bp-mobile` (a grade de 3 colunas e as 6 abas de status seguem
  como estão); sem regressão na suíte.

## Fora de Escopo

- Renomear a aba "Extras" / mover a Origem para História — **dívida de nomenclatura conhecida e
  deliberadamente adiada** (a Origem mora em "Extras" e as pessoas a procuram em "História";
  o ícone `mais` que nomeia "Extras" é o mesmo dos botões "Adicionar" do app).
- Reordenar o cromo de autoria dentro dos painéis (281px de botões antes do 1º item do inventário).
- `m3-53` (exportar PDF), ainda no backlog.

## Dependências

- `m3-26` (base mobile + breakpoints), `m3-54` (calculadora flutuante), `m3-55` (bandeja),
  `m3-56` (passe mobile + skeletons).
