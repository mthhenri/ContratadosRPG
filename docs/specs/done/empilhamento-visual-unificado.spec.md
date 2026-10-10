# empilhamento-visual-unificado.spec.md

> Task avulsa, pedido do autor em 09/10/2026. Unifica o desenho dos empilhamentos (■□) de
> modificações e amplificadores nas Regras e em toda tela de item, e mostra custo/peso das
> modificações nas Regras. **Backlog: não implementada.** Decisões do autor registradas abaixo.

## Objetivo

Um único primitivo de empilhamento, com quadradinhos legíveis e separados, usado nas Regras
(modificações e amplificadores) e em todas as telas que hoje mostram `Nome ×N` ou `N/M stacks`.
O primitivo distingue os empilhamentos **iniciais** (concedidos pela primeira compra), os
**comprados depois** e os **vazios**. As tabelas de modificações das Regras passam a mostrar
custo e peso.

## Estado atual (levantado em 09/10/2026)

- **Regras → Modificações** (`regras-modificacoes.component.*`): `■□` são caracteres de texto
  (mono 14px) colados; só o `■` recebe `var(--accent)`, e o `□` em `--text-mute` quase some.
- **Regras → Amplificadores**: sem bloco próprio. `regras-tabela.component.ts` (`amplificadores()`)
  os reconhece pelo cabeçalho `Nome|Efeitos` + `■□`, e os quadradinhos saem como texto em negrito
  comum, **sem cor do tema**.
- **Telas de item**: não há quadradinhos. Mostram texto `Nome ×N` / `N/M stacks` em
  `ficha-inventario.component.html` (mods e amplificadores), `compras.page.html` (Simulação),
  `inventario-esquadrao.component.html` e `npc-equipamento.component.html`.
- Os dados já existem no `shared`: `ModificacaoDados.empilhamentosIniciais`/`empilhamentoMaximo`/`peso`,
  `AMPLIFICADORES`, `CUSTO_MODIFICACAO`, `CUSTO_MODIFICACAO_PADRAO`, `PESO_MODIFICACAO_PADRAO`
  (`shared/src/regras/compras/compras.dados.ts`), `obterPesoModificacao`/`obterCustoModificacao`
  (`compras.ts`).

## Decisões do autor (09/10/2026)

1. **Três estados por quadradinho:** *inicial*, *comprado* e *vazio*. O inicial usa um tom
   derivado do accent: **mais claro na base escura** e **mais escuro na base clara**, para manter
   o contraste com o fundo. O comprado usa o accent puro. O vazio é só contornado.
   - Nas **Regras** todo `■` é inicial (não há compra), então aparece no tom de início.
   - No **item**: os iniciais no tom de início, os comprados depois no accent e o restante vazio.
     Exemplo: Pesada (`■■■□□`) com 4 empilhamentos fica 3 iniciais, 1 comprado e 1 vazio.
2. **Custo e peso nas Regras:** cada tabela de modificações ganha uma linha com o custo e o peso
   padrão **da categoria** ($ 750 · +0,2 por modificação; Explosivos e Munições $ 250;
   Armazenamento $ 300 e sem peso). Uma modificação só mostra o próprio peso quando ele **difere**
   do padrão da categoria (ex.: Pesada, Plasma e Blindada +0,5; Furtiva sem peso).
3. **Quadradinhos em todos os lugares** que hoje mostram empilhamento por texto, nesta mesma task.
4. **Novo primitivo em `shared/ui/`** autorizado pelo autor para esse fim.

## Entregáveis

> Anexos da task: `empilhamento-visual-unificado/` ao lado desta spec, movida junto dela.
> Capturas e saídas brutas: `.artifacts/empilhamento-visual-unificado/` (local, ignorada).
> Política: `docs/SYSTEM.SPEC.md` §3.1.

1. **Primitivo `app-empilhamento`** em `frontend/src/app/shared/ui/empilhamento/`. Entradas:
   `iniciais`, `atuais` (opcional; ausente = leitura de regra, em que os preenchidos são só os
   iniciais), `maximo` e `rotulo` para leitura assistiva. Os quadradinhos são caixas desenhadas
   em CSS (borda, tamanho e espaço entre eles em tokens), não caracteres de fonte.
   `role="img"` + `aria-label` descritivo (ex.: "Empilhamento 4 de 5, 3 iniciais"). Teste
   unitário dos três estados, inclusive `atuais` < `iniciais` (0 comprados) e `atuais` = `maximo`.
2. **Tom do inicial derivado em tempo de execução**, sem hex: tem que acompanhar o preset de
   accent, a base clara/escura e a cor própria de ficha (m3-61), quando a ficha sobrescreve
   `--accent` localmente. Caminho preferido: `color-mix()` calculado **no próprio primitivo**
   entre `var(--accent)` e um extremo que já inverte com a base (ex.: `var(--text)`). Um token
   novo na raiz não serve se a ficha sobrescreve `--accent` abaixo dela, porque a mistura ficaria
   presa ao accent da raiz. O comprado precisa ser distinguível do inicial nas duas bases e em
   todos os presets de accent; registrar a conferência.
3. **Regras → Modificações** usam o primitivo no lugar dos caracteres. A linha de custo e peso
   padrão aparece no topo de cada tabela. O peso próprio aparece só nas modificações que diferem.
   Os valores vêm do motor (`shared/regras/compras`): não redefinir números no renderer nem
   extrair do texto do efeito. Teste que compara catálogo do motor e tabelas do documento
   (nomes, iniciais, máximo) e falha se divergirem.
4. **Regras → Amplificadores** ganham bloco tipado próprio no normalizador
   (`frontend/scripts/`, mesmo padrão de `regras-equipamentos.mjs`) e renderer com o mesmo shell
   das modificações, usando o primitivo. Remover a detecção ad hoc `amplificadores()` de
   `regras-tabela` e o CSS `.regras-tabela--amplificadores`. Regenerar `sistema.json` pelo script
   canônico, nunca à mão. Custo dos amplificadores fora do escopo desta linha (já está no texto
   da seção).
5. **Telas de item** passam a usar o primitivo em todos os pontos que hoje mostram empilhamento
   por texto:
   - `ficha-inventario`: mods do item (`Nome ×N`), amplificadores (`N/M stacks` e `máx. N`);
   - `compras.page` (Simulação): mods e amplificadores;
   - `inventario-esquadrao`: mods;
   - `npc-equipamento`: mods.

   Contadores agregados ("Amplificadores (x/y stacks)", limite Vontade × 3) e `×N` de
   **quantidade** de item **não** são empilhamento e continuam como texto. Os estados já existentes
   ficam preservados ao lado dos quadradinhos: Excedente, De Fragmento, "não conta no total",
   penalidade de Vontade.
6. **Casos de borda resolvidos e documentados** no relato:
   - mod custom (máximo vindo do formulário, iniciais = 1);
   - mod aplicada por Fragmento;
   - mod **Excedente** (acima do limite da patente);
   - amplificador com `maximoEfetivo` menor que o máximo próprio (Vontade disponível): os
     quadradinhos mostram o máximo próprio, e o limite efetivo continua no texto;
   - mod sem empilhamento (`■`, máximo 1).

   Se algum desses casos não tiver uma leitura óbvia, **perguntar ao autor** antes de decidir.

## Critérios de Aceite

- Primitivo com testes dos três estados e do `aria-label`; suítes de `shared`, frontend e
  normalizador passando; build e lint limpos.
- O mesmo desenho de empilhamento, no mesmo tamanho e tom, aparece nas Regras (modificações e
  amplificadores) e nas quatro telas de item. Nenhum `■□` como caractere ou `×N`/`stacks` de
  empilhamento sobrando (busca no código).
- Inicial, comprado e vazio distinguíveis nas bases escura **e** clara, com accent padrão, ao
  menos um preset alternativo e uma ficha com cor própria.
- Gate visual com as skills `design-fidelity` e `verify`. Análogo: `regras-modificacoes` (shell
  e densidade dos itens) e o cartão de mod em `ficha-inventario`. Viewports **1920×1080,
  1366×768, 960×1080 e 360×800**. Estados: Regras (página e painel flutuante) nas seções
  Equipamentos e Amplificadores; inventário com mods de iniciais 1 e > 1, parcial e cheio,
  Excedente e De Fragmento; Simulação; inventário do esquadrão; NPC. Sem overflow e com contraste
  conferido nas duas bases.
- `npm run repo:verificar` no fecho; `--staged` antes do commit.

## Fora de Escopo

- Alterar regras, custos, pesos ou limites. Se motor e documento divergirem, registrar em
  `PROBLEMS.md` sem corrigir aqui.
- Botões de adicionar/remover empilhamento, fluxos de compra e validações de limite: só o
  desenho muda.
- Interatividade nos quadradinhos (clicar para comprar).
- PDF das Regras e as specs `regras-visual-*`.

## Dependências

`docs/core/sistema-v4.1.4.md` (Modificações, Empilhamento, tabelas `⬥ Modificações` por
categoria, Amplificadores); `shared/src/regras/compras/`; `docs/design/DESIGN.md` e
`docs/design/tema/`; `tema.service.ts` (bases e accent em runtime).

## Riscos e Mitigação

- **Tom do inicial fixado em hex ou token de raiz:** quebra com preset/cor de ficha. Mitigação:
  entregável 2 e conferência com cor de ficha.
- **Inicial e comprado parecidos demais:** a diferença é só de tom. Se a conferência visual
  mostrar baixa distinção, levar ao autor antes de inventar outro sinal.
- **Ler peso do texto do efeito:** frágil. Usar o catálogo do motor (entregável 3).
- **Sessões concorrentes** no `ficha-inventario`/`compras.page`: reconferir `git status` antes de
  editar e de commitar.
