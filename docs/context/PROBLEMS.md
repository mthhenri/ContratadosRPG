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

### P-114 — Preservar associações nas tabelas com dois pares · `ABERTO` · frontend/regras

- **Sintoma:** Em 360×800, consultar Formação, Níveis e Melhorias de Agente, Corpo e Pontuação Corporal e Treinamentos. Rolar cada tabela até a direita. A primeira coluna continua fixa, mas o valor exibido pertence ao segundo par: “Nenhum” acompanha o bônus de “Profissional”, e “00” acompanha o bônus de “11”.
- **Causa:** Primeira coluna fixa aplicada a tabelas com duas metades independentes; dados completos permanecem no DOM.
- **Contorno:** Consultar os pares simultâneos em desktop.
- **Correção:** [regras-visual-01-pares-tabelas](../specs/backlog/regras-visual-01-pares-tabelas.spec.md).
- **Desde:** observado em 09/10/2026; [RV-01, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-115 — Conter os bônus longos dos cartões · `ABERTO` · frontend/regras

- **Sintoma:** Em 360×800, abrir Experimento Híbrido e localizar Atributos bônus. Cada chip tem aproximadamente 295px para uma região de 225px: seu limite direito chega a x≈360, além do cartão. Em duas colunas desktop, o mesmo chip ultrapassa a coluna de 270px e consome quase todo o intervalo antes das habilidades.
- **Causa:** Chip de ≈295px em área mobile de ≈225px/coluna desktop de 270px; solução no contrato do primitivo ainda não decidida.
- **Contorno:** Consultar o texto integral em largura maior; não ocultar a restrição LUT/PON.
- **Correção:** [regras-visual-02-bonus-longos](../specs/backlog/regras-visual-02-bonus-longos.spec.md).
- **Desde:** observado em 09/10/2026; [RV-02, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-116 — Conter rótulos de ameaça nas tabelas mobile · `ABERTO` · frontend/regras

- **Sintoma:** Em 360×800, Guia → Definindo o Nível de Ameaça (NA), Tabela de Referência de NA, e tabela VD Típico por NA. Rolar horizontalmente. “Catastrófica” e “Apocalíptica” saem da primeira coluna fixa e se sobrepõem aos dados vizinhos.
- **Causa:** Rótulo sem quebra é maior que a área útil da primeira coluna fixa de 120px.
- **Contorno:** Consultar a tabela em desktop.
- **Correção:** [regras-visual-03-rotulos-ameaca-tabelas](../specs/backlog/regras-visual-03-rotulos-ameaca-tabelas.spec.md).
- **Desde:** observado em 09/10/2026; [RV-03, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-117 — Preservar a hierarquia das grades de referência · `ABERTO` · frontend/regras

- **Sintoma:** Sistema → Jogando como um Civil → Saúde em 360×800: a ordem visual é VIDA, ENERGIA, fórmula de Vida, fórmula de Energia. Em Afinidade com Fragmentos, “Nível de Criatura” vira uma célula comum na grade desktop; em Deslocamento, faixa de Destreza e metros têm o mesmo tratamento sem separação.
- **Causa:** Fallback concatena cabeçalho/linhas e remove células vazias, perdendo relações por coluna nesses recortes.
- **Contorno:** Conferir estrutura e pares na fonte canônica.
- **Correção:** [regras-visual-04-grades-semanticas](../specs/backlog/regras-visual-04-grades-semanticas.spec.md).
- **Desde:** observado em 09/10/2026; [RV-04, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-118 — Dar espaço aos nomes e ícones das abas mobile · `ABERTO` · frontend/regras

- **Sintoma:** Sistema → Combatente em 360×800: três abas com aproximadamente 83px cada e fonte de 10px. Nome de Mercenário e ícones encostam nas fronteiras entre abas; o problema também aparece em Especialista e Suporte. Seleção por teclado funciona, mas o texto/ícone ficam excessivamente comprimidos.
- **Causa:** Nome e ícone comprimidos em abas de ≈83×44px e fonte de 10px; solução responsiva ainda não definida.
- **Contorno:** Nome completo permanece no painel selecionado; seleção por teclado funciona.
- **Correção:** [regras-visual-05-abas-arquetipos-mobile](../specs/backlog/regras-visual-05-abas-arquetipos-mobile.spec.md).
- **Desde:** observado em 09/10/2026; [RV-05, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-119 — Estruturar notas e bônus apresentados como texto contínuo · `ABERTO` · frontend/regras

- **Sintoma:** Sistema → Origem → Bombeiro/Alpinista: os dois bônus da Formação aparecem na mesma frase sem delimitador. A nota Amaldiçoado pelo Passado apresenta título, descrição, três itens ▢ e ressalva em um parágrafo contínuo. A nota de Armazenamento junta a ausência de peso e o custo de 300$.
- **Causa:** Fonte já reúne afirmações/lista em células contínuas; segmentação de apresentação precisa preservar o texto autoral.
- **Contorno:** Conferir rótulos/glyphs da fonte e distinguir cada efeito.
- **Correção:** [regras-visual-06-notas-e-formacoes](../specs/backlog/regras-visual-06-notas-e-formacoes.spec.md).
- **Desde:** observado em 09/10/2026; [RV-06, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-120 — Renderizar o tachado do Markdown no leitor · `ABERTO` · frontend/regras

- **Sintoma:** Guia → Introdução: `~~torturar psicologicamente~~` aparece com os delimitadores literais, nas páginas desktop e mobile. O Markdown canônico marca esse trecho como tachado.
- **Causa:** Token de tachado não é modelado/renderizado; fallback conserva a sintaxe literal.
- **Contorno:** Ler a frase como tachado conforme o Markdown.
- **Correção:** [regras-visual-07-tachado-inline](../specs/backlog/regras-visual-07-tachado-inline.spec.md).
- **Desde:** observado em 09/10/2026; [RV-07, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-121 — Uniformizar a apresentação das habilidades passivas de NPCs · `ABERTO` · frontend/regras

- **Sintoma:** Guia → Biblioteca de Referência → Operativo/Veterano/Elite/Lendário: passivas como Treinamento de Campo aparecem como prosa cinza contínua. As ativas imediatamente abaixo usam título mono, separador e bloco de habilidade; as passivas não têm a mesma hierarquia de catálogo.
- **Causa:** Passivas do catálogo não recebem a hierarquia das ativas; investigação completa do reconhecimento fica na spec.
- **Contorno:** Conferir nome/tipo/efeito no parágrafo ou na fonte.
- **Correção:** [regras-visual-08-habilidades-passivas-npcs](../specs/backlog/regras-visual-08-habilidades-passivas-npcs.spec.md).
- **Desde:** observado em 09/10/2026; [RV-08, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-122 — Dar contraste aos rótulos semânticos na base clara · `ABERTO` · frontend/regras

- **Sintoma:** Ativar base Clara e abrir Experimento Híbrido. Os rótulos de 11px “Habilidade inicial”, “Custo do experimento” e “Energia inicial” ficam pálidos. Cores observadas e composição dos fundos produzem razões aproximadas de 1,87:1, 3,22:1 e 3,05:1 respectivamente.
- **Causa:** Cores calculadas dão razões aproximadas de 1,87:1, 3,22:1 e 3,05:1 nos fundos observados; consumidores dos tokens precisam ser delimitados.
- **Contorno:** Usar a base escura.
- **Correção:** [regras-visual-09-contraste-base-clara](../specs/backlog/regras-visual-09-contraste-base-clara.spec.md).
- **Desde:** observado em 09/10/2026; [RV-09, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

### P-123 — Evitar texto incorreto e seta órfã na busca · `ABERTO` · frontend/regras

- **Sintoma:** Em 360×800, Guia → Sumário → pesquisar Mercenário. O estado vazio exibe “1 RESULTADOS NO OUTRO DOCUMENTO” e a seta sozinha na linha seguinte. A busca no Sistema também mostra “1 resultados”. A ação encontra o livro correto.
- **Causa:** Resumo não flexiona singular e legenda textual longa quebra antes da seta; navegação funciona.
- **Contorno:** A ação segue utilizável; resultado/destino corretos.
- **Correção:** [regras-visual-10-busca-microcopy-mobile](../specs/backlog/regras-visual-10-busca-microcopy-mobile.spec.md).
- **Desde:** observado em 09/10/2026; [RV-10, cobertura e evidências](../specs/done/regras-auditoria-visual-completa/auditoria.md). Nenhuma correção aplicada nesta auditoria.

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
