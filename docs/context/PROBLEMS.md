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

### P-102 — Referências operacionais apontam livros substituídos · `ABERTO` · documentação

- **Sintoma:** README25–26 aponta livros removidos; SCHEMA, FICHA-NPC e specs ativas
  ainda citam v4.1.0/v4.0.0 como fonte corrente, apesar das publicações novas recebidas.
- **Causa:** alinhamento anterior cobriu constituição, instruções, skill e leitor,
  sem inventariar todos os ponteiros operacionais.
- **Contorno:** consultar Sistema v4.1.3 e Guia v4.2.0 em docs/core.
- **Correção:** conferir referência a referência e alinhar as fontes correntes,
  preservando histórico/done e distinguindo comentários de regras superadas.
- **Spec:** [P-102](../specs/backlog/p-102-referencias-documentos-vigentes.spec.md),
  preparada para revisão; sem correção nesta rodada.
- **Desde:** revisão adicional de 2026-10-06 após pedido de preparar todas as specs.

### P-101 — Realocação de Criatura ainda rejeita negativos permitidos no Guia novo · `ABERTO` · shared/frontend

- **Sintoma:** `validarRealocacaoAtributos` retorna “social: valor abaixo de 0” para
  atributo negativo, agora permitido pelo Guia v4.2.0 (`:435`) dentro da realocação.
- **Causa:** regra anterior limitava o mínimo a zero. Guia também esclareceu DT,
  modificador no resultado e sobra de turnos; seus consumidores ainda precisam de inventário.
- **Contorno:** fichas com valores não negativos continuam usando o caminho existente.
- **Correção:** adequar realocação e completar a matriz de consumidores das mudanças do Guia;
  não marcar todos como defeituosos sem verificar nem alterar exemplos autorais incoerentes.
- **Spec:** [P-101](../specs/backlog/p-101-criaturas-guia-v4.2.0.spec.md), preparada,
  sem execução nesta rodada.
- **Desde:** revisão documental de 2026-10-06; reprodução somente em memória.

### P-100 — Criação de NPC impede zerar atributo previsto no Guia novo · `ABERTO` · shared/frontend

- **Sintoma:** fora da exceção Civil, `consultarAtributosCriacao` acusa “inicia em 1”
  para zero e o assistente limita o stepper a 1; Guia v4.2.0 (`:958`) permite retirar esse ponto.
- **Causa:** distribuidor/controle ainda seguem o mínimo anterior; validação da ficha pronta
  já aceita inteiros não negativos.
- **Contorno:** edição da ficha pronta aceita zero; não corrige o assistente de criação.
- **Correção:** devolver o ponto inicial ao saldo e permitir zero na criação, preservando
  orçamento, teto e a base zero de Luta/Pontaria Civil, sem saldo fictício.
- **Spec:** [P-100](../specs/backlog/p-100-npc-criacao-atributo-zero.spec.md), preparada,
  sem execução nesta rodada.
- **Desde:** revisão documental de 2026-10-06.

### P-099 — Fórmula livre não identifica rolagem resultante posterior · `ACEITO` · rolagem/contrato

- **Sintoma:** expressão genérica não informa se o usuário fará dano/cura depois;
  Medicina→cura e ataque→dano são operações separadas. O autor rejeitou a proposta
  de deduzir esse contexto, por considerá-la inútil (2026-10-06).
- **Causa:** fórmula descreve esta rolagem, não a intenção futura. A reprodução
  anterior (D20 + Nível + D6 retorna30) não prova o tipo da operação de uma fórmula livre.
- **Contorno:** ação/contexto explicitamente escolhido pelo mestre; nenhum vínculo
  automático entre teste e dano/cura. Sem compensação local de crítico.
- **Correção:** proposta global retirada da fila. O caso específico de Competência
  pertence à revisão da m4-19, porque o Guia o inclui no próprio teste; ainda revisar
  o contrato do crítico nesse fluxo, sem inferir/dobrar rolagem futura.
- **Spec:** [P-099](../specs/backlog/p-099-critico-teste-com-dados-adicionais.spec.md),
  convertida em registro/revisão, sem execução como correção ou dependência da m4-19.
- **Desde:** reprodução em 2026-10-06; proposta rejeitada/retirada após esclarecimento
  do autor na mesma data. Não reabrir a inferência automática por iniciativa do agente.

### P-098 — Mapa de memória mantém link para spec de auditoria já encerrada · `ABERTO` · docs/context

- **Sintoma:** link “spec investigativa ativa” em `MEMORY.md:5` aponta a
  `specs/active/auditoria-ficha-oculta-todos-consumidores.spec.md`, que não existe.
- **Causa:** a spec passou a `done/`, sem alinhar esse ponteiro do mapa de memória.
- **Contorno:** consultar `docs/specs/done/auditoria-ficha-oculta-todos-consumidores.spec.md`.
- **Correção:** alinhar a referência e a descrição de estado na documentação da auditoria;
  confirmar com seu relatório de fecho. Fora do recorte de crítico/PDF desta task.
- **Spec:** [P-098](../specs/backlog/p-098-ponteiros-auditoria-ficha-oculta.spec.md),
  preparada em 2026-10-06; link original ainda sem correção nesta rodada documental.
- **Desde:** identificado na conferência de links do fecho P-097-01, 2026-10-06;
  referência preexistente, não introduzida por esta correção.

### P-096 — Teste de listagem de rolagens compara dois instantes do relógio · `ABERTO` · backend/testes

- **Sintoma:** `rolagem.service.spec.ts` › "m8-02: aceita ESPECTADOR" falha intermitentemente
  apenas em `createdDate` (diferença de 1 ms); execução isolada passa (16/16).
- **Causa:** o mock retorna `[criarResumo()]` e a expectativa chama `criarResumo()` novamente;
  a fixture usa `new Date().toISOString()` em cada chamada. Arquivo intocado pela `m4-18`.
- **Contorno:** rodar o spec isolado. **Correção:** data fixa na fixture ou reutilizar o resumo
  que alimentou o mock na expectativa.
- **Spec:** [P-096 — fixture determinística](../specs/backlog/p-096-fixture-resumo-rolagem-deterministica.spec.md),
  preparada em 2026-10-06; execução futura, sem correção nesta rodada.
- **Desde:** 2026-10-05, encontrado no gate amplo da `m4-18`; relógio real já presente no teste.

### P-095 — Teste de reconexão do feed é intermitente por empate de milissegundo · `ABERTO` · frontend/testes

- **Sintoma:** `campanha-detalhe-dados.service.spec.ts` › "reconexao$ traz uma rolagem feita durante a queda para o
  feed" falha às vezes com `expected [ 1, 2 ] to deeply equal [ 2, 1 ]`; passa isolado (3/3) e em outras rodadas da suíte
  completa.
- **Causa:** a fixture `rolagem()` usa `createdDate: new Date().toISOString()`; as rolagens `id: 1` e `id: 2` nascem no mesmo
  milissegundo e a ordenação decrescente do feed empata.
- **Contorno:** rodar o spec isolado. **Correção:** datas fixas e distintas na fixture (sem relógio real).
- **Spec:** [P-095 — fixture determinística](../specs/backlog/p-095-fixture-rolagens-feed-deterministica.spec.md),
  preparada em 2026-10-06; execução futura, sem correção nesta rodada.
- **Desde:** 2026-10-05, achado na suíte completa do `m4-13` (arquivo não tocado por ela).

### P-093 — Sistema contradiz a si mesmo no arredondamento de bônus · `ACEITO` · docs/core

- **Sintoma:** `docs/core/sistema-v4.1.3.md:1363` (Ordem de Bônus) diz "assim como dito acima, quaisquer valores
  que não sejam inteiros, serão arredondados para cima"; a seção "Arredondamentos" logo acima (`:1353–1359`) manda
  arredondar **para baixo** (exemplo 27,5 → 27) e o motor (`shared/regras`) arredonda para baixo (`LUT/2`).
- **Causa:** provável erro de digitação na seção Ordem de Bônus — o "assim como dito acima" remete justamente à regra que diz
  "para baixo". A única exceção "para cima" documentada é a média de nível do esquadrão (`:1185`), outra regra.
- **Contorno:** vale "para baixo" (decisão confirmada pelo autor em 2026-10-02); o motor e o guia de fórmulas já se
  comportam assim, e a spec `rolagem-expressao-quantidade-dados` também.
- **Correção:** trocar "cima" por "baixo" na linha 2045. **O autor decidiu não alterar `docs/core` por ora**
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
