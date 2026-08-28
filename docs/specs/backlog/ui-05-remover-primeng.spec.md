# ui-05-remover-primeng.spec.md

> Task 5/5 do guarda-chuva `ui-biblioteca-componentes.spec.md`. Curta e independente das demais
> uma vez que `ui-02` esteja em `done/`. Origem: `PROBLEMS.md` `P-034`.

## Objetivo

Remover `primeng` e `@primeuix/themes` do projeto, deixar o tema "Terminal de Contenção" apoiado
só nas CSS custom properties que já são a fonte de verdade em runtime, colher a redução de bundle
e alinhar a documentação — a começar pela linha do `SYSTEM.SPEC.md` que descrevia a UI.

## Entregáveis

1. **Desinstalar** `primeng` e `@primeuix/themes` de `frontend/package.json`; remover
   `providePrimeNG(...)` e o `import` do preset de `app.config.ts`.
2. **`TemaService` sem `@primeuix`**: remover `import { palette, updatePrimaryPalette }` e o bloco
   `try/catch` que sincroniza a paleta primária (`tema.service.ts`, ~linhas 501–509). O comentário
   local já diz que é "sincronização opcional — o tema já vale pelas CSS custom properties"; sem
   componente PrimeNG na tela, ele não tem mais consumidor. Tudo o mais do serviço (presets de
   accent, color picker, trava de contraste WCAG, persistência, `provideAppInitializer`) fica.
3. **Decidir o destino da classe `.dark`**, com evidência. Ela existe hoje como `darkModeSelector`
   do PrimeNG e **nenhum SCSS do projeto a usa como seletor**; a base clara é aplicada por
   custom properties escritas em `<html>`. Antes de remover o `classList.toggle('dark', …)`,
   confirmar ao vivo que a troca claro/escuro continua correta — inclusive o `color-scheme` de
   `tema/_base.scss`, cujo comentário ("dark-only por enquanto, `<html class="dark">` fixo") está
   desatualizado desde a `m1-13` e deve ser corrigido de qualquer forma.
4. **Excluir `frontend/src/styles/tema/contencao.preset.ts`** (97 linhas) — o preset mapeia tokens
   do tema para tokens do PrimeNG e fica sem função. Conferir antes que nenhum valor viva **só**
   ali: se algum existir, promovê-lo a `_tokens.scss` na mesma task.
5. **Bundle**: medir o bundle inicial de produção antes e depois e **baixar** o
   `budgets.initial.maximumWarning` do `angular.json` (hoje `630kB`) para perto do novo valor.
   Registrar os dois números no fecho. É a primeira redução real desde que `P-004` foi aberto — e
   `P-004` continua aberto depois disso, porque a causa dele (chunk inicial sem lazy) não é esta.
6. **Documentação**, tudo na mesma task:
   - `docs/SYSTEM.SPEC.md`: §Stack → "UI"; §8 Arquitetura do Frontend → o interceptor
     `error-handler` deixa de exibir "toast PrimeNG"; §16 → avaliar uma proibição nova, no espírito
     das #29/#30, proibindo copiar bloco BEM de um componente para outro em vez de consumir o
     primitivo.
   - `docs/CONVENTIONS.md`: seções "Frontend (Angular)" e "Estilos", e a linha da tabela de
     proibições sobre NgModule/`.css`/`style=""`.
   - `docs/design/DESIGN.md`: §"Componentes visuais base" e a referência ao preset em §"Arquivos".
   - `docs/design/tema/_componentes.scss`: cabeçalho deixa de mandar copiar e passa a apontar para
     `shared/ui/`, bloco a bloco.
   - `docs/context/CONTEXT.md`: seção "Tema" e a decisão vigente "PrimeNG 21 sem
     `@angular/animations`", que perde o objeto — a nota de não wirar `provideAnimationsAsync()`
     some junto com a dependência que a motivava.
   - Skills: nenhuma cita PrimeNG hoje (`grep` conferido em 2026-08-28), mas `design-fidelity` e
     `convencoes-check` falam de copiar bloco BEM — ajustar **nas duas pastas**.

## Critérios de Aceite

- `grep -rn "primeng\|primeuix\|PrimeNG" frontend/src frontend/package.json docs/` retorna apenas
  registro histórico (`docs/context/HISTORY.md` e specs em `docs/specs/done/`), que não se
  reescreve.
- `npm install` limpo, build de produção verde, suíte do frontend e `npm run lint` (raiz) sem erro
  novo; `P-033` relatado à parte.
- Bundle inicial **menor** que o de partida, com o budget baixado junto — os dois números no fecho.
- **Gate visual (proibição #31)**: a troca de tema em runtime percorrida inteira em `1920×1080` e
  `360×800` — os 9 presets de accent, base clara e escura, color picker custom, slot salvo, a
  trava de contraste e a nota de cor adaptada. É o recorte que mais depende do que está sendo
  removido, e a `m1-13`/`m1-16` são o análogo aprovado.
- `diff -r .claude/skills .agents/skills` vazio; `AGENTS.md` e `CLAUDE.md` idênticos.

## Fora de Escopo

- **Corrigir `P-004`.** Aqui só se colhe o que a saída do PrimeNG devolver; o passe de lazy
  loading do chunk inicial continua pendente.
- Trocar a identidade visual, os tokens ou o comportamento da troca de tema.
- Substituir o Tailwind. Ele é ortogonal a esta frente e aparece em 3 dos 63 templates — se vale a
  pena mantê-lo é outra conversa, e cabe em `IDEAS.md`.
- Reescrever specs de `docs/specs/done/` que citem PrimeNG — são registro histórico.

## Dependências

- `ui-02` em `done/` (nenhum `p-dialog`/`p-toast`/`MessageService` restante). As demais tasks da
  série não bloqueiam esta, mas fechar `ui-04` antes evita documentar uma regra de consumo que o
  código ainda não cumpre.

## Riscos e Mitigação

- **A classe `.dark`.** É o único ponto onde remover PrimeNG pode quebrar o tema de verdade. Por
  isso é entregável com evidência exigida (entregável 3), não uma linha apagada de passagem.
- **Documentação parcial.** São seis lugares mais as duas pastas de skills; deixar um para depois
  recria exatamente o defeito que `P-034` registra — documentação que descreve um sistema que não
  existe mais. O `grep` do primeiro critério de aceite é o que fecha essa porta.
