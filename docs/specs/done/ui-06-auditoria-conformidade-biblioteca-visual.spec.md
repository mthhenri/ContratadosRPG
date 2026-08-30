# ui-06-auditoria-conformidade-biblioteca-visual.spec.md

> Task 6 da frente `ui-biblioteca-componentes`, posterior à remoção do PrimeNG (`ui-05`).
> Origem: revisão solicitada pelo autor em 2026-08-30. A adoção da UI-04 eliminou as cópias
> conhecidas dos blocos base; esta task verifica se o frontend inteiro de fato se apoia na
> biblioteca própria e se os usos restantes preservam o sistema visual.

## Objetivo

Auditar a conformidade visual e de composição de todo o frontend com a biblioteca em
`frontend/src/app/shared/ui/` e com `docs/design/`. A entrega desta task é um diagnóstico
auditável e uma fila de correções recortadas: não se deve supor que o término de `ui-04` prova
que cada controle, tipografia, estado e exceção atual usa o primitivo correto.

## Entregáveis

1. **Matriz de auditoria versionada** em `docs/design/`, cobrindo cada módulo e cada componente
   visual reutilizável do frontend. Para cada ocorrência de botão/link de ação, campo, seletor,
   stepper, cartão, stat, chip, abas, modal, notificação e controle de navegação, registrar:
   arquivo/elemento, primitivo ou padrão canônico esperado, estado atual, evidência e veredito
   `CONFORME`, `EXCEÇÃO JUSTIFICADA`, `EVOLUIR PRIMITIVO` ou `CORRIGIR`.

   A matriz também deve cobrir tipografia e acabamento: família IBM Plex adequada ao papel,
   tamanho/peso/caixa/tracking contra a tabela de `DESIGN.md`, tokens de cor/raio/espaçamento,
   foco, desabilitado, erro, hover e alvo de toque no mobile. Não basta contar imports ou classes:
   a leitura inclui template, SCSS e resultado renderizado.

2. **Inventário mecânico reproduzível**, documentado junto à matriz, que encontre candidatos a
   revisão sem declarar conformidade sozinho: controles nativos sem diretiva/componente canônico,
   seletores BEM base fora de `shared/ui/`, CSS com valores proibidos (hex, fonte ou raio), estilos
   inline e usos de APIs de UI removidas. As buscas precisam listar falsos positivos conhecidos e
   os casos que exigem leitura humana; não criar uma regra de CI que bloqueie o projeto sem antes
   validar a precisão dela na auditoria.

3. **Revisão visual ao vivo por módulo**, usando um componente análogo aprovado para cada tela e
   os dois viewports canônicos (`1920×1080` e `360×800`). Percorrer os estados que o controle
   expõe — ao menos normal, hover/foco, desabilitado, erro/validação quando aplicável, conteúdo
   longo e vazio/carregando quando existirem — e anotar na matriz a evidência observada. A revisão
   confirma densidade, hierarquia, comportamento responsivo, contraste, ausência de overflow e
   consistência com as capturas de `docs/design/examples/`.

4. **Plano de correção priorizado**, derivado apenas dos achados `EVOLUIR PRIMITIVO` e `CORRIGIR`.
   Cada correção vira uma spec filha independente (por módulo ou por primitivo, conforme o menor
   corte verificável), com arquivos afetados, análogo, comportamento/estado a preservar e gate
   visual. Achados que sejam defeitos atuais entram também em `docs/context/PROBLEMS.md`; decisões
   de produto ou evoluções ainda não aprovadas entram em `IDEAS.md`.

5. **Contrato de decisão para controles novos ou específicos**, incorporado à matriz e às specs
   filhas:

   - reutilizar um primitivo quando a diferença for apenas conteúdo, severidade, estilo ou tamanho
     já previsto pela sua API;
   - evoluir o primitivo quando o novo comportamento/estado tem mais de um consumidor real ou
     pertence à identidade do controle, documentando os casos que o justificam;
   - criar outro componente de `shared/ui/` somente quando há um papel visual e interativo próprio
     que não cabe no primitivo existente; seu contrato, variantes e estados precisam nascer de
     casos reais, não de uma API hipotética;
   - permitir CSS/local markup específico somente para a composição e o conteúdo de domínio da
     tela. A exceção deve dizer por que não é uma variação reutilizável e não pode recopiar a
     identidade de botão, campo, card ou outro primitivo.

   A regra vigente de que o primitivo possui identidade e o consumidor possui dimensões continua
   válida: padding, `font-size`, peso, `min-height` e alvo de toque podem permanecer na classe
   companheira do consumidor quando forem realmente exigidos pela densidade da tela. A auditoria
   verifica que esses valores obedecem aos papéis e limites de `DESIGN.md`; ela não cria uma escala
   abstrata ou um input genérico apenas para mover valores de lugar.

## Critérios de Aceite

- A matriz inclui todos os diretórios de `frontend/src/app/modules/` e `frontend/src/app/shared/`,
  identifica o responsável pela revisão e não deixa ocorrência candidata sem um dos quatro
  vereditos definidos.
- A verificação mecânica é executável a partir do repositório, tem resultado registrado e sua
  limitação é explícita: nenhum resultado de `grep`/lint substitui a inspeção de template, SCSS e
  aplicação real.
- Cada módulo revisado tem evidência de execução real nos viewports `1920×1080` e `360×800`,
  análogo aprovado e estados percorridos; a matriz registra tanto as conformidades quanto as
  divergências, sem tratar uma captura inicial como aprovação do fluxo inteiro.
- Não se corrige de passagem nesta task. Todo achado acionável está ligado a uma spec filha, a um
  item de `PROBLEMS.md` ou a uma ideia/decisão explicitamente classificada; nenhuma divergência fica
  apenas em comentário solto ou memória de revisão.
- A conclusão explica, para cada exceção justificada e cada novo componente proposto, por que a
  composição local ou o novo primitivo é a menor solução coerente com a biblioteca. Nenhuma
  exceção é aceita só por ser preexistente.
- As specs filhas exigem `npm run lint`, os testes/builds proporcionais ao corte e o gate visual
  integral de `AGENTS.md`/skill `verify`; a auditoria em si não fecha correções sem essa evidência.

## Fora de Escopo

- Corrigir, refatorar ou redesenhar os achados nesta spec. A auditoria produz o diagnóstico e as
  tasks filhas; cada mudança de produto precisa do próprio diff revisável e do próprio gate visual.
- Mudar a identidade "Terminal de Contenção", trocar fontes, criar uma escala H1–H6 artificial ou
  substituir a divisão vigente entre identidade do primitivo e dimensão do consumidor.
- Reintroduzir PrimeNG, outra biblioteca de componentes, Tailwind como segunda fonte de tokens, ou
  um catálogo/Storybook sem decisão específica do autor.
- Declarar que DOM de terceiros (Milkdown/ProseMirror, PDF viewer) deve usar primitivos próprios;
  ele continua sendo revisado apenas quanto à integração visual, acessibilidade e tokens que o
  hospedeiro controla.
- Automatizar bloqueios de CI antes de a matriz provar que a busca tem precisão e que os falsos
  positivos estão resolvidos. Um gate automático futuro é assunto da `I-023`.

## Dependências

- `docs/design/DESIGN.md`, `docs/design/tema/` e `docs/design/examples/` — fonte de verdade
  visual e análogos aprovados.
- `frontend/src/app/shared/ui/` — biblioteca própria a ser auditada.
- `docs/specs/done/ui-01-primitivos-base.spec.md` até
  `docs/specs/done/ui-05-remover-primeng.spec.md` — decisões e contratos já entregues.
- `AGENTS.md`/`CLAUDE.md`, skill `verify` e skill `design-fidelity` — gate de inspeção visual.

## Riscos e Mitigação

- **Auditoria virar refactor sem fim.** A matriz e as specs filhas separam diagnóstico de correção;
  a sessão de auditoria só registra, prioriza e delimita.
- **Generalização apressada.** Uma ocorrência isolada pode ser composição de domínio legítima.
  Exigir dois consumidores reais ou um papel interativo próprio antes de ampliar/criar primitivo
  evita transformar `shared/ui/` numa coleção de props sem sentido.
- **Conformidade falsa por busca textual.** Buscas só selecionam candidatos. O veredito depende de
  leitura humana e da aplicação real em ambos os viewports, com os estados relevantes.
- **Cansaço de revisão em um frontend amplo.** Revisar por módulo e registrar a matriz permite
  pausar sem perder cobertura; um módulo só fica concluído quando todos os seus candidatos têm
  veredito e evidência visual.
