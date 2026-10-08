# PROBLEMS.md — Problemas Conhecidos

> **O que entra aqui:** o que está **quebrado, degradado ou aceito como dívida agora**. Um item
> existe aqui enquanto o problema existe. Quando o problema é resolvido, o item **sai deste
> arquivo** — o relato da correção vive em [`HISTORY.md`](HISTORY.md), não aqui.
>
> **O que NÃO entra aqui:** feature que falta (isso é spec no `docs/specs/backlog/`), ideia
> (isso é [`IDEAS.md`](IDEAS.md)), e decisão consciente de design que está funcionando como
> desejado (isso é `CONTEXT.md` §5).
>
> **Estados:** `ABERTO` (dói e não tem contorno) · `CONTORNADO` (dói, mas existe um jeito de
> conviver — o contorno está descrito) · `ACEITO` (não vai ser corrigido; fica registrado para
> ninguém "descobrir" de novo).
>
> **Formato de entrada** — copie o bloco abaixo, numere sequencialmente e **não reaproveite
> número de item removido**:
>
> ```markdown
> ### P-0NN — <título curto> · `ABERTO|CONTORNADO|ACEITO` · <área>
>
> - **Sintoma:** o que se observa.
> - **Causa:** a raiz, se conhecida — ou "não investigada".
> - **Contorno:** como conviver, se houver.
> - **Correção:** o que resolveria de fato, se conhecido.
> - **Desde:** quando apareceu (task/commit/data).
> ```

---

## Ativos

### P-106 — Testes do montador conservam caminho anterior do corpus · `ABERTO` · testes/organização

- **Sintoma:** a suíte shared falha em dois arquivos com ENOENT; a compilação dos
  testes Angular falha com TS2307/TS7006 mesmo no teste focado de outro componente.
- **Causa:** `shared/src/regras/rolagem/rolagem.conta.spec.ts`, `rolagem.pecas.spec.ts`
  e `frontend/src/app/shared/montador-rolagem-experimental/montador-blocos.spec.ts`,
  `montador-pecas.spec.ts` ainda leem `docs/design/propostas/montador-rolagem-formulas.json`.
  O corpus agora está em `docs/specs/active/montador-rolagem-experimento/`.
- **Contorno:** configuração temporária de testes Angular excluindo os dois arquivos;
  M10-05 verificou 214 arquivos/3.060 testes, mas não esses dois. Shared permanece parcial.
- **Correção:** corrigir os quatro ponteiros mecanicamente e executar as suítes completas
  na tarefa de organização, sem duplicar o corpus nem recriar o depósito antigo.
- **Desde:** após a organização documental de 2026-10-08; confirmado na M10-05.

### P-105 — Preparo de assets e testes de Regras ainda apontam para v4.1.3 · `ABERTO` · frontend/documentos

- **Sintoma:** `npm run build --workspace=frontend` para no prebuild com ENOENT do PDF
  `docs/core/sistema-v4.1.3.pdf`. `npm run test --workspaces --if-present` passa shared e
  backend, mas para nos testes do normalizador (34 passam, 6 falham), impedindo a etapa
  Angular na cadeia npm.
- **Causa:** a troca do Sistema para v4.1.4 (`e3da359d`) removeu os arquivos v4.1.3;
  `frontend/scripts/preparar-documentos.mjs` e testes de `normalizar-regras`/
  `regras-personagens`/`regras-equipamentos`/`regras-guia` conservam caminhos antigos.
  A asserção da publicação também exige aviso `sistema-v4.1.3.md:313`.
- **Contorno:** `npx ng test --watch=false` verifica Angular diretamente; `CI=true`
  com `npx ng build` verifica o build Angular usando os assets já preparados. Isso
  não comprova preparo/publicação dos livros a partir de um checkout limpo.
- **Correção:** alinhar preparo, publicação, referências do leitor e testes à fonte
  vigente em tarefa própria; não restaurar o livro antigo nem misturar com M10-03.
- **Desde:** observado no gate M10-03 em 2026-10-08, após a troca de livro já presente
  no começo da sessão. [Resultados separados](../specs/done/m10-03-icones-identidade/m10-03-verificacao.md).

### P-104 — Build Angular encerra com falha nativa usando cache local · `CONTORNADO` · ferramentas/local

- **Sintoma:** `npm run build --workspace=frontend` encerra no Windows com código
  3221225477, durante Building, sem diagnóstico de erro TypeScript. Reproduzido em
  tentativas separadas na M10-02; reduzir workers e desativar TS paralelo não resolveram.
- **Causa:** não confirmada. O mesmo build de produção passou com `CI=true`, que desativa
  o cache local por `@angular/build/src/utils/normalize-cache.js`. A evidência isola um
  contorno de execução, não prova qual componente nativo ou arquivo de cache falhou.
- **Contorno:** executar o build com `CI=true`; gate da M10-02 também usou
  `NG_BUILD_MAX_WORKERS=2`. Não exige alterar `angular.json` nem limites de budget.
- **Correção:** investigar o cache/runtime local em tarefa própria; não apagar caches de
  processos concorrentes nem alterar dependências como parte do normalizador.
- **Desde:** observado também no gate da M10-01; repetido na M10-02, 2026-10-07.

### P-103 — `app-modal` encolhe o corpo em vez de rolar o diálogo · `CONTORNADO` · frontend/ui

- **Sintoma:** com conteúdo mais alto que a tela (ex.: Biblioteca de Referência do NPC em
  `360×800`), o texto do corpo transborda **por cima** do rodapé `[modalAcoes]`, que fica
  inclicável. Achado ao vivo no gate da `m4-21`.
- **Causa:** o `<dialog>` é `display: flex; flex-direction: column` com `overflow-y: auto`, mas
  `.modal__corpo` tem `min-height: 0` e o `flex-shrink: 1` padrão — o corpo encolhe abaixo do
  conteúdo (que vaza, `overflow: visible`) e o diálogo nunca chega a rolar, contrariando o
  próprio comentário do primitivo ("um modal genuinamente alto rola o `<dialog>` inteiro").
- **Contorno:** o consumidor limita a altura do próprio bloco extenso (`max-height` +
  `overflow-y: auto` + `appOverflowFade`), como `ficha-inv__grade` e `npc-biblioteca__grade`.
- **Correção:** `flex: 0 0 auto` (ou `flex-shrink: 0`) em `.modal__corpo`, verificando ao vivo
  os consumidores atuais de `app-modal` — mudança de primitivo, decisão do autor.
- **Desde:** `ui-02` (introdução do `app-modal`); exposto na `m4-21`.

### P-099 — Rastreamento de rolagem resultante: proposta descartada · `ACEITO` · rolagem/contrato

- **Sintoma:** expressão genérica não informa se o usuário fará dano/cura depois;
  Medicina→cura e ataque→dano são operações separadas. O sistema não rastreia esse vínculo.
  O autor descartou a proposta em 2026-10-06; este registro não é correção pendente.
- **Causa:** fórmula descreve esta rolagem, não a intenção futura. A reprodução
  anterior (D20 + Nível + D6 retorna30) não prova o tipo da operação de uma fórmula livre.
- **Contorno:** manter teste e dano/cura posteriores como operações separadas.
- **Correção:** nenhuma execução prevista. Não criar rastreamento, inferir intenção
  futura, alterar classificador ou compensar crítico para executar esta proposta.
  Competência dentro do teste NPC pertence à m4-19; P-099 não é sua dependência.
- **Spec:** [P-099](../specs/backlog/p-099-critico-teste-com-dados-adicionais.spec.md),
  marcada DESCARTADA/NÃO EXECUTAR, preservada para memória, fora da fila executável.
- **Desde:** reprodução em 2026-10-06; proposta rejeitada/retirada após esclarecimento
  do autor na mesma data. Reabertura somente por nova decisão expressa do autor.

### P-093 — Sistema contradiz a si mesmo no arredondamento de bônus · `ACEITO` · docs/core

- **Sintoma:** `docs/core/sistema-v4.1.3.md:1363` (Ordem de Bônus) diz "assim como dito acima, quaisquer valores
  que não sejam inteiros, serão arredondados para cima"; a seção "Arredondamentos" logo acima (`:1353–1359`) manda
  arredondar **para baixo** (exemplo 27,5 → 27) e o motor (`shared/regras`) arredonda para baixo (`LUT/2`).
- **Causa:** provável erro de digitação na seção Ordem de Bônus — o "assim como dito acima" remete justamente à regra que diz
  "para baixo". A única exceção "para cima" documentada é a média de nível do esquadrão (`:1185`), outra regra.
- **Contorno:** vale "para baixo" (decisão confirmada pelo autor em 2026-10-02); o motor e o guia de fórmulas já se
  comportam assim, e a spec `rolagem-expressao-quantidade-dados` também.
- **Correção:** trocar "cima" por "baixo" na linha 1363 do Sistema v4.1.3. **O autor decidiu não alterar `docs/core` por ora**
  (2026-10-02) e pediu só o registro aqui; por isso o item fica `ACEITO`, para ninguém "corrigir" o documento ou o
  motor por conta própria. Reabrir se o autor mudar de ideia.
- **Desde:** identificado em 2026-10-02, ao especificar a quantidade de dados por expressão (I-041).

### P-003 — Backend não valida a estrutura do corpo das requisições · `ACEITO` · backend

- **Sintoma:** nenhum `ValidationPipe` está registrado. Um corpo malformado (campo ausente, tipo
  errado) chega **cru** no service.
- **Causa:** decisão consciente — DTOs são `interface readonly`, e o projeto não instala
  `class-validator` (ver `CONTEXT.md` §5). Sem classe não há decorator para o pipe ler.
- **Contorno:** as services validam regra de negócio e o TypeScript cobre o caminho do frontend
  próprio. O risco real é um cliente de terceiros ou uma chamada manual à API.
- **Correção:** ligar o `ValidationPipe` exigiria converter DTOs em classes — **não fazer sem
  pedir ao autor**, é reversão de decisão registrada.
- **Desde:** `m3-01`, quando a validação estrutural foi explicitamente adiada.

### P-004 — Budget do bundle vem sendo elevado em vez do bundle reduzido · `CONTORNADO` · frontend

- **Sintoma:** o bundle inicial de produção anda colado no teto. O budget do `angular.json` já foi
  elevado pelo menos quatro vezes (575kB → 580kB → 610kB inicial; 34kB → 35kB
  `anyComponentStyle`), sempre para acomodar o que entrou.
- **Causa:** cada task nova soma alguns kB e a saída mais barata é subir o número.
- **Contorno:** subir o budget de novo — é o que vem sendo feito.
- **Correção:** um passe de redução de verdade (auditar o que está no chunk inicial e empurrar para
  lazy). Nunca foi feito.
- **Desde:** `m1-06`, agravando desde então.

### P-008 — Aba "Extras" e a Origem estão no lugar errado para um humano · `ACEITO` · UX

- **Sintoma:** na auditoria ao vivo da `m3-60`, a tarefa "o mestre perguntou da minha origem" leva
  a pessoa à aba **História** (ícone de documento) — e a Origem não está lá, está em **Extras**.
  Some-se que o ícone que nomeia "Extras" é o `mais` (`+`), o mesmo dos botões "Adicionar" do app
  inteiro.
- **Causa:** "Extras" nasceu como posição vazia reservada no redesenho da `m3-38` e foi preenchida
  pela `m3-49` sem revisitar o nome.
- **Contorno:** nenhum.
- **Correção:** renomear a aba e/ou mover a Origem para História.
- **Desde:** `m3-60` — **adiado por decisão explícita do dono**, registrado como dívida de
  nomenclatura.

### P-018 — Guia de criação não respeita as regras específicas do Civil · `ABERTO` · frontend

- **Sintoma:** o dono reportou que o guia de criação de personagem não respeita a mecânica de Civil.
  Um caso concreto encontrado: o passo // Novo agente (nível inicial "arredonda a média da campanha
  − 1", teto de 20, mais o Prestígio) roda **igual pra Civil** — o rótulo, o range do campo manual
  (`min=0 max=20` em "Nível inicial exato") e o resumo mostram "Nível"/"Prestígio" pro Civil também,
  mas `docs/core/sistema-v4.1.3.md` só define Treinamento 0–5 pra Civil (sem noção de Prestígio;
  `dadosCivil` — `shared/src/regras/dados/progressao-civil.dados.ts` — só tem entradas de 0 a 5). Um
  Civil que herda uma média de campanha acima de 5 vira um "Nível" fora da tabela, e
  `calcularProgressaoAcumulada`/`calcularBeneficiosNivel` devolvem lista vazia pra qualquer
  Treinamento > 5, sem avisar o jogador.
- **Causa:** não investigada por completo — o pipeline de "Novo agente"/progressão do guia
  (`criar.page.ts`: `novoAgente`, `nivelInicial`, `prestigioInicial`) não tem nenhum branch pra
  Civil; trata todas as classes com a mesma fórmula/teto/rótulo. Pode haver mais pontos do guia com
  o mesmo problema (o dono não detalhou todos) — escopo completo a confirmar com ele.
- **Contorno:** nenhum.
- **Correção:** escopo mapeado e specado em `docs/specs/backlog/civil-guia-criacao.spec.md`
  (2026-08-24) — cobre // Novo agente (Nível/Prestígio → Treinamento), // Atributos (base e
  orçamento de criação do Civil) e // Equipamento inicial (orçamento fixo, categorias vetadas).
  A spec depende de 4 decisões do dono antes de virar código; ver o arquivo. Outras divergências
  de Civil levantadas na mesma investigação (passo // Recursos, progressão pós-criação) ficaram
  fora do escopo escolhido pelo dono, registradas em "Fora de Escopo" da spec.
- **Desde:** reportado pelo dono em 2026-08-11.
