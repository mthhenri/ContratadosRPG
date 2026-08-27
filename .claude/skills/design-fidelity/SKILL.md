---
name: design-fidelity
description: >
  Executa o gate visual obrigatório: escolher e registrar o componente análogo aprovado,
  construir sobre os padrões que já existem, e comparar a tela renderizada com o análogo antes
  de apresentar o trabalho. Use ao criar ou ajustar qualquer UI, tela, layout, componente
  visual, estilo, SCSS, tema, comportamento responsivo ou mobile — inclusive "criar página" e
  "ajustar tela", que não citam nenhuma dessas palavras. `verify` ensina como rodar e dirigir o
  app; esta skill ensina contra o que comparar.
---

# Fidelidade Visual — o gate contra o que comparar

> A regra vive em `CLAUDE.md` ("Processo obrigatório para qualquer UI ou estilo") e
> `SYSTEM.SPEC.md` §16.31 — proibição absoluta, não preferência de estilo. Esta skill executa os
> seis passos; para subir o stack e capturar os viewports, use a skill `verify` (ponteiro, sem
> duplicar o procedimento).

## 1. Antes de editar — escolher e registrar o análogo

Ler `docs/design/DESIGN.md` e o handoff de `docs/design/tema/` primeiro. Escolher o componente
análogo aprovado e **registrar por escrito** (na resposta ao autor ou no fecho da task) — não só
a cor: shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e comportamento
responsivo. "Vou usar os tokens" não é escolher análogo. Tabela de partida por tipo de tela em
[`references/analogos.md`](references/analogos.md).

## 2. Construir

Consumir tokens (`var(--surface)`, `var(--accent)`, `var(--font-mono)`...) — nunca hex, fonte ou
raio hardcoded. Copiar o bloco BEM canônico de `docs/design/tema/_componentes.scss` (`.card`,
`.stat`, `.stepper`, `.botao`, `.chip-classificacao`, `.topbar`, `.abas`...) para o `.scss`
scoped do componente — nunca importar o arquivo inteiro. BEM em português. Tailwind para
layout/espaçamento/tipografia. `[appTooltip]` em vez do `title` nativo do browser. Primeiro um
corte visual representativo — não um formulário HTML genérico coberto de tokens por cima.

## 3. Verificar

Use a skill `verify` para subir o stack e dirigir a UI. Capturar `1920×1080` **e** `360×800`,
mais qualquer viewport/estado que a spec da task exigir. Percorrer os estados reais da tela —
vazio, carregando/skeleton, cheio, erro, desabilitado, foco, item com texto longo — captura só do
estado inicial não valida uma tela interativa.

## 4. Comparar e decidir

Checklist de aprovação — cada item responde sim/não olhando a tela, sem interpretação. Reprovar
qualquer um volta para o passo 2, não segue para o passo 5:

1. Parece parte do mesmo produto que o análogo (mesma "voz" visual)?
2. Mesma densidade e hierarquia (nada mais apertado/solto que o análogo)?
3. Usa os controles, ícones e estados **canônicos** — nenhum inventado na hora?
4. Não parece HTML genérico coberto de tokens por cima?
5. Sem overflow horizontal nem corte de conteúdo em nenhum dos dois viewports?
6. Foco visível, contraste de texto e alvo de toque (`$alvo-toque`, 44px) corretos no mobile?

## 5. Corrigir antes de apresentar

Toda divergência encontrada no passo 4 se corrige **na mesma task**, antes de mostrar o trabalho
ao autor. Build, lint, teste e uso correto de token são necessários, mas não substituem esta
comparação — uma tela pode passar em todos os três e ainda reprovar aqui.

## Delegação não fecha o gate

Relato ou screenshot de subagente **não encerra** o gate — o agente principal inspeciona
pessoalmente a UI renderizada nos viewports obrigatórios antes de entregar. Se a aplicação real
não puder ser executada ou observada nesta sessão, a tarefa visual permanece **aberta**; nunca
declarar UI pronta com base só no código.

## `docs/design/examples/` — o que é e o que não é

24 arquivos, na prática hoje 21 (conferir com `ls docs/design/examples/*.html`, não confiar num
número em doc) — HTML único e offline, `<script>` removido, capturado do app real em
`1920×1080`/`360×800`. Serve para forma, cor, densidade e padrão de componente; **não** para
comportamento (nada é clicável) nem para conteúdo "correto" (dados de seed descartável). Fica
desatualizado com o tempo — se a tela mudou de verdade, recapturar (`examples/README.md` "Como
regenerar") em vez de comparar contra uma captura velha. `ficha-de-criatura.html` é a exceção:
mockup mantido à mão, `/painel/:campanhaId/criatura/*` segue fora do ciclo normal enquanto durar
(ver `examples/README.md` "Excluído de propósito").

## Nota anti-`P-020`

O corte visual entregue precisa ser legível no fonte — sem template HTML nem bloco SCSS
compactado numa linha só, o sintoma exato do `P-020`. Hoje isso é disciplina manual: nenhum
formatador automático está configurado para `.html`/`.scss` ainda — o script
`npm run format:html-scss -w frontend` que resolveria isso é proposto em
`docs/specs/backlog/formatacao-legibilidade-frontend.spec.md`, **ainda não implementada**; não
cite esse comando como se já existisse.
