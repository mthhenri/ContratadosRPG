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

1. **Patchnotes vivem no R2 como Markdown, sem tabela.** É conteúdo editorial, não relacional.
   Um arquivo por versão (`patchnotes/<versao>.md`) mais um `patchnotes/indice.json` com a lista.
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
5. **SemVer enquanto `0.x`:** funcionalidade nova visível ao usuário sobe o *minor*
   (`0.1.0 → 0.2.0`); só correção sobe o *patch*. `1.0.0` é decisão do autor, nunca do agente.
6. **Área pública.** `/patchnotes` (lista + detalhe) sem login, como as calculadoras/simulação;
   os endpoints do backend usam `@Public()`.

## Entregáveis

### pn-01 — Versão como fonte única

1. Corrigir o `version` da raiz e dos três workspaces para a versão-base definida pelo autor (ver
   "Perguntas abertas") e criar a tag git correspondente.
2. Script de prebuild do frontend que gera uma constante `versao` (versão + SHA curto do commit)
   a partir do `package.json`; `environment` não duplica o número à mão.
3. `GET /health` passa a devolver `{ status, versao }` (`versao` lida do `package.json` no build do
   backend). Permite ver o que está no ar e detectar front/back dessincronizados.
4. Exibir a versão na interface. Local **a decidir no gate visual** (ver "Perguntas abertas"):
   `design-fidelity` escolhe o análogo aprovado; o item linka para `/patchnotes`.

### pn-02 — Armazenamento de texto no R2

1. Estender `core/armazenamento` com leitura de texto (`lerTexto(chave)`) e gravação
   (`salvarTexto`) nas duas implementações (local em disco, R2), sem quebrar `salvarImagem`/
   `excluirImagem`. Pasta/prefixo próprio `patchnotes/` em `armazenamento-chave.util.ts`.
2. Testes das duas implementações no padrão dos `*.provedor.spec.ts` existentes.

### pn-03 — Backend `patchnotes`

1. Módulo `patchnotes` (controller fino → service; **sem repository**, não há SQL):
   `GET /patchnotes` (índice, mais recente primeiro) e `GET /patchnotes/:versao` (nota completa).
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
2. Estados de carregando, vazio e erro com os primitivos de `shared/ui/` (biblioteca de
   componentes é obrigatória; parar e perguntar se faltar algum).
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
   (e o lock); (e) gravar `docs/patchnotes/<versao>.md`; (f) commit e tag `v<versao>`;
   (g) publicar no R2 (script `patchnotes:publicar`, que sobe o `.md` e regenera o
   `indice.json`); (h) registrar em `HISTORY.md`.
3. Checklist de conferência e armadilhas: nota sem termo técnico; versão igual nos quatro
   `package.json`; tag e nota apontam para a mesma versão; nunca `1.0.0` sem pedido do autor.
4. **Push da tag e publicação no R2 são ações externas: a skill sempre confirma com o autor antes.**
5. Validação por uso: a skill só fecha depois de publicar a versão-base real (o mesmo ato que
   corrige o `0.0.1`).

## Critérios de Aceite

1. `git grep -n '"version"' -- '*package.json'` mostra a mesma versão nos quatro pacotes; a tag
   `v<versao>` existe.
2. `GET /health` devolve a versão; a interface mostra a mesma versão do `package.json`.
3. `GET /patchnotes` e `GET /patchnotes/:versao` respondem **sem token**; segunda chamada dentro
   das 24 h não lê o R2 (teste com provedor espião).
4. Markdown com `<script>` ou `onerror=` numa nota **não** executa na página.
5. `npm run test --workspace=shared`, `--workspace=backend` e o do frontend verdes; lint e build
   sem novos avisos; `diff -r .claude/skills .agents/skills` vazio.
6. Gate visual da `pn-04` e do ponto de exibição da versão registrado no fecho (análogo, viewports,
   estados).
7. A skill foi exercitada publicando a versão-base, com a nota lida na página pública real.

## Fora de Escopo

- Editor de patchnotes na interface; a autoria é Markdown no repositório.
- Notificação in-app "há novidades desde sua última visita" (candidata a ideia futura).
- Traduzir/gerar automaticamente a nota a partir de commits sem revisão do autor.
- Paginação do índice, busca, RSS, comentários.
- Mudança de qualquer regra de jogo ou de tabela do banco (não há migration nesta spec).

## Dependências

- `core/armazenamento` (m3-62) e a configuração `ARMAZENAMENTO_*` já existentes.
- `docs/design/` e um análogo aprovado, escolhido na `pn-04`, para a página; `marked` já está
  no frontend.
- `cloudbuild.yaml` — o script de publicação precisa de credencial de **escrita** no R2.

## Perguntas abertas (decidir antes de quebrar em tasks)

1. **Versão-base.** Sugestão: `0.1.0` (o produto já tem campanhas, fichas, cenas e documentos —
   mais do que `0.0.x`). Confirmar ou escolher outra.
2. **Onde exibir a versão.** Hoje o layout só tem a topbar, sem footer. Opções: footer discreto
   global; item pequeno no fim da topbar/menu do usuário; só na tela de login e em "Sobre".
   Decidir na `pn-01` com o gate visual.
3. **Fonte dos `.md`.** Sugestão: `docs/patchnotes/*.md` versionado no git (revisão por PR, histórico)
   e o R2 como espelho servido ao público. Confirmar; a alternativa é o R2 ser a única cópia.
4. **Quem publica no R2.** Local, com credencial de escrita nas variáveis do autor, ou automático num
   passo do `cloudbuild.yaml` no deploy. O segundo evita credencial na máquina do autor, mas
   acopla a publicação do texto ao deploy.

## Riscos e Mitigação

- **Nota com jargão.** A skill traduz do histórico técnico; o autor revisa antes do commit.
- **Versão divergente** entre pacotes/tag/nota: a skill confere os três e o critério 1 prova.
- **HTML injetado** via Markdown: sanitização obrigatória (critério 4).
- **Cache de 24 h** escondendo correção de nota: aceito e documentado (decisão 2).
