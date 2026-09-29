# patchnotes-versao-sistema.spec.md

> Guarda-chuva (tasks `pn-01`…`pn-05`, a quebrar em specs próprias antes de implementar, como as
> demais specs de milestone). Nasce de um pedido do autor em 2026-09-29: exibir a versão do sistema,
> ter uma área pública de patchnotes e uma skill para publicar versões. O `version` atual
> (`0.0.1`/`0.0.0`) é um placeholder incorreto e será corrigido na `pn-01`.

## Objetivo

Dar aos usuários uma forma de saber em que versão o sistema está e o que mudou nela, em linguagem de
jogador (sem "tecniquês"), e dar ao autor um fluxo repetível — uma skill — para fechar e publicar
uma versão.

## Decisões de produto fechadas

1. **Patchnotes vivem no R2 como Markdown, sem tabela, e o R2 é a única fonte de verdade.**
   É conteúdo editorial, não relacional. Um arquivo por versão (`patchnotes/<versao>.md`) mais um
   `patchnotes/indice.json` com a lista. A pasta local `docs/patchnotes/` é só rascunho/base de
   envio: fica no `.gitignore` e nada nela é versionado (decisão do autor, 2026-09-29).
2. **Cache de 24 h no backend** (em memória, por processo). O deploy sobe uma revisão nova e
   esvazia o cache, então a nota publicada junto do deploy aparece na hora; só uma correção de nota
   *sem* deploy espera até 24 h. Para o navegador, `Cache-Control: public, max-age=300` — curto de
   propósito, para não replicar o atraso de 24 h no cliente.
3. **Nível de detalhe mediano, macro, em português de jogador.** Cada nota tem um título
   curto e três seções fixas, todas opcionais quando vazias: **Novidades**, **Melhorias**,
   **Correções**. Cada item é uma frase sobre o que o usuário passa a poder fazer ou deixa de
   sofrer — sem nome de arquivo, endpoint, migration ou termo interno. Exemplo:
   *"Mestres agora podem revelar documentos a toda a mesa com um clique."*, não *"Endpoint
   `documento/revelar` adicionado"*.
4. **A versão tem uma única fonte:** o `version` do `package.json` da raiz. Os três workspaces
   acompanham a mesma versão (o projeto é um produto só). Nada de `version.txt` paralelo.
5. **SemVer:** funcionalidade nova visível ao usuário sobe o *minor* (`1.0.0 → 1.1.0`); só
   correção sobe o *patch*; mudança que quebre o uso existente (ex.: fluxo de sessão refeito) sobe
   o *major*. Quem decide o major é o autor, nunca o agente.
6. **Versão-base `1.0.0` e cadência semanal.** O sistema já teve sessão real e está em uso: o
   histórico vira **cinco patchnotes retroativos**, um por bloco coerente de entregas — um único
   `1.1.0` para um mês inteiro seria um salto incoerente (revisão do autor, 2026-09-29). Cada fronteira
   é um commit; a tag é um marcador retroativo (só o HEAD carrega a versão nos `package.json`):
   - **v1.0.0** — início (02/07) até `306a9714` (fim de 01/09).
   - **v1.1.0** — 02–08/09, até `641a8529`: papel de espectador, prévia de jogador, tela de campanha do mestre.
   - **v1.2.0** — 09–17/09, até `09381c10`: ficha de criatura, aba Esquadrão, montador de rolagem.
   - **v1.3.0** — 18–25/09, até `8a405ec0`: Iniciativa nova, janelas soltas, editor de texto.
   - **v1.4.0** — 26–29/09, o HEAD: Cenas e Biblioteca de documentos. É a versão vigente.
7. **Área pública.** `/patchnotes` (lista + detalhe) sem login, como as calculadoras/simulação;
   os endpoints do backend usam `@Public()`.

## Entregáveis

### pn-01 — Versão como fonte única

1. Fixar o `version` da raiz e dos três workspaces em `1.4.0` (versão vigente após o fechamento
   dos cinco patchnotes retroativos) e criar as tags `v1.0.0`…`v1.4.0` nas fronteiras da decisão 6.
2. Constante `VERSAO_SISTEMA` em `shared/src/versao.ts`, gerada por `npm run versao:sincronizar`
   a partir do `version` do `package.json` da raiz (que também alinha os três workspaces) e
   consumida por backend e frontend; um teste em `shared` falha se ela ou algum `package.json`
   divergir. O SHA curto do commit, previsto na primeira versão desta spec, ficou de fora: exigiria
   gerar arquivo em todo `ng serve`/build para um ganho que ninguém pediu.
3. `GET /health` passa a devolver `{ status, versao }` (`versao` lida do `package.json` no build do
   backend). Permite ver o que está no ar e detectar front/back dessincronizados.
4. Exibir a versão na interface conforme a proposta **B** aprovada no POC visual: chip na topbar ao lado da marca, com ponto de "versão nova"
   (comparada com a última visita em `localStorage`), e item "Novidades" no menu do perfil no
   mobile, onde a marca some da barra; o chip linka para `/patchnotes`. `design-fidelity` fixa o análogo aprovado.

### pn-02 — Armazenamento de texto no R2

1. Estender `core/armazenamento` com leitura de texto (`lerTexto(chave)`) e gravação
   (`salvarTexto`) nas duas implementações (local em disco, R2), sem quebrar `salvarImagem`/
   `excluirImagem`. Pasta/prefixo próprio `patchnotes/` em `armazenamento-chave.util.ts`.
2. Testes das duas implementações no padrão dos `*.provedor.spec.ts` existentes.

### pn-03 — Backend `patchnotes`

1. Módulo `patchnote` (controller fino → service; **sem repository**, não há SQL):
   `GET /patchnote` (índice, mais recente primeiro) e `GET /patchnote/:versao` (nota completa) — API
   no singular como o resto do projeto; a página pública é `/patchnotes`.
   Ambos `@Public()`, `@DocumentarController`.
2. Cache em memória de 24 h para o índice e para cada nota; versão inexistente ou fora do padrão
   SemVer responde `ResourceNotFoundException` — a `:versao` é validada antes de virar chave do
   R2 (sem path traversal).
3. DTOs em `shared/src/dtos/patchnote/` seguindo `dto-conventions` (ex.: `PatchnoteResumoDto`
   para o índice, `PatchnoteDto` com o Markdown). Mesmo contrato usado pelo frontend.
4. Testes de service (cache hit/miss, expiração, versão inválida) e do controller.

### pn-04 — Página pública `/patchnotes`

1. Rota pública (lista de versões + detalhe da versão), renderizando o Markdown com `marked`
   **e sanitizando o HTML** antes de exibir — o conteúdo vem de fora do bundle.
2. Estados, conforme o POC aprovado: **carregando** (esqueleto do primitivo de `shared/ui/`),
   **versão inexistente** (404) e **falha ao carregar** (503). Os dois últimos reaproveitam o
   documento de contenção da tela de Acesso negado (`modules/acesso-negado/`: cabeçalho
   `// PROTOCOLO DE CONTENÇÃO` com código, faixa de classificação, bloco da Fundação, registro
   expurgado, rodapé com botões), extraído para um componente compartilhado em vez de copiado. O
   tom é SCP, mas cada estado diz numa frase direta o que houve e o que fazer ("Tentar
   novamente", "Ver todas as versões"). Biblioteca de componentes é obrigatória; se faltar um
   primitivo, parar e perguntar ao autor.
3. Gate visual completo (`design-fidelity` + `verify`): `1920×1080` e `360×800`, todos os estados.

### pn-05 — Skill `publicar-versao`

1. Nova skill nas duas cópias idênticas (`.claude/skills/publicar-versao/` e
   `.agents/skills/publicar-versao/`), cumprindo o contrato comum a toda skill do projeto:
   `description` em forma de gatilho ("publicar versão", "lançar versão", "fechar release",
   "escrever patchnotes", "subir versão"), ponteiro para esta spec/`docs/` em vez de cópia, até
   ~150 linhas.
2. A skill carrega a **ordem de execução**: (a) descobrir a última tag e listar o que mudou desde
   ela (`git log` + `docs/context/HISTORY.md`); (b) propor o bump conforme a decisão 5 e **pedir
   confirmação do autor**; (c) redigir o patchnote no formato da decisão 3 — traduzindo o
   histórico técnico para linguagem de jogador; (d) atualizar `version` nos quatro `package.json`
   (e o lock); (e) gravar o rascunho em `docs/patchnotes/<versao>.md` (ignorado pelo git); (f) commit da
   mudança de versão e tag `v<versao>`;
   (g) publicar no R2 (script `patchnotes:publicar`, que sobe o `.md` e regenera o
   `indice.json`; roda **localmente**, com credencial de escrita nas variáveis do autor, porque o
   `.md` não está no git e portanto um passo do `cloudbuild.yaml` não o enxerga); (h) registrar em
   `HISTORY.md`.
3. Checklist de conferência e armadilhas: nota sem termo técnico; versão igual nos quatro
   `package.json`; tag e nota apontam para a mesma versão; nunca subir o *major* sem pedido do autor.
4. **Push da tag e publicação no R2 são ações externas: a skill sempre confirma com o autor antes.**
5. Validação por uso: a skill só fecha depois de publicar os dois patchnotes retroativos reais
   (`v1.0.0` e `v1.1.0`) e de eles aparecerem na página pública. O intervalo de cada um vem das
   tags: `v1.0.0` = início → `306a9714`; `v1.1.0` = `v1.0.0` → HEAD.

## Critérios de Aceite

1. `git grep -n '"version"' -- '*package.json'` mostra `1.4.0` nos quatro pacotes; as tags
   `v1.0.0`…`v1.4.0` existem nas fronteiras da decisão 6; `git check-ignore docs/patchnotes/x.md` confirma
   a pasta ignorada.
2. `GET /health` devolve a versão; a interface mostra a mesma versão do `package.json`.
3. `GET /patchnote` e `GET /patchnote/:versao` respondem **sem token**; segunda chamada dentro
   das 24 h não lê o R2 (teste com provedor espião).
4. Markdown com `<script>` ou `onerror=` numa nota **não** executa na página.
5. `npm run test --workspace=shared`, `--workspace=backend` e o do frontend verdes; lint e build
   sem novos avisos; `diff -r .claude/skills .agents/skills` vazio.
6. Gate visual da `pn-04` e do ponto de exibição da versão registrado no fecho (análogo, viewports,
   estados).
7. A skill foi exercitada publicando `v1.0.0`…`v1.4.0`, com as cinco notas lidas na página pública real.

## Fora de Escopo

- Editor de patchnotes na interface; a autoria é Markdown local, publicado no R2 pela skill.
- Notificação in-app "há novidades desde sua última visita" (candidata a ideia futura).
- Traduzir/gerar automaticamente a nota a partir de commits sem revisão do autor.
- Paginação do índice, busca, RSS, comentários.
- Mudança de qualquer regra de jogo ou de tabela do banco (não há migration nesta spec).

## Dependências

- `core/armazenamento` (m3-62) e a configuração `ARMAZENAMENTO_*` já existentes.
- `docs/design/` e um análogo aprovado, escolhido na `pn-04`, para a página; `marked` já está
  no frontend.
- Credencial de **escrita** no R2 na máquina do autor (só a leitura já está no backend).
- POC visual: https://claude.ai/artifact/E2xhXddp4QyyT4i9tjBqsL (posição da versão e página
  `/patchnotes`, em desktop e mobile), a servir de análogo para o gate da `pn-01`/`pn-04`.

## Perguntas abertas

Nenhuma. Fechadas em 2026-09-29: versão-base (`1.0.0` + `1.1.0`), fonte única no R2 com
`docs/patchnotes/` ignorada, publicação local, **posição B** (chip na topbar, item no menu do
perfil no mobile), layout da página `/patchnotes` e os estados no formato de "Acesso negado".
Próximo passo: quebrar em `pn-01`…`pn-05` (uma spec por task) antes de implementar.

## Riscos e Mitigação

- **Nota com jargão.** A skill traduz do histórico técnico; o autor revisa antes do commit.
- **Versão divergente** entre pacotes/tag/nota: a skill confere os três e o critério 1 prova.
- **HTML injetado** via Markdown: sanitização obrigatória (critério 4).
- **Credencial de escrita no R2** só na máquina do autor: nunca em repositório; a skill lê das variáveis de ambiente e recusa rodar sem elas.
- **Cache de 24 h** escondendo correção de nota: aceito e documentado (decisão 2).
