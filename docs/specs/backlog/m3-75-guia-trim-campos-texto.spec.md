# m3-75-guia-trim-campos-texto.spec.md

> Ajuste pós-milestone do M3 — Guia de Criação de Ficha. Pedido direto do autor: "na criação de
> ficha de agente, fazer trim em todos os campos de texto".

## Objetivo

Garantir que todo campo de texto livre preenchido no guia de criação de agente chegue à ficha final
sem espaços em branco nas pontas, evitando nomes/descrições com espaço invisível no começo/fim que
hoje escapam por não passar por `.trim()` na montagem do resultado.

## Estado atual

Não existe utilitário compartilhado de trim no projeto — cada `.trim()` hoje é ad-hoc e, na maioria
dos campos, usado só para **validar** se o passo pode avançar (`passoValido`,
`criar.page.ts:547-565`), não para **persistir** o valor trimado.

Único campo já trimado antes de persistir: `nome`, em
`frontend/src/app/modules/ficha/ficha-padrao.ts:141` (`opcoes.nome.trim() || 'Novo agente'`).

Campos de texto livre do guia e situação atual (nenhum trimado na persistência, salvo indicado):

| Campo | Input | Persistência |
|---|---|---|
| `nome` | `criar.page.html:151` | **já trimado** (`ficha-padrao.ts:141`) |
| `identidade.personalidade` | `criar.page.html:376` | cru (`criar.page.ts:590`, `e.personalidade`) |
| `identidade.origem.nome` | `criar.page.html:390` | cru |
| `identidade.origem.descricao` | `criar.page.html:394` | cru |
| `identidade.origem.formacao[].texto` | `criar.page.html:436` | cru |
| `identidade.origem.formacao[].parametro` (quando input livre) | `criar.page.html:430` | cru |
| `identidade.origem.especialidade.gatilho` | `criar.page.html:445` | cru |
| `identidade.origem.especialidade.efeito` | `criar.page.html:446` | cru |
| `identidade.origem.saberDeCampo` | `criar.page.html:448` | cru |
| `fortificacao[].nome` | `criar.page.html:537` | **já trimado** (`criar.page.ts:339-340`) |
| `fortificacao[].descricao` | `criar.page.html:541` | **já trimado** (`criar.page.ts:339-340`) |

O passo "Equipamento inicial" não tem campo de texto persistido (só busca de catálogo).

## Entregáveis

1. No ponto único de montagem do resultado da identidade (`criar.page.ts:590` e qualquer outro
   ponto equivalente que monte `FichaIdentidadeDto`), aplicar `.trim()` em todos os campos de texto
   livre listados acima que ainda não são trimados.
2. Não trimar durante a digitação (a cada keystroke) — só no momento de montar o objeto persistido,
   preservando a experiência de digitação (permitir espaço no meio da frase, inclusive espaço
   temporário no fim enquanto o usuário ainda digita).
3. Campos de array de texto livre (`formacao[].texto`/`.parametro` quando aplicável) devem ser
   trimados item a item.
4. Não adicionar uma função utilitária nova de trim compartilhada só para isto — usar `.trim()`
   direto nos poucos pontos de montagem, seguindo o padrão já usado em `fortificacao[].nome`. Se, ao
   implementar, mais de um consumidor precisar da mesma lógica (ex.: o mesmo padrão se repetir no
   editor de identidade da ficha já criada, fora do guia), avaliar extrair uma função pura em
   `shared/` — não antecipar essa extração aqui.

## Critérios de Aceite

- Criar um agente preenchendo `personalidade`, `origem.nome`, `origem.descricao`,
  `origem.formacao[].texto`, `origem.especialidade.gatilho`/`efeito` e `origem.saberDeCampo` com
  espaços extras no início/fim — a ficha persistida não tem esses espaços em nenhum dos campos.
- Um valor só de espaços continua sendo rejeitado pela validação de passo existente (comportamento
  de `passoValido` não muda).
- `personalidade` continua validando ausência de espaço **interno** (`!/\s/.test(...)`,
  `criar.page.ts:551-552`) — o trim não deve mascarar esse caso (ex.: `" foco "` vira `"foco"`,
  válido; `" a b "` continua inválido pelo espaço interno, mesmo depois do trim das pontas).
- `npm run test -w frontend` verde, com teste de regressão cobrindo ao menos um campo de cada
  natureza (string simples e item de array).

## Fora de Escopo

- Campos de texto fora do guia (editor de ficha já criada, inventário, anotações, etc.) — se o
  mesmo problema existir lá, é uma task separada.
- Criar utilitário de normalização de texto compartilhado, a menos que a implementação revele
  necessidade real de reuso imediato.

## Dependências

`m3-57` (guia base).
