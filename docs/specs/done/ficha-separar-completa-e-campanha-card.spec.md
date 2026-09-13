# ficha-separar-completa-e-campanha-card.spec.md

> Separa `FichaVisualizacao` (hoje 1 componente de ~2767 linhas com um input `modo: 'padrao' |
> 'compacto'` e `@if`/`@else` de alternância espalhados pelo template) em dois componentes
> independentes — a ficha completa (mantém o nome `FichaVisualizacao`) e a ficha usada nos contextos
> de campanha (`FichaCampanhaCard`, novo). Pré-requisito decidido pelo autor antes de
> `ui-34-ficha-completa-redesenho`: os ajustes visuais da ficha completa devem valer só pra ela,
> sem risco de vazar pro que a campanha usa — hoje isso exigiria decorar quais `@if (modo...)`
> tocar; depois desta spec, os dois nem compartilham arquivo.

## Situação atual (mapeada antes de tocar em código)

`app-ficha-visualizacao` tem **5 consumidores reais** (conferidos por grep em `frontend/src`, fora
`out-tsc`), só 1 no modo completo:

| Consumidor | Arquivo | `modo` |
|---|---|---|
| Rota de ficha completa | `ficha/paginas/visualizar/visualizar.page.html` | padrão (implícito, sem `[modo]`) |
| Ficha embutida do jogador | `campanha/paginas/detalhe-jogador/detalhe-jogador.page.html:362` | `compacto` |
| "Prévia de jogador" (dialog do mestre) | `campanha/paginas/previa-jogador/previa-jogador.page.html:94` | `compacto` |
| Painel de Iniciativa/Encontro | `encontro/paginas/painel/painel-encontro.page.html:613` | `compacto` |
| Ficha flutuante do mestre | `ficha/componentes/ficha-flutuante/ficha-flutuante-conteudo.component.html:15` | `compacto` |

`modo="compacto"` não é exclusivo da campanha (também aparece em Encontro e na ficha flutuante),
mas os 4 consumidores só existem dentro de um fluxo iniciado a partir de uma campanha — por isso o
nome escolhido pelo autor, `FichaCampanhaCard`, mesmo não sendo visualmente um "card" em todos eles
(ver Riscos).

Diferenças reais de conteúdo entre os modos, hoje resolvidas por `@if (modo() ...)`/`@else`:

- **Layout**: completo é 3 colunas (Identidade | Atributos | Status); compacto é 2 (Identidade+
  Vitalidade+Reações+Resistências | Status), com Atributos + o glance de Combate migrados pra
  dentro da aba Informações do Status.
- **Abas do Status**: completo tem Informações/Inventário/Habilidades/Rolagens/Extras/História;
  compacto só Informações/Inventário/Habilidades.
- **Exclusivo do completo**: Sanidade (Sequelas/Traumas/Lesões), Prestígio como stat solto, Extras,
  História — nenhum desses existe no compacto hoje.
- **Exclusivo do compacto**: mini-cards adicionais de Patente/Crédito num formato "fino" que o
  completo não usa dessa forma.

## Objetivo

Reduzir o acoplamento entre os dois usos antes de investir em qualquer redesenho visual de um dos
dois. A separação deve preservar exatamente o comportamento de hoje nos 5 consumidores — é
refactor estrutural, não mudança de produto.

## Entregáveis

1. **Bifurcação sem perda, antes de qualquer extração.** Duplicar o componente inteiro em dois
   (`ficha-visualizacao` e `ficha-campanha-card`, ambos com o código de hoje) e, em cada cópia,
   remover só o ramo `@if`/`@else` que não se aplica (o `modo` deixa de ser `@Input()` nos dois —
   vira comportamento fixo do componente). Rodar a suíte de testes e o gate visual dos 5
   consumidores **neste estado intermediário** antes de prosseguir — zero regressão é garantida por
   construção aqui, porque o código de cada ramo é literalmente o de hoje.
2. **Extração de sub-componentes de apresentação, só onde compensar.** Candidatos a avaliar um a
   um (não decidir em bloco): bloco de Identidade (avatar+nome+contrato+chips de classe/subclasse —
   sem os "quick stats" que já divergem de posição entre os modos), bloco de Reações
   (Defesa/Esquiva/Bloqueio/Contra-ataque) e bloco de Resistências (os 5 tipos de dano). Extrai só
   quando o resultado tiver menos props condicionais do que a duplicação atual tem linhas — caso
   contrário, mantém duplicado nos dois componentes e registra a decisão no PR/`HISTORY.md`. Não
   force os blocos que já divergem estruturalmente entre os modos (Atributos, Status/abas) numa
   abstração comum.
3. **`FichaVisualizacao`** perde o `@Input() modo` e passa a ser só o template completo de hoje
   (3 colunas, 6 abas, Sanidade/Extras/História inclusos). Único consumidor:
   `visualizar.page.html`, que deixa de passar `[modo]` (não existe mais).
4. **`FichaCampanhaCard`** (novo, `frontend/src/app/modules/ficha/componentes/ficha-campanha-card/`)
   nasce com o template compacto de hoje (2 colunas, 3 abas, Atributos+Combate dentro de
   Informações). Interface pública (`@Input`/`@Output`) compatível com o que os 4 consumidores já
   passam pra `[modo]="compacto"` hoje, trocando só a tag do template de cada um.
5. **Atualiza os 5 consumidores**: `visualizar.page.html` remove `[modo]`;
   `detalhe-jogador.page.html`, `previa-jogador.page.html`, `painel-encontro.page.html` e
   `ficha-flutuante-conteudo.component.html` trocam `<app-ficha-visualizacao modo="compacto">` por
   `<app-ficha-campanha-card>` (sem input de modo, que deixou de existir).
6. **Testes**: `ficha-visualizacao.component.spec.ts` mantém só os casos do completo; nasce
   `ficha-campanha-card.component.spec.ts` cobrindo o que hoje está espalhado nos specs dos 4
   consumidores + nos casos de `modo="compacto"` do spec atual — sem duplicar teste de uma
   funcionalidade que não existe naquele componente.

## Critérios de Aceite

1. Suíte completa do `frontend` passa; nenhum consumidor muda de comportamento visual ou funcional
   em relação a antes da spec.
2. Nenhum `@if (modo...)`/`@else` de alternância de modo sobra em `ficha-visualizacao` nem em
   `ficha-campanha-card`; `modo` não existe mais como `@Input()` em nenhum dos dois.
3. Verificação ao vivo dos **5 consumidores** (não só um) nos 4 viewports padrão do projeto —
   `1920×1080`, `960×1080`, `1366×768`, `360×800` — comparando com o comportamento de antes da
   spec: ficha embutida do jogador, prévia do mestre, painel de Iniciativa, ficha flutuante e a
   rota de ficha completa.
4. Nenhuma funcionalidade perdida em nenhum consumidor — dadinho de rolar, edição no próprio
   lugar, preview de avatar, Sanidade/Extras/História (só no completo), tudo conferido
   presente/ausente exatamente como hoje.

## Fora de Escopo

- Mudar qualquer regra, cálculo, dado ou comportamento visível — é refactor estrutural puro.
- Implementar o redesenho visual de `ui-34-ficha-completa-redesenho` (entra depois, já mirando só
  `FichaVisualizacao` isolado — essa é justamente a razão de ordem desta spec vir primeiro).
- Unificar ou redesenhar o que hoje diverge de propósito entre completo e compacto (abas
  disponíveis, exclusividade de Sanidade/Extras/História) — a divergência de **feature** continua
  idêntica; só a implementação deixa de compartilhar arquivo.
- Renomear o conceito "compacto"/"padrão" em rotas, DTOs, backend ou testes fora do componente de
  ficha em si.

## Dependências

- Os 5 arquivos consumidores listados na tabela acima.
- `FichaEdicaoService`/`FichaRolagemRegistroService` — injetados por página via `providers: []`,
  não pelo componente de ficha; confirmar que nenhum dos dois componentes novos assume um provider
  específico que só existia porque tudo vivia num componente só.
- `ui-34-ficha-completa-redesenho.spec.md` (`docs/specs/active/`) depende desta spec estar
  concluída antes de começar — atualizar as referências de arquivo/linha desse spec depois da
  separação, já que os números de linha citados lá valem para o `FichaVisualizacao` de hoje
  (ainda compartilhado), não para o isolado.

## Riscos e Mitigação

- Maior risco do refactor: tentar extrair sub-componentes compartilhados **antes** de ver os dois
  templates completos lado a lado sem `@if`. Por isso o item 1 é bifurcar primeiro (duplicação
  total, zero regressão por construção) e só depois enxugar por extração — nunca as duas coisas na
  mesma leva de commits.
- `FichaCampanhaCard` como nome não descreve bem `painel-encontro`/`FichaFlutuante` (não são
  "cards" visualmente) — decisão consciente do autor; deixar um comentário no cabeçalho do
  componente explicando a origem do nome, pra quem ler o código não estranhar.
- Specs antigas (`m3-38`, `m2-20`, `m2-21`, `ui-33`) descrevem o comportamento de "compacto" com a
  linguagem de `modo` — ficam como registro histórico correto (não devem ser reescritas); quem ler
  essas specs no futuro precisa saber que o conceito virou componente próprio a partir desta spec.
- Um 6º consumidor fora do grep (teste e2e, storybook, etc.) pode existir — conferir com
  `git grep -n "app-ficha-visualizacao"` no início da implementação, não confiar só nesta lista.
