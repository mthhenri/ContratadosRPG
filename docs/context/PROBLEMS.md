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

### P-075 — Botão "voltar ao topo" do editor Markdown usa token de sombra inexistente · `ABERTO` · frontend

- **Sintoma:** `.editor-markdown__voltar-topo` declara `box-shadow: 0 8px 20px var(--shadow)`, mas
  `--shadow` não existe em `_tokens.scss` — a sombra não é aplicada.
- **Causa:** token inventado na criação do botão; nunca houve `--shadow` no tema.
- **Contorno:** o botão continua legível pelo fundo `--accent`.
- **Correção:** trocar pela receita já usada no produto (`color-mix(in srgb, var(--bg) 62%,
  transparent)`, a mesma da barra ancorada do editor) ou decidir um token de sombra no tema. O
  botão também é um `<button>` nativo estilizado à mão — candidato a `app-botao-icone`.
- **Desde:** achado em 2026-09-23 na revisão do editor Markdown (fora do escopo daquela task).

### P-078 — Jogador sem ficha no celular não encontra o histórico de rolagens da campanha · `ABERTO` · frontend/campanha

- **Sintoma:** em `360×800`, o jogador sem ficha na campanha abre `/campanhas/:id` e vê só "Você
  ainda não tem uma ficha nesta campanha" com os botões "Criar nova ficha", "Vincular ficha
  existente" e "Ver Esquadrão". Nenhum cartão de rolagem aparece e nada indica que o histórico
  existe. No desktop o painel lateral de Rolagens aparece normalmente.
- **Causa:** em `detalhe-jogador.page.html`, o painel lateral (Rolagens/Esquadrão/Inv. Esquadrão)
  recebe `detalhe__jogador-lateral--oculto-mobile` (`display: none`) enquanto
  `destinoMobileFicha()` for diferente de `'rolagens'`. O sinal começa em `'agente'` e só muda
  pela `.ficha-nav` da ficha embutida (`abaStatusMudou` → `aoMudarDestinoFicha`), que não existe
  sem ficha. A única saída é `abrirEsquadraoSemFicha()`, que abre o painel já na aba Esquadrão.
- **Contorno:** tocar em "Ver Esquadrão" e depois na aba "Rolagens" do painel lateral. Conferido
  ao vivo em 2026-09-24: o feed da campanha aparece completo, com os 7 cartões.
- **Correção:** a decidir com o autor. Uma opção é mostrar o painel lateral no mobile sem ficha
  (por exemplo, abrir em "Rolagens" por padrão ou exibir o painel abaixo do estado vazio). Outra é
  dar ao estado vazio uma ação "Ver rolagens" ao lado de "Ver Esquadrão". É mudança de UI: exige o
  gate visual (`design-fidelity` + `verify`).
- **Desde:** achado em 2026-09-24 na verificação ao vivo da `p-076`, com uma conta de jogador sem
  ficha. O comportamento é anterior a essa task.

