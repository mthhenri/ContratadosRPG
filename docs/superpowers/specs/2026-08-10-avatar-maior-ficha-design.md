# Avatar maior na ficha — design

## Problema

O avatar da ficha (`.ficha-ident__avatar`, m3-62) é uma caixa de 52×52px — pequena demais para
reconhecer o agente de relance. Além disso, os selos de editar (lápis) e remover (✕) sobre o
avatar (`&__avatar-upload` 20×20, `&__avatar-remover` 18×18) nunca ganharam o ajuste de alvo de
toque de 44px que o resto do componente já aplica em todo controle pequeno (`bp.$alvo-toque`,
mixin `alvo-de-toque()`) — ficam minúsculos e difíceis de acertar no celular.

## Escopo

- Muda o card de Identidade (`.ficha-ident` + o que hoje é `.ficha-ident__meta`), nos dois modos
  que ele já tem (`modo="padrao"` — ficha completa — e `modo="compacto"` — card de equipe). Não
  cria um modo novo.
- Puramente visual — nenhum estado, computed ou método novo. `.ficha-ident__meta` continua com a
  mesma marcação/lógica de edição (Personalidade/Origem), só muda de posição no DOM (ver
  Estrutura) e de lugar no layout por breakpoint.
- Fundo listrado (`repeating-linear-gradient`) do avatar continua exatamente como está — decisão
  explícita do autor, não mexer por enquanto.

## Tamanhos

- Avatar: **52px → 100px** (dobrado), igual em qualquer largura de tela — não existe uma versão
  "avatar médio" no meio do caminho.
- Selo de editar (`&__avatar-upload`): 20px → **28px**, ícone 10px → 13px.
- Selo de remover (`&__avatar-remover`): 18px → **24px**, ícone 9px → 11px.
- Os dois ganham `@include alvo-de-toque($posicionar: false)` — no mobile (`bp.mobile`, ≤560px)
  passam a ter uma área de toque invisível de 44×44 (pseudo-elemento `::after`, mesmo mixin já
  usado no resto do arquivo), sem inflar o desenho do selo.

## Estrutura (desktop — "opção B", ≥561px)

`.ficha-ident__meta` (Personalidade/Origem) deixa de ser irmã de `.ficha-ident` e passa a morar
dentro de um novo wrapper, `.ficha-ident__coluna-texto`, junto com `.ficha-ident__texto`
(rótulo/nome/contrato) — a "informação gira" para o lado do avatar, preenchendo a altura dele em
vez de sobrar vão vazio:

```
┌──────────┐  AGENTE
│          │  Beatriz Kowalski
│  avatar  │  CONTRATO — 0000
│  100×100 │
│          │  PERSONALIDADE      ORIGEM
└──────────┘  — Definir —        Não definida
```

```html
<div class="ficha-ident">
  <div class="ficha-ident__avatar">...</div>
  <div class="ficha-ident__coluna-texto">
    <div class="ficha-ident__texto">...</div>   <!-- rótulo/nome/contrato, como já era -->
    <div class="ficha-ident__meta">...</div>    <!-- Personalidade/Origem, como já era -->
  </div>
</div>
```

`.ficha-ident` continua `display: flex` (era `align-items: center`, símbolo mantido); `
&__coluna-texto` é `flex-direction: column`, `gap: 10px` (substitui o `margin-bottom: 14px` que
`&__meta` tinha antes — o espaçamento agora vem do `gap` do pai, não de margin por filho).

## Estrutura (mobile — "opção C", ≤560px, `bp.mobile`)

Empilha e centraliza: avatar no topo, Nome/Contrato centralizados logo abaixo — mas
**Personalidade/Origem NÃO centraliza**, continua com a leitura rótulo-em-cima/valor-embaixo de
sempre, à esquerda, ocupando a largura toda do card (é a mesma `.ficha-ident__meta` de sempre,
sem nenhuma classe de centralização):

```
      ┌──────────┐
      │  avatar  │
      │ 100×100  │
      └──────────┘
        AGENTE
     Beatriz Kowalski
     CONTRATO — 0000

  PERSONALIDADE      ORIGEM
  — Definir —        Não definida
```

- `.ficha-ident`: `flex-direction: column; align-items: center;` no mobile.
- `.ficha-ident__coluna-texto`: `width: 100%` no mobile (senão ficaria do tamanho do conteúdo,
  encolhendo `__meta` junto — o objetivo é só o `__texto` centralizar, não a coluna toda).
- `.ficha-ident__texto`: só ele ganha `align-items: center; text-align: center;` no mobile —
  `__meta`, no mesmo container, fica de fora de propósito.

Por que não é o mesmo layout do desktop só com breakpoint no avatar: a 100px de avatar, a coluna
de texto ao lado sobraria com ~190–210px de largura útil no card mobile de 360px — nomes/contrato
mais longos que "Beatriz Kowalski" já quebrariam em várias linhas espremidas. Empilhado dá a
largura do card inteiro pro texto.

## Fora do escopo

- O avatar da listagem do Acervo (`.acervo__cartao-avatar`, `acervo.page.scss`) — é uma
  implementação separada, não usa `.ficha-ident`, não foi tocado.
- Fundo listrado decorativo — mantido como está.
- Qualquer lógica de upload/remoção/validação de imagem (`aoSelecionarImagem`, `erroImagem`,
  `removerImagem`) — zero mudança, os mesmos handlers continuam nos mesmos elementos, só
  reposicionados no layout.

## Critério de verificação (obrigatório antes de fechar)

Verificação **ao vivo** (stack real, skill `verify`), nos dois viewports fixos do projeto —
**feita nesta rodada**, com ficha real (`Beatriz Kowalski`, avatar real via upload) em
`modo="padrao"`:

- **Desktop 1920×1080:** avatar 100px à esquerda, Nome/Contrato/Personalidade/Origem ao lado
  preenchendo a altura, sem vão vazio; selos de editar/remover no tamanho novo (28/24px).
- **Mobile 360×800:** avatar centralizado no topo, Nome/Contrato centralizados abaixo; chips
  centralizados; Personalidade/Origem full-width abaixo, alinhado à esquerda como sempre.

Pendente para uma próxima verificação (não bloqueia esta implementação, mas vale conferir ao
vivo): `modo="compacto"` (card de equipe, `CampanhaDetalhe`) nos mesmos dois viewports — a
mudança é a mesma marcação/CSS, sem override específico de `&--compacto`, então o comportamento
esperado é idêntico ao `modo="padrao"`, mas não foi fotografado nesta rodada.

## Testes

`ficha-visualizacao.component.spec.ts`: os 133 testes existentes passam sem alteração — nenhum
depende da marcação HTML do card de Identidade, só de sinais/métodos do componente (mudança
puramente de apresentação). Nenhum teste novo necessário.
