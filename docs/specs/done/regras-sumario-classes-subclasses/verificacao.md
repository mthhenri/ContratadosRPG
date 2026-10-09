# Verificação — sumário de classes e subclasses

09/10/2026. Pedido do autor: classes/subclasses ausentes do menu lateral do Sistema.

## Causa e correção

O normalizador reconhecia os nomes dentro de tabelas como `classe` e `subclasse`,
mas esses blocos não tinham âncora. O sumário e o observador só navegavam às seções.
O normalizador agora deriva seis destinos dos nomes, reservando todas as âncoras de seção
antes de atribuí-los. Colisões ganham sufixo sem mudar destinos preexistentes.
`construirSumarioRegras` e `listarAncorasRegras` incluem os dossiês na ordem da fonte.
Os cartões usam `RegrasLeitorContexto` para IDs por leitor e `data-ancora-regras` para navegação.
A âncora é opcional no contrato para preservar fixtures/consumidores de blocos avulsos.

Combatente, Especialista e Suporte ficam sob Classes e Arquétipos; Experimento Bestial,
Artificial e Híbrido sob Subclasse. Arquétipos/habilidades não ganharam entradas.
Fonte do livro, fórmulas, PDF, controles e estilo não foram alterados.

## Gates automatizados

- Regressão adicionada primeiro: falhou com seis âncoras `undefined`; passou após a correção.
- `npm run test --workspace=frontend -- --watch=false`: 67/67 testes do normalizador,
  231 arquivos e 3.128/3.128 testes Angular aprovados. Inclui colisão com título de seção,
  nomes repetidos, hierarquia, compatibilidade sem âncora e destino renderizado por leitor.
- `npm run lint --workspace=frontend`: zero erros; 26.974 avisos do conjunto legado.
- `npx prettier --check` nos dois templates tocados: aprovado.
- `CI=true npm run build --workspace=frontend`: aprovado, assets publicados fiéis aos dois
  Markdown vigentes. Aviso existente de bundle: 589,54 kB ante limite de 450 kB.
- `npm run repo:verificar`: organização e espelhos aprovados.
- Revisão manual do diff contra a spec e `convencoes-check`: sem DTO, fórmula, permissão,
  SQL ou controle novo; nenhuma responsabilidade de navegação adicionada ao leitor extenso.
  As pequenas projeções de ID ficaram nos dois renderizadores donos de seus cartões.
  Busca nas linhas adicionadas por hardcodes, `style=`, `ngModel`, `NgModule`, nomes
  `atualizar*` e DTO fora de shared não encontrou violações.

## Aplicação real — verify e design-fidelity

Frontend existente em `http://localhost:4300`, sem precisar de login ou banco para esta rota
pública. Playwright/Chromium, viewports 1920×1080 e 360×800; página e painel simultâneos.
As capturas foram inspecionadas pessoalmente pelo agente principal.

Análogo: o próprio sumário aprovado de `RegrasLeitor`, incluindo Maestrias/DTs como filhos
de Atributos. Recursão, recuo de 12 px, tipografia/densidade, cores, seleção por borda,
foco global e gaveta existentes foram reutilizados. Nenhum controle local ou estilo criado.

Nos dois viewports foram conferidos os seis destinos por teclado/Enter, fragmentos de URL,
seleção ativa, recarga no Experimento Híbrido e seleção por rolagem manual. No mobile a
gaveta fecha ao navegar e todos os seis links têm altura mínima de 44 px. No painel, clicar
Combatente move sua rolagem local sem alterar URL ou posição da página de fundo; os dois
cartões Combatente têm IDs distintos. Zero erros de runtime e zero overflow horizontal.

Comparação aprovada: mesma identidade, densidade e hierarquia do análogo; controles,
iconografia, contraste e foco canônicos; sem aparência de HTML genérico ou corte dos novos
itens. Capturas iniciais feitas durante a transição da gaveta foram refeitas após aguardar
a animação; o corte transitório não era divergência do produto.

## Limites e pendências externas

Não há aceite obrigatório pendente desta tarefa. Capturas, executor e logs em
`.artifacts/regras-sumario-classes-subclasses/` são locais/ignorados e não vêm no clone.
O relatório descreve as evidências sem depender delas.

Tentativas no sandbox falharam por rede restrita (fontes/localhost) e EPERM no cache temporário
do executor de testes; repetidas com acesso autorizado e aprovadas. O build habitual fora
do sandbox voltou a falhar com código nativo `3221225477`; `CI=true`, que desabilita o cache
somente nessa execução, passou. Recorrência registrada em P-111, sem investigar ou alterar
a configuração de cache nesta tarefa. O servidor do autor foi preservado.

A alteração preexistente em `docs/core/sistema-v4.1.4.md` foi preservada integralmente;
os assets de teste/build refletem a fonte atual. Nenhum commit ou push realizado.
