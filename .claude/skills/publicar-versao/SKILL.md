---
name: publicar-versao
description: >
  Fecha e publica uma versão do sistema: decidir o número (v1.2.0), escrever os patchnotes / notas
  de versão / changelog em linguagem de jogador, atualizar a versão nos pacotes, criar a tag e
  publicar a nota no R2. Use ao pedir "publicar versão", "lançar versão", "fechar release",
  "subir versão", "escrever patchnotes", "atualizar a nota da versão", "bumpar a versão" ou
  "a versão da topbar está errada" — mesmo sem a palavra "versão" se o pedido for contar aos
  usuários o que mudou. Ação externa (push de tag, escrita no R2): sempre confirma com o autor.
---

# Publicar versão — número, nota, tag, R2

> A decisão de produto vive em `docs/specs/done/patchnotes-versao-sistema.spec.md` (ou em `active/`
> se a spec ainda estiver aberta) — em conflito, a spec vence e esta skill é corrigida. Esta skill
> carrega a **ordem de execução**, o **checklist** e as **armadilhas**; não repete o formato nem
> as decisões.

## Onde cada coisa vive

- **Versão (fonte única):** `version` do `package.json` da raiz. `npm run versao:sincronizar`
  alinha `shared`/`backend`/`frontend`, o `package-lock.json` e gera `shared/src/versao.ts`
  (`VERSAO_SISTEMA`, exibida na topbar e em `GET /health`). Um teste de `shared` falha se divergir.
- **Nota:** rascunho local em `docs/patchnotes/<versao>.md` (**ignorado pelo git**); a fonte de
  verdade é o R2 (`patchnotes/<versao>.md` + `patchnotes/indice.json`).
- **Publicação:** `npm run patchnotes:publicar -- [--dry-run] <arquivo.md>...`
  (`backend/tools/patchnotes/publicar.ts`).
- **Formato da nota e limites:** `backend/src/modules/patchnote/patchnote-formato.util.ts` e
  `shared/src/validators/patchnote.validators.ts`.

## Ordem de execução

1. **Situar.** Árvore limpa? Branch certa? Última versão: `git describe --tags --abbrev=0 --match 'v*'`.
   Versões históricas: `v1.0.0` = `306a9714` (fim de 01/09/2026). Sem tag alcançável, pare e pergunte.
2. **O que mudou.** `git log <última-tag>..HEAD --no-merges --format='%ad %s' --date=short` e, para o
   porquê, `docs/context/HISTORY.md` (procure por data ou código da task — não leia o arquivo inteiro).
3. **Propor o número e pedir confirmação.** Funcionalidade nova visível → *minor*; só correção →
   *patch*; quebra de uso existente → *major*. **Nunca suba o major sem o autor pedir.** Confirme
   o número antes de escrever qualquer coisa.
4. **Redigir a nota** em `docs/patchnotes/<versao>.md`, no formato de `references/linguagem-de-jogador.md`
   (front matter, blocos Novidades/Melhorias/Correções, tradução técnico → jogador). Data = hoje.
5. **Mostrar ao autor o texto e esperar aprovação.** Ele revisa a nota, não o commit.
6. **Versão nos pacotes.** Edite `version` na raiz → `npm run versao:sincronizar` → confira
   `git diff --stat` (4 `package.json`, lock, `shared/src/versao.ts`) → `npm run build --workspace=shared`
   e `npm run test --workspace=shared`.
7. **Commit e tag.** `chore(versao): vX.Y.Z` com o trailer de coautoria (`CLAUDE.md`); tag anotada
   `git tag -a vX.Y.Z -m "vX.Y.Z"` **no commit da versão**; confira com `git show vX.Y.Z --stat`.
8. **Confirmar antes de sair do repositório.** Peça o OK do autor para: `git push origin vX.Y.Z` e
   para escrever no R2. Sem OK explícito para cada um, pare e relate.
9. **Simular.** `npm run patchnotes:publicar -- --dry-run docs/patchnotes/<versao>.md` — leia a linha
   `Destino:`. Ela precisa dizer `R2 (bucket …)`; `disco local` significa que `ARMAZENAMENTO_PROVEDOR`
   está `local` e **nada** irá para produção.
10. **Publicar** (mesmo comando sem `--dry-run`) com as variáveis `ARMAZENAMENTO_PROVEDOR=r2` e
    `ARMAZENAMENTO_R2_*` no ambiente do comando. Credencial nunca vai para arquivo versionado, log
    ou mensagem de commit; sem elas a ferramenta recusa rodar.
11. **Conferir de verdade.** `GET <api>/patchnote/<versao>` e a página `/patchnotes/<versao>` (skill
    `verify` no ambiente local). O índice tem que listar a versão em primeiro.
12. **Registrar.** Bloco novo no topo de `docs/context/HISTORY.md` (versão, resumo, o que foi
    conferido e o que ficou pendente) e, se houver, a linha de versão vigente em `CONTEXT.md`.

## Checklist da nota (antes de mostrar ao autor)

- [ ] Nenhum nome de arquivo, rota, tabela, migration, sigla (`P-0NN`, `I-0NN`, `m9-13`) nem termo técnico.
- [ ] Cada item diz o que o jogador/mestre **passa a poder fazer** ou **deixa de sofrer**.
- [ ] Nível macro: de 3 a 12 itens por bloco; itens parecidos viram um só. Bloco vazio não entra.
- [ ] Título ≤ 120 caracteres, descritivo (não "Atualização de setembro").
- [ ] `versao` = a da raiz; `data` = `AAAA-MM-DD` real; front matter válido (`--dry-run` prova).

## Armadilhas de campo

- **Cache de 24 h no backend.** Uma correção de nota *sem* deploy só aparece quando o cache vence;
  nota nova junto de deploy aparece na hora (processo novo). Localmente, reinicie a API.
- **`docs/patchnotes/` não é versionada.** Perdeu o rascunho? Ele não está perdido: a nota está no R2.
  Para editar uma versão publicada, reconstrua o arquivo a partir de `GET /patchnote/<versao>`
  (front matter + `conteudoMarkdown`) e republique — o mesmo arquivo **substitui** a versão.
- **Caminhos do comando** valem a partir de onde você digitou (o script usa `INIT_CWD`).
- **Publicar várias versões de uma vez** é permitido (`a.md b.md`); todas são validadas antes de
  gravar qualquer uma, e o índice é gravado por último.
- **Versão divergente** entre pacotes/`versao.ts`: rode `npm run versao:sincronizar`, nunca edite `versao.ts`.
- **Tag no commit errado:** tag ainda não enviada se apaga e recria; depois do push, pergunte antes.
