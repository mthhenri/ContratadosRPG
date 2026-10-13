# AGENTS.md / CLAUDE.md

> **Gabarito.** Copie este arquivo para `CLAUDE.md` **e** `AGENTS.md` na raiz do projeto novo
> (cópias idênticas). Preencha todo `<...>`; apague as seções marcadas `[OPCIONAL]` que não se
> aplicam em vez de deixar `N/A`. Remova esta citação antes do primeiro commit.

Este arquivo é a orientação canônica para agentes de código que trabalham no repositório
`<nome-do-projeto>`. As instruções valem para o Claude Code, para o Codex e para qualquer outro
agente compatível com `AGENTS.md`.

## Sincronização com CLAUDE.md

`AGENTS.md` e `CLAUDE.md` são cópias integrais e devem permanecer idênticos. Ao alterar qualquer
um, aplique exatamente a mesma alteração ao outro na mesma tarefa e confirme que não há diferença
antes de concluir. Não use um arquivo como redirecionamento, resumo ou complemento do outro.

A mesma regra vale para `.claude/skills/` e `.agents/skills/`: cópias integrais, arquivo a
arquivo, incluindo auxiliares em `references/`. `diff -r .claude/skills .agents/skills` deve sair
vazio antes de concluir. (`npm run repo:verificar` confere isso.)

### Contrato comum a toda skill do projeto

- **Duas cópias idênticas** em `.claude/skills/<nome>/SKILL.md` e `.agents/skills/<nome>/SKILL.md`.
- **`description` escrita como gatilho**: em português, dizendo quando usar a skill com as palavras
  que a tarefa real usa — é o que faz a skill disparar, não uma descrição curta e genérica.
- **Ponteiro, não cópia**: a skill aponta para a fonte da verdade (`docs/ARCHITECTURE.md`,
  `docs/CONVENTIONS.md`, documentos de domínio) em vez de reescrevê-la.
- **O que a skill carrega de próprio** é ordem de execução, checklist de conferência e armadilha de
  campo — o que a documentação não carrega.
- **Tamanho**: `SKILL.md` até ~150 linhas; excedente vai para `<skill>/references/<assunto>.md`.
- **Em conflito** com a documentação, o documento vence e a skill é corrigida na mesma tarefa.
- **Validação por uso**: uma skill só fecha depois de exercitada em um recorte real de trabalho.

## Início obrigatório da sessão

Antes de implementar qualquer mudança, leia nesta ordem:

1. `docs/ARCHITECTURE.md` — constituição do projeto e autoridade máxima.
2. `docs/CONVENTIONS.md` — convenções de código.
3. `docs/context/CONTEXT.md` — estado atual e próxima tarefa.

Leia também, conforme a pergunta: `docs/context/PROBLEMS.md` (defeitos conhecidos — antes de
investigar falhas), `HISTORY.md` (decisões e histórico — procure por código da tarefa, sem ler o
arquivo inteiro), `MEMORY.md` (mapa de onde as coisas vivem), `IDEAS.md` (o que ainda não é sistema).

[OPCIONAL — só com UI] Antes de qualquer trabalho de frontend, UI ou estilo, leia
`docs/design/DESIGN.md` e os tokens do tema. Nunca desenvolva uma tela sobre um tema vazio.

## Fontes da verdade

As regras do domínio estão em `<docs/dominio/...>`. Antes de alterar fórmulas, regras de negócio
ou classificações, consulte esse documento; **em caso de conflito, o documento vence o código**.
`<se houver arquivos derivados (JSON gerado, relatórios), diga qual é a fonte e qual é o derivado>`.

[OPCIONAL — só com UI] As decisões visuais estão em `docs/design/`. Os tokens são a fonte de
verdade em runtime; componentes consomem tokens, sem hex, fontes ou raios hardcoded.

## Contexto persistente

`docs/context/` tem responsabilidades separadas:

| Arquivo | Responsabilidade | Operação |
|---|---|---|
| `CONTEXT.md` | o que é verdade agora | editar/reorganizar, teto ~400 linhas |
| `HISTORY.md` | o que aconteceu e por quê | acrescentar no topo |
| `PROBLEMS.md` | o que está quebrado | registrar; remover ao corrigir |
| `MEMORY.md` | onde as coisas vivem | somente ponteiros |
| `IDEAS.md` | o que ainda não é sistema | retirar de abertas ao especificar |

Ao concluir uma tarefa, registre a narrativa completa em `HISTORY.md`, edite somente as seções
afetadas de `CONTEXT.md` e atualize os demais quando algo descoberto sobreviver à tarefa. Não
acrescente um diário em `CONTEXT.md`. A documentação do projeto é em <idioma>.

## Fluxo orientado por especificação

1. Mova `docs/specs/backlog/<tarefa>.spec.md` para `docs/specs/active/`.
2. Implemente exatamente o que a especificação define; não extrapole.
3. Mova a especificação para `docs/specs/done/` ao terminar.
4. Atualize `docs/context/` conforme as regras acima.

Todo material da tarefa fica junto da spec: planos, designs pontuais, propostas, revisões,
auditorias e verificação em `docs/specs/<estado>/<tarefa>/`, com `<tarefa>.spec.md` ao lado. Mova
spec e anexos juntos. A política canônica está em `docs/ARCHITECTURE.md` §3.1 e prevalece sobre
destinos padrão de plugins. Nunca crie depósitos paralelos por ferramenta/atividade. Capturas e
saídas brutas ficam em `.artifacts/<tarefa>/`, ignorada pelo Git; o relatório textual registra as
evidências e seus limites. Antes do fecho rode `npm run repo:verificar`; antes do commit, após
preparar os arquivos, `npm run repo:verificar -- --staged`.

Specs de fase/milestone são divididas em tarefas numeradas antes da implementação. Specs em
`done/` são registro histórico e não são reescritas.

## Gate obrigatório de qualidade e conclusão

Uma tarefa de código **não está concluída** enquanto não houver evidência de que respeita a
especificação, a arquitetura e, quando aplicável, o contrato visual. Não declare sucesso porque
compila ou porque um teste unitário passou.

### Prioridade absoluta: qualidade acima de velocidade

Qualidade, fidelidade ao sistema e aderência às regras têm prioridade sobre velocidade. Prazo,
pressa, tamanho da spec, limite de contexto, delegação ou custo **nunca** justificam pular
leitura, testes, revisão ou verificação. Quando não houver tempo ou ambiente para cumprir todos os
gates, a tarefa permanece **aberta**: relate o avanço e a pendência.

### Rigor com eficiência

Qualidade não significa maximizar etapas, agentes ou contexto. O caminho preferido é o menor
processo que produza evidência suficiente e confiável.

- Subagentes só com ganho concreto (ver "Orquestração multiagente"); mande a cada um só o contexto
  necessário e não deixe vários investigarem o mesmo recorte.
- Não replique documentos extensos nem saídas de ferramentas quando um resumo e referências a
  arquivos bastarem.
- Durante a implementação, testes focados; suítes amplas nos gates de integração e conclusão, sem
  repetir build/lint/teste idênticos quando nada relevante mudou.
- Consolide revisões e verificações; repita só para confirmar correções.
- Limite logs e saídas ao trecho necessário para decidir ou comprovar.

Antes de alterar código:

1. Identifique a fonte de verdade da mudança: spec ativa, documento de regra, convenção.
2. Delimite a responsabilidade: <regras puras e contratos compartilhados em `shared/`; orquestração
   e permissão no service; UI/saída só apresenta estado>. Não duplique regra de domínio entre camadas.
3. Ao tocar um componente/arquivo já extenso, não acrescente nova responsabilidade sem avaliar
   extraí-la; se a extração não for proporcional, registre no fecho por que o acréscimo é seguro.
4. Ao alterar algo usado em vários lugares (ícone, primitivo, token, regra pura, DTO, enum, evento,
   service) ou reaproveitar um item existente num uso novo, aplique a skill
   `gerenciamento-de-impacto`: todo consumidor é avaliado e o que mudar além do pedido vai ao autor
   antes de aplicar (`npm run impacto`).

### [OPCIONAL — só com UI] Biblioteca de componentes é obrigatória

Todo controle de interface usa o primitivo correspondente da biblioteca do projeto
(`<caminho>`) **através da API completa dele** (variante, tamanho, estilo...), nunca um elemento
nativo estilizado à mão nem uma receita local que reinventa o primitivo. Anexar a diretiva sem os
inputs de densidade não conta como reuso — o defeito não aparece em build nem lint. Antes de
declarar UI pronta, confirme controle por controle. Se a biblioteca não cobrir o que a tela
precisa, **pare e pergunte ao autor** antes de contornar; ampliar ou criar primitivo é decisão
dele, nunca do agente.

### [OPCIONAL — só com UI] Processo obrigatório para qualquer UI ou estilo

1. Antes de editar, escolha e registre o **componente análogo aprovado** (shell, densidade,
   hierarquia, espaçamento, controles, estados, iconografia, responsivo). "Usar os tokens" não basta.
2. Inspecione o análogo no código e, quando possível, na aplicação real.
3. Construa primeiro um corte visual representativo, não um formulário genérico com tokens.
4. Rode a aplicação real e use a skill `verify`. Verifique no mínimo `<viewport desktop>` e
   `<viewport mobile>`, além dos exigidos pela spec, percorrendo os estados relevantes.
5. Compare a tela renderizada com o análogo (skill `design-fidelity`).
6. Corrija divergências **antes** de apresentar ao autor.

Trabalho delegado: relato ou screenshot de subagente não encerra o gate; o agente principal inspeciona
pessoalmente. Sem app executável, a tarefa visual permanece **aberta**.

### Antes de declarar pronta

1. Revise o diff completo contra a spec e as convenções; sem hardcodes nem atalhos que contornem a
   fonte de verdade.
2. Rode build, testes, lint e checagens proporcionais ao risco. Relate comandos, resultados e
   falhas preexistentes **separadamente**.
3. Para UI, cumpra integralmente o processo visual acima.
4. No fecho, liste de forma auditável o que foi verificado e o que ficou pendente. Item sem
   verificação obrigatória fica **aberto**, não "concluído".

## Orquestração multiagente

O agente que recebe o pedido do autor é o **orquestrador**: interpreta, planeja, decide a
arquitetura, sintetiza e responde pelo resultado. Decide **sozinho** quando executar direto,
quando delegar a um subagente (`.claude/agents/` e o `Explore` embutido) e quando consultar o
outro agente externo (`scripts/agentes/codex-delegar.sh` ou `claude-delegar.sh`). Política,
limites e comandos: skill `orquestracao` — leia antes de delegar.

- Execução direta é o padrão. Delegue só com ganho concreto: paralelismo real, busca mecânica
  ampla, saída longa de testes, bug sem progresso após duas tentativas, ou revisão independente de
  alteração relevante ou de risco.
- Na revisão independente, passe problema, requisitos e onde está o diff — nunca a sua conclusão.
- Agente delegado não delega (profundidade 1), não faz commit nem push e não repete consulta
  equivalente sem informação nova.
- Resultado de agente é evidência a verificar, não verdade; o gate acima vale integralmente.
- Havendo delegação significativa, informe ao autor em uma linha: agente, modelo, para quê e o
  resultado relevante.

## Estrutura e arquitetura

`<descreva o monorepo/pastas reais: workspaces, módulos, camadas e o fluxo entre elas>`
(ver `docs/ARCHITECTURE.md` §3, §6–§8). Contratos (DTOs, enums, interfaces) nunca são redefinidos
fora do pacote que os possui.

## Regras de idioma e nomenclatura

`<defina: qual idioma para conceitos genéricos de software e qual para o domínio; padrão de
nomes de DTO, métodos, variáveis, enums; proibição de abreviar — ver docs/CONVENTIONS.md>`.

## [OPCIONAL — só com backend/banco] Backend, SQL e dados

`<resuma só o que um agente precisa ter à mão: controller fino; service concentra regra;
repository só SQL; filtro de exclusão lógica; parâmetros nomeados; INSERT padrão; sem DELETE
físico; config só pela camada central; onde vive o dado relacional vs documento estruturado.
O detalhe fica em ARCHITECTURE.md §7 e §10 e na skill sql-migrations>`.

Permissões: `<quem edita, quem só vê, quem é dono de quê — fonte única na service dona>`.

## Comandos úteis

```bash
<instalar dependências>
<subir banco/serviços>
<rodar backend>      # <porta>
<rodar frontend>     # <porta>
<testes de cada workspace>
<lint>
npm run repo:verificar            # organização de specs/artefatos e espelhos
```

Para verificação manual da aplicação real, consulte `.agents/skills/verify/SKILL.md`. Testes e
lint não a substituem quando a tarefa exige observar a aplicação em execução.

## Segurança operacional

Preserve alterações existentes do usuário. Antes de qualquer comando destrutivo, confirme o alvo e
a necessidade. Não use reset destrutivo nem apague arquivos fora do escopo. Nunca rode formatador
de escopo amplo (glob) nem descarte alterações sem ver o diff antes — outra sessão pode estar
editando o mesmo checkout. Após alterar código, rode a verificação proporcional ao risco e relate
claramente o que foi validado.

## Coautoria de commits

Todo commit criado por um agente neste repositório inclui um trailer `Co-authored-by:` que
identifique o agente responsável (por exemplo, `Codex <noreply@openai.com>` ou a identidade
configurada para Claude). Antes de concluir um commit, confira a mensagem efetivamente gravada com
`git log -1` ou `git show`.
