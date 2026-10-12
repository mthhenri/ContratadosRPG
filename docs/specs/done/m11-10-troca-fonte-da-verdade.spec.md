# m11-10-troca-fonte-da-verdade.spec.md

> Task 10/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Fecha a
> milestone: o banco passa a ser a fonte da verdade e `docs/core/` vira cópia gerada.

## Objetivo

Exportar cada versão publicada para `docs/core/` como cópia gerada, emendar a documentação do
projeto para a nova fonte da verdade e aposentar o normalizador do build.

## Entregáveis

1. **Comando** `npm run regras:exportar` que lê a versão `PUBLICADA` atual de cada livro e grava em
   `docs/core/` a cópia gerada. **Formato decidido nesta task com o autor** (Markdown legível com
   identificadores, JSON da fotografia, ou os dois), com cabeçalho "arquivo gerado — não editar".
   Nome do arquivo segue a versão (`sistema-v<numero>.md`); o anterior é removido pelo comando.
2. **Exportação a partir do banco real** das duas versões atuais; conferir que o conteúdo exportado
   reproduz as regras vigentes (comparação com os `.md` anteriores no git, diferenças listadas e
   aprovadas).
3. **Emenda ao `SYSTEM.SPEC.md` §1.1** (e árvore da §3): fonte da verdade = banco; `docs/core/`
   é cópia gerada e não se edita à mão. **Mesma alteração em `CLAUDE.md` e `AGENTS.md`** (cópias
   integrais idênticas) e na skill `regras-do-jogo` (`.claude/skills/` e `.agents/skills/`
   idênticas, `diff -r` vazio): como achar a regra, como alterá-la (pela Oficina), onde ficam
   motor e consumidores derivados.
4. **Normalizador sai do `prestart`/`prebuild`** do frontend: fica como importador (ferramenta
   avulsa). O leitor já lê da API (`m11-04`); remover `public/regras/sistema.json`/`guia.json`
   do fluxo de build conforme o que a `m11-04` decidiu sobre carga e cache, sem quebrar impressão
   nem painel flutuante.
5. **Proteção contra edição à mão**: `repo:verificar` (ou verificação equivalente) acusa divergência
   entre `docs/core/` e a exportação, ou o cabeçalho ausente.
6. **Registro**: `docs/context/` atualizado (CONTEXT, HISTORY, MEMORY) e `IDEAS.md` com `I-053`
   marcada como concluída; milestone M11 movida para `done/` com as tasks.

## Critérios de Aceite

- `regras:exportar` é idempotente (rodar duas vezes não gera diff) e produz as duas cópias a partir
  do banco.
- Build e `npm run start` do frontend funcionam sem o normalizador; leitor, painel, pesquisa e
  impressão verificados com `verify` em `1920×1080` e `360×800` (regressão zero).
- `diff CLAUDE.md AGENTS.md` e `diff -r .claude/skills .agents/skills` vazios;
  `npm run repo:verificar` e `npm run repo:verificar -- --staged` limpos.
- Testes dos três workspaces verdes (`test:regras` do frontend ajustado ao novo papel do
  normalizador).

## Fora de Escopo

Gerar catálogos do `shared/regras` a partir do livro (`I-052`); versões anteriores à 4.1.4;
criar livro novo pela interface; qualquer mudança de regra do jogo.

## Dependências

`m11-03` e `m11-04` em `done/` (`m11-09` recomendada antes, para a primeira edição real passar pelo
fluxo completo). `SYSTEM.SPEC.md` §1.1 e a regra de espelhamento do `CLAUDE.md`.

## Riscos e Mitigação

- **Agentes e testes que leem `docs/core/` quebrando** (ex.: testes que validam fórmula contra o
  documento): levantar os consumidores antes e manter o nome e a estrutura que eles esperam.
- **Cópia gerada editada à mão por hábito**: o cabeçalho e a verificação do item 5 existem para
  isso.
