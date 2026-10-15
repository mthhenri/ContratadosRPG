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

### P-126 — Sem gate que compare `docs/design/tema/` e `frontend/src/styles/tema/` · `ABERTO` · design/tema

- **Sintoma:** as duas pastas são "espelhadas 1:1", mas nada impede nova divergência. Em 2026-10-13
  os valores foram realinhados (`--erro: #d62222`, independente de `--vida`; `--cor-ficha-legivel` e os
  mixins de `_breakpoints` levados ao handoff). Restam diferenças só de formatação/comentário em
  `_base`, `_glow` e `_tokens`.
- **Causa:** edições aplicadas só na cópia do runtime; nenhum gate compara valores.
- **Contorno:** em mudança de tema, editar as duas pastas e rodar `npm run impacto` nos `_tokens.scss`.
- **Correção:** acrescentar ao `repo:verificar` a comparação de valores (custom properties e
  variáveis/mixins Sass) das duas pastas.
- **Desde:** achado em `skills-10-gerenciamento-de-impacto` (2026-10-13).

### P-124 — Destaque não selecionado perde contraste sobre ameaça · `ABERTO` · frontend/regras

- **Sintoma:** Pesquisar Catastrófica no Guia, base escura: ocorrência não selecionada da tabela VD fica clara sobre o fundo claro do indicador. Na base clara, Apocalíptica não selecionada fica escura sobre fundo escuro. Página e painel, inclusive 360×800.
- **Causa:** Estilo preexistente `.regras__documento ::ng-deep .regras-pesquisa__marca` em `regras-leitor.component.scss` impõe `var(--text)` sobre fundos de ameaça que têm contraste próprio.
- **Contorno:** Navegar até a ocorrência para ativar o destaque contrastante, ou limpar a pesquisa.
- **Correção:** Preservar contraste do destaque não selecionado nos fundos semânticos sem alterar a identidade de NA; fora do ajuste de largura RV-03.
- **Desde:** identificado em 10/10/2026 durante RV-03; [evidências e limites](../specs/done/regras-visual-03-rotulos-ameaca-tabelas/verificacao.md).

### P-119 — Título de Amaldiçoado pelo Passado e nota de Armazenamento sem fronteira no dado · `ABERTO` · dados/regras

- **Sintoma:** Restam dois trechos sem fronteira no dado: o título de Amaldiçoado pelo Passado fica colado à descrição (`⬦ Amaldiçoado pelo Passado Você é a sucessão…`) e a nota de Armazenamento junta "não agregam nenhum peso ao item" com "Modificações de Armazenamento custam 300 $". (Formação e os três itens ▢ do Amaldiçoado já saem estruturados na leitura — `regras-visual-06`.)
- **Causa:** A exportação do Docs achatou as passagens em células únicas; sem delimitador na fonte, o código não pode inventar o limite.
- **Contorno:** Nenhum; o texto está íntegro, só sem quebra.
- **Correção:** Edição editorial pela Oficina, a cargo do autor: quebra depois do nome da condição e ponto final depois de "item". Passo a passo na spec de execução do autor: [livro-correcoes-editoriais-producao](../specs/backlog/livro-correcoes-editoriais-producao.spec.md) (bloco 3). Edição proposta: [verificação da 06](../specs/done/regras-visual-06-notas-e-formacoes/verificacao.md#pendências-editoriais-não-resolvidas-por-código).
- **Desde:** observado em 09/10/2026; parcialmente corrigido em 15/10/2026.

### P-120 — Livro publicado ainda guarda `~~torturar psicologicamente~~` como texto literal · `ABERTO` · dados/regras

- **Sintoma:** Guia → Introdução, em produção: a frase aparece com os delimitadores `~~`. O leitor, o normalizador, a exportação e o editor já modelam o trecho `tachado` (`regras-visual-07`), mas o dado publicado no banco é um trecho `texto` com o Markdown cru.
- **Causa:** A importação inicial do Guia ocorreu antes de existir o token; o banco é a fonte da verdade e não é regenerado pelo normalizador.
- **Contorno:** Nenhum no site; o texto continua legível com os delimitadores.
- **Correção:** Converter o trecho no livro (rascunho e publicação) em `texto` + `tachado` + `texto` e republicar — execução do autor, por mexer em dado de produção, no bloco 4 de [livro-correcoes-editoriais-producao](../specs/backlog/livro-correcoes-editoriais-producao.spec.md). **Bloqueado:** a Oficina só tem Ctrl+B/Ctrl+I; falta um atalho de tachado (tarefa de código, a abrir a pedido do autor).
- **Desde:** observado em 09/10/2026; código corrigido em 15/10/2026 ([verificação](../specs/done/regras-visual-07-tachado-inline/verificacao.md)).

### P-111 — Recorrência de falha nativa no build com cache local · `CONTORNADO` · frontend/ambiente

- **Sintoma:** build habitual fora do sandbox voltou a terminar com código `3221225477`,
  após a recuperação P-104 documentada em 09/10/2026.
- **Causa:** não diagnosticada nesta tarefa; não atribuir ao código do sumário ou a
  corrupção/concorrência sem investigação específica.
- **Nova tentativa (09/10/2026):** três builds de produção com o cache `.angular/cache-local` (dois
  simultâneos, com o `ng serve` do autor aberto) terminaram com código 0. Sem reprodução, não há causa a
  corrigir; mantido como contornado até a próxima ocorrência, que deve registrar o que rodava em paralelo.
- **Contorno:** `CI=true npm run build --workspace=frontend` passou, desabilitando o cache
  só nessa execução. Não muda `frontend/angular.json` nem remove o cache existente.
- **Correção:** investigar recorrência a partir do diagnóstico de P-104 e dos limites
  da [verificação do sumário](../specs/done/regras-sumario-classes-subclasses/verificacao.md).
- **Desde:** gate de `regras-sumario-classes-subclasses`, 09/10/2026.

### P-108 — Formatação do PDF de Regras precisa de revisão · `CONTORNADO` · frontend/impressão

- **Sintoma:** autor avaliou o PDF da M10-10 como “bem estranho” e pediu revisão
  substancial da formatação; apresentação editorial ainda não aprovada.
- **Causa:** não investigada com o autor; geração/paginação técnica não comprova
  qualidade editorial. Não atribuir defeitos específicos sem essa avaliação.
- **Contorno:** exportação do Sistema temporariamente desativada na UI e no
  service; exportação do Guia continua disponível.
- **Correção:** [revisão da formatação](../specs/backlog/revisao-formatacao-pdf-regras.spec.md),
  com corte visual aprovado e conferência completa antes de reativar o Sistema.
- **Desde:** avaliação do autor em 08/10/2026 após a entrega da M10-10.

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
