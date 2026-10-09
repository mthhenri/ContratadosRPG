# Ícones de dano, categoria de habilidade, fragmento e reação

> **Spec avulsa, derivada da entrega 3 de [`icones-recursos-sistema`](../active/icones-recursos-sistema.spec.md)** (levantamento com o autor, votação em 09/10/2026). Implementa só o que o autor aprovou; o registro da votação está em `../active/icones-recursos-sistema/votacao-prancha.md` e os desenhos em [`icones-dano-habilidade-fragmento-reacao/desenhos-aprovados.md`](icones-dano-habilidade-fragmento-reacao/desenhos-aprovados.md).

> **Estado (09/10/2026): concluída** — as três tarefas implementadas e observadas ao vivo; ver [verificacao.md](icones-dano-habilidade-fragmento-reacao/verificacao.md).

> **Antes de qualquer UI:** `docs/design/DESIGN.md` e `docs/design/tema/`; skills `design-fidelity` e `verify`. Esta spec é dividida em tarefas numeradas (abaixo); implementar uma por vez.

## Objetivo

Dar ao `app-icone` os 21 ícones aprovados para tipos de dano, categorias de habilidade, fragmentos e reações, e adotá-los nas telas **ao lado** do texto que hoje nomeia cada conceito, sem alterar cálculo, dado ou rótulo.

## Decisões já tomadas

Votadas na prancha (rodadas 1 a 7), todas fechadas:

| Domínio | Item | Desenho | Nome proposto em `IconeNome` |
|---|---|---|---|
| Tipo de dano | Físico | Punho (frente) | `dano-fisico` |
| | Balístico | Projétil | `dano-balistico` |
| | Explosão | Estouro duplo | `dano-explosao` |
| | Químico | Béquer | `dano-quimico` |
| | Geral | Escudo rachado | `dano-geral` |
| | Composto | Metade a metade | `dano-composto` |
| Categoria de habilidade | Geral | Estrela | `habilidade-geral` |
| | Geral Melhorada | Estrela sobre base | `habilidade-geral-melhorada` |
| | Classe | Bandeira | `habilidade-classe` |
| | Arquétipo | Árvore | `habilidade-arquetipo` |
| | Subclasse | Ramo fundo | `habilidade-subclasse` |
| | Outra classe | Troca | `habilidade-outra-classe` |
| | Personalidade | Silhueta | `habilidade-personalidade` |
| | Especialidade | Medalha | `habilidade-especialidade` |
| | Civil | Crachá | `habilidade-civil` |
| | Única | Gema | `habilidade-unica` |
| Fragmento | Construtor | Prisma | `fragmento-construtor` (já existe; troca o desenho) |
| | Potencializador | Cristal radiante | `fragmento-potencializador` (já existe; troca o desenho) |
| Reação | Esquiva | Vento | `reacao-esquiva` |
| | Bloqueio | Escudo e impacto | `reacao-bloqueio` |
| | Contra-ataque | Espada larga atrás do escudo | `reacao-contra-ataque` |

- Os nomes são proposta de convenção (português, `domínio-conceito`); mudar um nome exige só atualizar o anexo.
- O `fragmento` genérico (diamante) **continua** valendo para filtro e badge "de Fragmento"; só as duas variantes específicas trocam de desenho.
- São ícones de **contorno**, no mesmo traço do `app-icone` (a exceção preenchida continua sendo só Vida/Energia/Defesa e as marcas).
- O ícone **acompanha** o texto; nunca o substitui, e é decorativo (`aria-hidden`), como os demais. Onde o ícone sozinho carrega a leitura (chips estreitos), o consumidor fornece `appTooltip`.
- Reação existe para NPC; criatura não tem Esquiva/Bloqueio/Contra-ataque (só Defesa). Os ícones de reação só entram onde essas reações já aparecem.

## Tarefas

### Tarefa 1 — Catálogo de ícones

1. Acrescentar os 19 nomes novos a `IconeNome` e redesenhar `fragmento-construtor` e `fragmento-potencializador` em `frontend/src/app/shared/icone/` (`.ts`, `.html`; atualizar o comentário do tipo).
2. Refinar o traço de cada desenho aprovado: o anexo traz o miolo das pranchas, não o glifo final. Conferir a 16, 24 e 40px nos temas escuro e claro; ajustar onde algo perde leitura a 16px.
3. Casos com tratamento próprio:
   - **Estouro duplo (`dano-explosao`):** assar a geometria interna já escalada, para o traço ficar uniforme.
   - **Espada atrás do escudo (`reacao-contra-ataque`):** recortar a lâmina em geometria, sem `<mask>` com id (várias instâncias na tela). Implementado como duas peças dentro de um grupo rotacionado.
   - **Bloqueio, Escudo rachado (Geral) e Contra-ataque:** três escudos; checar que se distinguem a 16px.
4. Teste do componente (`icone.component.spec.ts`): cada novo nome renderiza um `svg` com `aria-hidden`; os dois fragmentos mantêm o nome público.
5. Documentar em `docs/design/DESIGN.md` (catálogo de ícones) os novos nomes e a regra "ícone acompanha o texto".

### Tarefa 2 — Tipo de dano e categoria de habilidade nas telas

Levantar os pontos onde o tipo de dano (`TipoDanoEnum`, incluindo o Composto) e a categoria de habilidade (`HabilidadeCategoriaEnum`) aparecem como texto e acrescentar o ícone ao lado, sem mudar o texto:

- tipo de dano: compras/modificações de item, receber dano, resultado de rolagem, inventário, `ficha-termo` (a faixa em `--dano-*` continua; o ícone não substitui a cor), Regras;
- categoria de habilidade: chip da categoria nos cartões de habilidade (ficha, NPC, criatura, compras) e listas de habilidades.

A lista final dos pontos, tela por tela, vai no relatório de verificação. Usar o chip/primitivo canônico de `shared/ui/`; se faltar variante, parar e perguntar ao autor.

### Tarefa 3 — Fragmento e reação nas telas

- Fragmentos: as telas que já usam `fragmento-construtor`/`fragmento-potencializador` (inventário, loja, NPC, esquadrão, rotulos da simulação) herdam o desenho novo; conferir cada uma, sem trocar nome de ícone.
- Reações: `ficha-reacoes` e onde NPC mostra Esquiva, Bloqueio e Contra-ataque (nome → ícone ao lado). Não acrescentar reação em criatura.

## Critérios de Aceite

- Os 21 ícones existem em `IconeNome` e renderizam; os dois fragmentos têm o desenho novo sem mudar de nome.
- Tarefa 2 e 3: cada ponto levantado tem ícone ao lado do texto e, onde o ícone é a única pista, `appTooltip` (nunca `title` nativo).
- Nenhum rótulo, cálculo ou dado mudou; criatura segue sem reações.
- Contraste e alinhamento do ícone com o texto conferidos; sem hex ou tamanho hardcoded (tokens e a escala do `app-icone`).

## Verificação

Tarefa 1: a 16/24/40px, temas escuro e claro. Tarefas 2 e 3: `verify` em 1920×1080 e 360×800 em cada tela tocada, com os estados relevantes (por exemplo Composto, categorias diferentes, NPC com as três reações). Testes do `icone.component`, build, lint e `repo:verificar`. Comparar com o análogo aprovado (ícone de recurso de `app-stat`/`app-barra-recurso` da entrega 2 de `icones-recursos-sistema`). A verificação visual é feita pelo agente principal, não só por relato de subagente.

## Fora de Escopo

- Vida/Energia/Defesa (já entregues); ícones de identidade das classes, arquétipos, subclasses, Civil e NPC (`m10-03`).
- Glifos de texto usados como ícone (⬢ ⬡ ◈ ■ □…) e conceitos que se repetem como rótulo: continuam no levantamento da entrega 3 de `icones-recursos-sistema`.
- Mudar regra do jogo, enum, nome de categoria ou cor de tipo de dano.

## Dependências

Constituição/convenções, design e tema; `frontend/src/app/shared/icone/`; `docs/design/DESIGN.md`; entrega 2 de `icones-recursos-sistema` (análogo de ícone ao lado de valor); `votacao-prancha.md` e os anexos desta spec.
