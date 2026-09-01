# UI-15 — Confirmação destrutiva

> Filha da auditoria visual (seções Modal e Componentes novos). A lista de fluxos abaixo substitui
> a da auditoria original ("excluir ficha, encerrar encontro, remover combatente e sair da
> campanha"): verificada no código, "sair da campanha" não existe como ação do jogador — só o
> mestre remove um membro (`CampanhaService.removerMembro`) — e duas das ações citadas não têm
> hoje confirmação nenhuma, não uma cópia duplicada dela. Ver Entregável 3 para a lista real.

## Objetivo

Dar ao `app-modal` um rodapé de ações e criar o serviço `app-confirmacao`, que substitui os três
padrões concorrentes de confirmação destrutiva que o projeto pratica hoje: modal ad-hoc duplicado,
área inline com `role="alertdialog"` e nenhuma confirmação.

## Entregáveis

1. Slot `[modalAcoes]` no `app-modal`: régua `border-top: 1px solid var(--border)` acima do
   rodapé, `gap: 10px` (o mesmo valor já usado em `.dialogo__acoes`, em
   `acervo.page.scss`), alinhamento à direita. Hoje `<ng-content>` projeta o corpo inteiro em
   `.modal__corpo` e cada consumidor monta a própria `<div class="…__acoes">`.
2. Criar `app-confirmacao` como serviço que devolve uma `Promise<boolean>` e recebe título, texto
   de consequência e severidade (`padrao` | `perigo`). Severidade `perigo` usa
   `variante="perigo"` no botão de ação — variante que já existe em `app-botao`
   (mapeada para `--erro` em `botao.component.scss`) mas que nenhum dos quatro diálogos de
   confirmação abaixo usa hoje: todos confirmam com `variante="primario"` (cor `--accent`), até
   para excluir. Ícone `alerta` (já existe em `app-icone`) no cabeçalho quando a severidade é
   `perigo`.
3. Migrar os fluxos reais de confirmação destrutiva do projeto — cada um hoje em um padrão
   diferente do produto:
   - **Excluir ficha** — `<app-modal>` ad-hoc duplicado quase verbatim em
     `ficha/paginas/acervo/acervo.page.html` (bloco `.dialogo__acoes`) e em
     `campanha/paginas/detalhe/detalhe.page.html` (mesmo texto e botões, com cabeçalho extra de
     ícone + `<hr>` que a cópia de `acervo` não tem). As duas viram uma chamada a
     `app-confirmacao`.
   - **Excluir campanha** — não é modal: `detalhe.page.html` mostra uma
     `<div class="detalhe__exclusao" role="alertdialog">` inline, abaixo do formulário de edição
     da campanha. Vira uma chamada a `app-confirmacao`.
   - **Remover membro da campanha** — mesmo padrão inline,
     `<div class="detalhe__membro-confirmacao" role="alertdialog">`, abaixo da linha do membro.
     Vira uma chamada a `app-confirmacao`. (`transferir mestre`, que reusa essa mesma `div`, fica
     de fora — ver Fora de Escopo.)
   - **Encerrar combate e remover combatente** — em `painel-encontro.page.html`, o botão
     `(click)="encerrarCombate()"` (esse já nasce `variante="perigo"` — a única exceção do item 2)
     e o `(removido)="removerCombatente(combatente)"` de `cartao-combatente.component.html`
     disparam a ação direto, sem confirmação nenhuma hoje. Os dois ganham `app-confirmacao` pela
     primeira vez; encerrar um combate ou remover um combatente em andamento não tem desfazer.
   Cada consumidor final passa a informar só texto e ação; nenhum monta HTML de diálogo próprio.
4. Documentar no `DESIGN.md`: a linha de `.modal` na tabela de componentes ganha o slot
   `[modalAcoes]`; nova linha para `app-confirmacao` com a severidade `perigo`; e a regra de quando
   a consequência precisa ser escrita por extenso ("Não há desfazer").

## Critérios de Aceite

- Os cinco call sites (excluir ficha ×2, excluir campanha, remover membro, encerrar combate,
  remover combatente) usam `app-confirmacao`; nenhum monta `role="alertdialog"` ou `<app-modal>`
  de confirmação à mão, e nenhum dispara a mutação direto do clique sem passar pelo diálogo.
- Ordem dos botões (ação perigosa primeiro, cancelar depois — a ordem que as cópias atuais já
  usam), severidade e foco inicial são idênticos nos cinco; `Escape` cancela e a promessa resolve
  `false`.
- O botão de ação do diálogo usa `variante="perigo"` nos cinco fluxos migrados; nenhum confirma
  exclusão ou remoção com `variante="primario"`.
- Gate visual do diálogo nos dois viewports (1920×1080 e 360×800); no mobile os botões mantêm alvo
  de toque de 44px.

## Fora de Escopo

Confirmação com entrada de texto ("digite o nome para excluir"), desfazer, e o fluxo de
"transferir mestre" — reusa a mesma `div role="alertdialog"` das ações acima, mas não é destrutivo
(não há perda de dado) e fica com a UI inline por ora. Nenhuma mudança nas regras de permissão das
ações migradas.

## Dependências

`ui-02` (modal), `ui-07` (adoção do modal nativo), `ui-12` (severidade `perigo` em `--erro`),
`ui-18` (escala de espaço — o gap do rodapé deveria nascer dela, não repetir mais um `10px`
literal).
