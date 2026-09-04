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

### P-046 — `GET /campanha/:id` devolve os dois códigos de convite a qualquer JOGADOR · `ACEITO` · backend

- **Sintoma:** `CampanhaRecuperadaDto.codigoConvite`/`codigoConviteEspectador` chegam sempre
  preenchidos nessa consulta, mesmo para um `JOGADOR` — só o mestre gerou os códigos, mas qualquer
  membro que chame `recuperarCampanha` (ou a tela que consome esse endpoint) os vê. Diferente de
  `CampanhaResumoDto` (usado na listagem), que já gateia por `CASE WHEN papel = MESTRE` desde antes
  do m8.
- **Causa:** recorte pré-existente ao papel `ESPECTADOR` (m8-01/m8-02) — `m8-01` já registrou o gap
  para `codigoConvite`, e `codigoConviteEspectador` nasceu com o mesmo recorte para não abrir uma
  inconsistência entre os dois campos. O `m8-02` fechou a parte que lhe cabia (`ESPECTADOR` agora é
  rejeitado neste endpoint inteiro, `UnauthorizedAccessException` — usa a projeção dedicada do
  painel), mas decidiu não estender o fechamento ao recorte `JOGADOR`, que é comportamento em
  produção anterior ao módulo M8 e fora do objetivo das duas specs.
- **Contorno:** nenhum — não é urgente (um jogador já está dentro da campanha; o código de convite
  não é um segredo capaz de dano fora dela).
- **Correção:** gatear os dois campos por `this.ehMestre(papel)` em `recuperarCampanha`
  (`CampanhaService`), devolvendo `null` para `JOGADOR` — mesma forma de `CampanhaResumoDto`. Exige
  decidir se algum consumidor do frontend depende do valor não-nulo para não-mestre antes de mudar
  o contrato.
- **Desde:** comportamento anterior ao M8; registrado explicitamente em `m8-01` (2026-09-03) e
  reafirmado como decisão consciente de escopo em `m8-02` (2026-09-03).

### P-048 — Botões de ícone soltos sem passar por `app-botao-icone` · `ABERTO` · frontend

- **Sintoma:** alguns controles clicáveis do app são `<button>`/`<a>` com classe BEM local e
  estilo próprio em vez do primitivo `shared/ui/botao-icone` (ou `app-botao` quando o alvo é
  `<a>`) — por exemplo `.detalhe__membro-acao` (ações "Transferir mestre"/"Alternar
  papel"/"Remover" na lista de membros de `detalhe.page.html`), `.detalhe__cabecalho-voltar` e
  `.espectador__voltar` (links de "voltar" com ícone), `.detalhe__cabecalho-menu-botao`/`⋯` (menu
  de ações), `.rolagem-pill__d20`. Funcionam e usam tokens de design corretamente, mas não passam
  pela biblioteca — cada um reimplementa hover/foco/tamanho na mão.
- **Causa:** convenção antiga do projeto (a maioria desses controles é anterior à `shared/ui/`
  atual) nunca revisitada; a `m8-03` seguiu o padrão já existente ao adicionar "Alternar papel"
  ao invés de o corrigir, por estar fora do recorte da task.
- **Contorno:** nenhum — o comportamento visual está correto hoje, é dívida de arquitetura/reuso,
  não defeito visível.
- **Correção:** levantamento completo feito em 2026-09-04 (agente de exploração): **130 classes
  distintas / 201 ocorrências** fora do padrão em quase todo módulo do frontend — tamanho de
  milestone. Dividido na série `ui-28`…`ui-32`
  (`docs/specs/backlog/INDEX-adocao-total-botao-icone.md`), com duas decisões do autor já tomadas
  (2026-09-04): `app-botao-icone` ganha suporte a `<a>` **e** um tamanho `mini` sem borda (padrão
  "ícone inline", ex. `.rolagem-pill__d20`); o subconjunto "valor editável clicável" (Grupo C do
  levantamento) fica fora desta série, registrado à parte em `P-057`. **`ui-28` concluída e movida
  para `docs/specs/done/`** (fundação do primitivo + `shared/` + `modules/campanha`, inclui os 5
  controles originais desta entrada) — ver `HISTORY.md` para o relato completo, inclusive uma
  exceção descoberta só na implementação (`utilitario-flutuante`, botão de ação flutuante já
  compartilhado por 6 consumidores, com posicionamento `fixed` que o primitivo não cobre).
  **`ui-29` (`modules/encontro`) concluída** — `cartao-combatente`, `log-encontro`,
  `rolagem-avulso` e `painel-encontro.page` adotam `app-botao`/`app-botao-icone`; achado à parte
  na implementação e registrado em `P-058` (`ficha-flutuante.component` reimplementa a mesma
  janela flutuante de `app-painel-flutuante`, ui-17 — os três botões de janela migraram para
  `app-botao-icone`, mas a duplicação de componente fica de fora desta série). **`ui-30`
  (`modules/ficha`, lado não-criatura) concluída** — os 12 arquivos do entregável adotam
  `app-botao`/`app-botao-icone`, com três desvios do texto da spec resolvidos a favor do código/UX
  real (`.sanidade__add` e `.ficha-hud__vitais` foram para `app-botao`, não `app-botao-icone` —
  ambos têm estado com texto/conteúdo rico que a caixa fixa do ícone quebraria) e um achado que
  virou extensão do primitivo, decidida pelo autor: `app-botao-icone` ganhou o input `[redondo]`
  (raio 50%) para os selos circulares de `ficha-ident__avatar-enquadrar`/`-remover` e
  `ficha-mini__info`, que sempre foram círculos, não retângulos arredondados. `ui-31`/`ui-32`
  (criatura, simulação/usuário) seguem em `docs/specs/backlog/`, ainda não implementadas — a
  entrada permanece `ABERTO` até a série inteira fechar.
- **Desde:** dívida pré-existente; nomeada e registrada explicitamente a pedido do autor após a
  auditoria de conformidade da `m8-03` com a nova regra de biblioteca de componentes (2026-09-03);
  escopo completo medido e dividido em 2026-09-04.

### P-051 — Quatro telas recriam a identidade de `app-esqueleto` · `ABERTO` · frontend/design system

- **Sintoma:** Perfil, detalhe de campanha e as visualizações de jogador/criatura possuem
  `.esqueleto-bloco`, `@keyframes esqueleto-pulso` e tratamento de movimento reduzido locais.
- **Causa:** os esqueletos extensos nasceram antes de `app-esqueleto`; a adoção da UI-14 cobriu
  listas, mas não revisitou essas quatro telas.
- **Contorno:** nenhum; a aparência funciona, mas quatro donos podem divergir.
- **Correção:** usar `app-esqueleto` como bloco base e manter local somente a geometria de cada
  silhueta. Recorte e evidência em `docs/design/AUDITORIA-COMPONENTES-FANTASMA.md`.
- **Desde:** confirmado na auditoria UI-27 (2026-09-03).

### P-052 — Iniciativa recria o cabeçalho de `app-cartao` · `ABERTO` · frontend/design system

- **Sintoma:** `painel-encontro.page` declara e monta localmente `cartao__cabecalho`, índice,
  título e régua, incluindo identidade tipográfica e de acabamento já pertencente a `app-cartao`.
- **Causa:** a tela foi construída com a anatomia visual do cartão, sem consumir o primitivo.
- **Contorno:** nenhum; hoje as duas implementações precisam evoluir em paralelo.
- **Correção:** compor os estados da Iniciativa com `app-cartao`; só evoluir sua API se a inspeção
  ao vivo provar a necessidade de uma variante estrutural.
- **Desde:** confirmado na auditoria UI-27 (2026-09-03).

### P-053 — Modais de campanha repetem cabeçalho e rodapé dentro de `app-modal` · `ABERTO` · frontend/design system

- **Sintoma:** Vincular, Duplicar e Acesso de Visualização usam `app-modal`, mas projetam dentro
  dele outro painel com título, índice, régua e `.dialogo__acoes`.
- **Causa:** a migração para o modal nativo trocou o overlay sem adotar integralmente os slots
  `modalIcone` e `modalAcoes`.
- **Contorno:** nenhum; visualmente existe um modal dentro do contrato de outro modal.
- **Correção:** remover a segunda casca e projetar ícone/conteúdo/ações nos slots; confirmar se o
  slot de ações precisa aceitar um wrapper condicional antes de ampliar a API.
- **Desde:** confirmado na auditoria UI-27 (2026-09-03).

### P-054 — Simulação mantém stats paralelos a `app-stat` · `ABERTO` · frontend/design system

- **Sintoma:** Agente, Novo Agente, Patente, Descanso e Compras mantêm `.agente-stat`/`.calc-stat`
  com a mesma anatomia de rótulo, valor, nota e tom do primitivo existente.
- **Causa:** o primitivo nasceu dessa família, mas os consumidores originais não foram migrados.
- **Contorno:** nenhum; alterações de densidade, semântica e acessibilidade precisam ser repetidas.
- **Correção:** adotar `app-stat` nos casos cobertos e ampliar somente a lacuna comprovada por um
  consumidor real.
- **Desde:** confirmado na auditoria UI-27 (2026-09-03).

### P-055 — Estados vazios densos não cabem no primitivo atual · `ABERTO` · frontend/design system

- **Sintoma:** listas compactas de Encontro e Ficha repetem parágrafos `__vazio`; o
  `app-estado-vazio` atual impõe uma caixa com 32px de respiro vertical, grande demais para elas.
- **Causa:** UI-14 centralizou somente os estados vazios amplos e não definiu densidade compacta.
- **Contorno:** manter texto local evita inflar as listas, mas fragmenta tipografia e semântica.
- **Correção:** acrescentar variante compacta baseada nos consumidores reais e migrar apenas
  vazios de lista; mensagens de ajuda, carregamento e validação permanecem locais.
- **Desde:** confirmado na auditoria UI-27 (2026-09-03).

### P-056 — Três controles segmentados têm identidade local · `ABERTO` · frontend/design system

- **Sintoma:** Caderno, Leitor de Documentos e Inventário da ficha implementam separadamente grupo
  de seleção única, item ativo, foco, borda, raio e responsividade.
- **Causa:** `app-abas` tem semântica de tabpanel e corretamente não cobre seletores de modo com
  `aria-pressed`; falta um primitivo com papel próprio.
- **Contorno:** os três funcionam, mas acumulam deriva visual e de interação.
- **Correção:** criar `app-segmentado` a partir dos três contratos reais, com item por diretiva,
  seleção única, foco, desabilitado e densidade compacta.
- **Desde:** confirmado na auditoria UI-27 (2026-09-03).

### P-057 — "Valor editável" clicável não tem primitivo próprio · `ABERTO` · frontend/design system

- **Sintoma:** ~15 classes/32 ocorrências (`criatura__designacao`, `criatura__stat-valor`,
  `criatura__vitalidade-valor`/`-maxima`, `criatura__tag-valor`, `criatura__info-nota-texto`,
  `ficha-inv__carga-valor`/`__municao-valor`, `ficha-ident__nome`/`__contrato`/`__meta-valor`,
  `ficha-mini__valor`, `ficha-resistencia__valor`, `barra-recurso__valor-atual`/`__max`) mostram um
  valor/dado da ficha e, ao clicar, viram um `<input>` de edição inline — reimplementam cursor,
  hover e foco na mão, mas não são bem uma "ação única" (`app-botao-icone`) nem um "botão com
  texto" (`app-botao`): é mais perto de um campo de formulário disfarçado de valor.
- **Causa:** nenhum primitivo de `shared/ui/` cobre esse papel; nasceram como CSS local em cada
  tela que precisou do padrão.
- **Contorno:** funcionam, mas cada tela reimplementa a mesma identidade separadamente.
- **Correção:** decisão do autor pendente — criar um primitivo próprio (`app-valor-editavel`?) ou
  esticar `app-botao` (`estilo="texto"`) para cobrir o papel. Nenhuma das duas é escolha
  unilateral do agente (ver "Biblioteca de componentes é obrigatória" em `CLAUDE.md`/`AGENTS.md`).
- **Desde:** encontrado no levantamento completo do `P-048` (2026-09-04) — fora do escopo da série
  `ui-28`…`ui-32` (`docs/specs/backlog/INDEX-adocao-total-botao-icone.md`) por decisão do autor.

### P-058 — `ficha-flutuante.component` reimplementa `app-painel-flutuante` · `ABERTO` · frontend/design system

- **Sintoma:** `modules/encontro/componentes/ficha-flutuante` tem sua própria janela arrastável,
  redimensionável, minimizável e maximizável (geometria, arraste, `[hidden]`, cabeçalho com "//" +
  régua + botões de minimizar/maximizar/fechar) — a mesma anatomia e mecânica de
  `shared/ui/painel-flutuante` (ui-17), que já é a versão compartilhada dessa janela e hospeda
  `leitor-documentos`, `caderno-flutuante` e a calculadora flutuante.
- **Causa:** não confirmado se `ficha-flutuante` nasceu antes de `app-painel-flutuante` existir ou
  se só não foi revisitado depois — o comentário do componente já cita "mesma mecânica de
  `leitor-documentos`" sem apontar para o primitivo.
- **Contorno:** funciona; os três botões de janela já adotam `app-botao-icone` (`ui-29`), mas a
  geometria/arraste/redimensionamento continuam duplicados à mão.
- **Correção:** decisão do autor pendente — migrar `ficha-flutuante` para hospedar seu conteúdo
  dentro de `app-painel-flutuante` (como os demais três consumidores já fazem) é uma refatoração de
  componente, não uma troca de classe CSS; maior que o escopo de "adotar `app-botao`/
  `app-botao-icone`" da série `ui-28`…`ui-32`.
- **Desde:** achado durante a implementação de `ui-29` (2026-09-04), fora do escopo daquela tarefa.
