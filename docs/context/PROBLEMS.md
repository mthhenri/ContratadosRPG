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
  mas `docs/core/sistema-v4.1.0.md` só define Treinamento 0–5 pra Civil (sem noção de Prestígio;
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

### P-019 — `painel-flutuante.component.spec.ts` falha por ordem quando a suíte completa roda · `ABERTO` · frontend

- **Sintoma:** o teste "ao abrir, limita uma posição persistida que ficou fora do viewport e
  salva a correção" falha (`900px` em vez do `1280px` esperado) quando `npm run test
  --workspace=frontend` roda a suíte inteira, mas passa 18/18 quando rodado isolado
  (`--include=.../painel-flutuante.component.spec.ts`).
- **Causa:** não investigada — cheiro de vazamento de estado global entre specs (viewport,
  `localStorage` ou mock não resetado por outro arquivo que roda antes na mesma suíte), não do
  próprio teste ou do componente.
- **Contorno:** rodar o arquivo isolado quando for preciso confiar no resultado deste caso.
- **Correção:** isolar a causa do vazamento (bisseção de specs até achar o vizinho que deixa
  estado sujo).
- **Desde:** achado no gate de testes da `montador-rolagem-ajustes` (2026-09-17). O arquivo em si
  não foi tocado por esta task; não confirmado se já falhava assim antes dela.

### P-020 — `inventario-esquadrao.component.spec.ts` falha (busca do catálogo devolve 2 cards em vez de 1) · `ABERTO` · frontend

- **Sintoma:** o teste "filtra os itens do catálogo pela busca sem decorar o nome com ícone"
  espera `1` card (`.inventario-esquadrao__catalogo-item`) depois de buscar "Energético
  Concentrado", mas recebe `2`. Reproduz isolado (`--include=.../inventario-esquadrao.component.spec.ts`),
  não é sensível à ordem da suíte.
- **Causa:** não investigada.
- **Contorno:** nenhum.
- **Correção:** depurar o filtro de busca do catálogo do componente ou, se o catálogo de fixture do
  teste mudou, atualizar a expectativa.
- **Desde:** achado no gate de testes do fecho da `montador-rolagem-ajustes` (2026-09-17,
  `npm run test --workspace=frontend` completo). Sem relação com o arquivo alterado nesta task
  (`montador-rolagem/`); não confirmado se já falhava antes dela.

### P-021 — `detalhe-mestre.page.spec.ts` falha ao confirmar duplicação de ficha (`Cannot read properties of undefined (reading 'click')`) · `ABERTO` · frontend

- **Sintoma:** o teste "abre a dialog de duplicar e chama FichaService.duplicarFicha ao confirmar"
  procura um botão com texto "Confirmar duplicação" na dialog e recebe `undefined` — o `.click()`
  seguinte lança `TypeError`. Reproduz isolado, não é sensível à ordem da suíte.
- **Causa:** não investigada — cheiro de rótulo do botão da dialog de confirmação ter mudado (ou a
  dialog não estar abrindo a tempo do teste procurar o botão).
- **Contorno:** nenhum.
- **Correção:** depurar a dialog de duplicação de `CampanhaDetalheMestre` — confirmar o rótulo
  atual do botão de confirmação e se o `fixture.detectChanges()`/espera antes da busca é
  suficiente.
- **Desde:** achado no gate de testes do fecho da `montador-rolagem-ajustes` (2026-09-17,
  `npm run test --workspace=frontend` completo). Sem relação com o arquivo alterado nesta task
  (`montador-rolagem/`); não confirmado se já falhava antes dela.

