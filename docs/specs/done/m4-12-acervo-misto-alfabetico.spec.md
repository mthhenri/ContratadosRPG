# m4-12-acervo-misto-alfabetico.spec.md

> Task adicional do milestone `m4-ficha-criatura-npc.spec.md`, revisão do trabalho de NPC.
> Pedido direto do autor (2026-10-04): *"lá na tela de fichas, acho melhor deixar misturado mesmo
> criatura/npcs/agentes. Ordenando por alfabética"*. **Reverte parcialmente a `m4-11`**
> (`docs/specs/done/m4-11-acervo-por-tipo.spec.md`), que separou o acervo em blocos por tipo; o
> filtro por tipo, o card único com recorte por tipo e tudo o que a `m4-11` fez fora da
> apresentação em blocos **permanecem**.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e o handoff em `docs/design/tema/`.
> **Análogo aprovado obrigatório:** o próprio acervo atual (`acervo.page.*`) e o cartão
> `CartaoFichaAcervo`; a lista única herda o grid de `.acervo__lista`. Para a etiqueta de tipo, o
> análogo é o chip de metadado de `shared/ui/` (`app-chip variante="sutil"`).

## Objetivo

Hoje o acervo (`/fichas`) mostra um bloco por tipo (Agentes → Criaturas → NPCs), cada um com
cabeçalho, contagem e trava de ~2 linhas com rolagem interna em "Todos". O autor prefere uma
**lista única**, misturando os três tipos, em **ordem alfabética por nome**.

## Decisões de abertura

Tomadas com o autor antes da escrita:

1. **Filtro por tipo permanece.** O `<select>` "Filtrar por tipo" (Todos/Agentes/Criaturas/NPCs)
   continua; "Todos" é o padrão e mostra a lista única misturada; escolher um tipo mostra só ele.
2. **Etiqueta de tipo no cartão.** Com os tipos misturados, o recorte (Ameaça/NA/VD, Categoria/
   Nível, Classe/Patente) deixa de ser suficiente para distinguir o tipo de relance. O cartão
   ganha uma etiqueta discreta **AGENTE / CRIATURA / NPC**.

Suposições registradas (o autor pode corrigir):

3. A contagem do cabeçalho do card "Fichas" passa a ser a da **lista exibida** (com um tipo
   filtrado, é a contagem daquele tipo). Antes era sempre o total, porque cada bloco tinha a sua.
4. Sem blocos, a trava de altura e a rolagem interna deixam de existir: a **página** rola.

## Entregáveis

### 1. `acervo.page.ts`

- Remover o papel de `BLOCOS_ACERVO` como definição de blocos de renderização. A lista de tipos
  continua existindo **só** para o `<select>` e para o texto de estado vazio por tipo
  (`{ tipo, titulo, estadoVazio }`), sem alterar os rótulos atuais.
- `itensPorTipo`, `itensDoTipo` e `mostrarBloco` saem; entra um `computed` `itensExibidos` que
  (a) aplica o `filtro()` e (b) ordena por `nome`.
- Ordenação: `nome.localeCompare(outro, 'pt-BR', { sensitivity: 'base' })`, com desempate por `id`
  para a ordem ser estável. É ordenação de apresentação sobre o que o backend já devolve
  (`ORDER BY ficha.nome` não tem a colação do `pt-BR`); **nenhuma mudança de backend**.
- Retrocompat mantida: ficha sem `tipo` conta como `JOGADOR`.

### 2. `acervo.page.html` / `.scss`

- Um único `<ul class="acervo__lista">` com os cartões de `itensExibidos()`. Sai o `<header
  class="acervo__secao">` (título, régua, contagem), sai `.acervo__lista--limitada` e o
  `appOverflowFade` da lista (não há mais rolagem interna). O menu (⋯) e o preview do avatar
  **continuam na raiz da página** como estão.
- Estado vazio: sem nenhuma ficha → o estado vazio geral, como hoje; com um tipo filtrado sem
  fichas → o texto de estado vazio do tipo ("Nenhuma criatura ainda.").
- Remover do SCSS o que ficar morto (`.acervo__secao*`, `--limitada`). Conferir a ausência de
  referências antes de apagar.

### 3. `CartaoFichaAcervo` — etiqueta de tipo

- Etiqueta com o rótulo do tipo na linha de meta do cartão, antes dos demais textos, usando
  `app-chip variante="sutil"` — **não** um `<span>` estilizado à mão. Rótulos: `AGENTE`,
  `CRIATURA`, `NPC` (função pura de rótulo junto ao resto de `rotulos-ficha.ts`, sem `if` por tipo
  no template).
- O recorte por tipo do corpo do cartão não muda. O cartão de criatura continua com
  `registroTexto` acima do nome; a etiqueta não colide com ele (definir a posição na construção
  do corte visual e registrar no fecho).
- Altura do cartão: a etiqueta não pode quebrar o ritmo do grid (todos os cartões da linha com a
  mesma altura, como hoje).

## Critérios de Aceite

- "Todos" mostra **uma** lista, sem cabeçalhos de seção, com agente, criatura e NPC intercalados
  em ordem alfabética por nome (acentos e caixa ignorados: "Álvaro" antes de "Bruno").
- Cada tipo é identificável no cartão pela etiqueta; o recorte de cada tipo continua correto.
- O filtro por tipo mostra só aquele tipo, na mesma ordem; o estado vazio por tipo aparece.
- Contagem do cabeçalho coerente com a lista exibida.
- A página rola; nenhuma lista tem rolagem interna; sem overflow horizontal em nenhum viewport.
- Menu (⋯), "Atribuir a campanha", duplicar, excluir e preview do avatar seguem funcionando.
- Nenhum estilo morto de bloco no SCSS; nenhum hex/fonte/raio solto.

## Verificação exigida

- **Testes** (`acervo.page.spec.ts`): ordem alfabética misturada com acentos, caixa e empate;
  filtro por tipo; estado vazio por tipo; contagem; ficha sem `tipo`. (`cartao-ficha-acervo`):
  etiqueta por tipo.
- **Gate visual** (`AGENTS.md`, skill `verify`), em `1920×1080` **e** `360×800`: Todos com os três
  tipos misturados; cada filtro isolado; filtro sem fichas; menu (⋯) num cartão perto da borda
  inferior; preview do avatar. Comparação com o análogo registrada no fecho.

## Fora de Escopo

- Busca por nome, ordenação alternativa ou persistência do filtro.
- Qualquer mudança de backend, DTO ou rota.
- Os critérios de permissão, atribuição e duplicação da `m4-11` — intocados.
- Redesenho do cartão além da etiqueta de tipo.

## Dependências

- `m4-11` (`done`) — acervo por tipo, `CartaoFichaAcervo` e o filtro.
- `m4-08b` (`done`) — NPC já listado e com recorte no cartão.
