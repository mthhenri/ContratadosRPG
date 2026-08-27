# skills-03-verify-alinhamento.spec.md

> Task 3/9 do guarda-chuva `skills-agentes.spec.md`.

## Objetivo

Alinhar as duas cópias da skill `verify` mantendo **a versão mais rica e completa** — a de
`.claude/` — como base, sem perder o pouco que a cópia de `.agents/` acrescenta, e deixar as duas
idênticas.

## Motivação

As duas cópias divergiram e, ao contrário do caso de `dto-conventions`, aqui a versão de
`.claude/` é a boa. A de `.agents/` é um resumo que apagou justamente o conteúdo que uma skill
de verificação existe para carregar — a armadilha de campo, com número, sintoma e comando:

| Conteúdo | `.claude/` | `.agents/` |
|---|---|---|
| Resolução do Playwright global (`npm root -g`, `require.resolve` com `paths`) | tem, com o snippet | virou "Playwright está disponível globalmente" |
| Armadilha `shared/dist`: sintoma 404/`TS2724`, e matar processo órfão em `EADDRINUSE` | tem, com diagnóstico completo | tem o essencial, sem o `EADDRINUSE` |
| 500 fantasma de CORS: por que só PUT/POST/DELETE, e por que `GET` não | tem a explicação | virou uma frase de causa |
| Seletores reais da ficha (`.ficha-ident__nome`, `[aria-label="Aumentar vida"]`, `[aria-label="Vida atual"]` só no modo de digitação) | tem | perdidos |
| Tempo real: `io server disconnect` sem laço de reconexão (`socket.active === false`) | tem | virou "pode produzir connect seguido de disconnect" |
| Reconexão: `pingInterval 25s` + `pingTimeout 20s` (~45s) e o comando `docker exec … psql … UPDATE ficha` | tem os números e o comando | virou "pode levar até o intervalo de ping" |
| Container do Postgres nomeado (`contratados-rpg-postgres`) e o proxy com `ws:true` | tem | perdidos |

Um agente que carregar a cópia de `.agents/` reaprende cada uma dessas armadilhas gastando o
tempo que a skill deveria ter economizado.

## Entregáveis

1. **`SKILL.md` unificado** a partir da versão de `.claude/`, preservando integralmente os sete
   itens da tabela acima (números, comandos e seletores incluídos).
2. **Incorporar o que a cópia de `.agents/` faz melhor**, conferindo item a item no `diff` antes
   de escrever — no mínimo a frase que delimita o papel da skill ("testes e lint são
   complementares, mas não substituem a verificação manual quando ela for necessária"), que na
   versão de `.claude/` aparece de forma mais seca. Se a conferência não achar mais nada, dizer
   isso no fecho; não é preciso inventar aproveitamento.
3. **Conferir cada dado operacional contra a realidade atual** antes de congelar o texto — a
   skill vale pelos números, e número errado é pior que ausência:
   - portas `3100`/`4300` e o proxy do frontend (`frontend/proxy.conf*`, incluindo `ws: true`);
   - nome do container em `docker-compose.yml`/`scripts/db-up.mjs`;
   - chave de sessão do `localStorage` e forma do objeto lidos do `SessaoService` real;
   - `pingInterval`/`pingTimeout` conferidos no `WsIoAdapter`/gateway;
   - seletores citados, conferidos nos templates atuais da ficha;
   - `APP_FRONTEND_ORIGEM` conferido no `.env.example` e no `ConfigService`.
   Corrigir o que tiver mudado e registrar a correção no fecho.
4. **Viewports obrigatórios preservados** — `1920×1080` e `360×800`, com a nota do
   `$bp-mobile: 560px` — que já estão iguais nas duas cópias e são citados por dezenas de specs
   e por `docs/design/examples/README.md`. Nenhuma alteração aqui.
5. **Cópia idêntica** nas duas pastas.
6. **Corte de tamanho:** se o arquivo unificado passar de ~150 linhas, mover a seção de tempo
   real (WebSocket, reconexão, cliente cru) para `verify/references/tempo-real.md` nas duas
   pastas, com ponteiro no `SKILL.md`. Nesse caso, `skills-09` (`tempo-real`) referencia esse
   arquivo em vez de duplicá-lo.

## Critérios de Aceite

- `diff -r .claude/skills .agents/skills` sai vazio.
- Nenhum dos sete itens da tabela de motivação foi perdido; conferir um a um.
- Cada dado operacional citado no arquivo final foi verificado contra o código/config de hoje —
  listar no fecho o que foi conferido e o que precisou de correção.
- **Validação por uso:** rodar a própria skill de ponta a ponta em um recorte real — subir o
  stack seguindo só o que está escrito, autenticar pelo `localStorage`, abrir uma ficha e
  capturar os dois viewports. Se algum passo exigir conhecimento que não está no arquivo, o
  arquivo está incompleto; corrigir antes de fechar. Registrar o exercício no fecho.
- Fecho completo conforme `AGENTS.md`.

## Fora de Escopo

- Ampliar o alcance da skill para o gate visual (o que comparar, contra qual análogo aprovado,
  como decidir que está fiel) — isso é `skills-06` (`design-fidelity`). `verify` continua
  respondendo **como rodar e dirigir o app**, não **contra o que comparar**.
- Corrigir bug encontrado ao exercitar a skill. Se a validação por uso revelar defeito do
  produto, registrar em `PROBLEMS.md` e seguir — não corrigir no diff desta task.
- `P-023` (seed de dev quebrado) e demais problemas de ambiente. Se o seed continuar quebrado, a
  skill deve dizer isso e apontar o contorno já usado (montar cenário por REST, como registrado
  em `HISTORY.md` 2026-08-27) — documentar não é corrigir.

## Dependências

- `skills-01` (contrato e regra de sincronia) — recomendável antes. Sem bloqueio técnico.

## Riscos e Mitigação

- **Alinhar "para baixo".** O risco real é resolver a divergência copiando a versão curta por ser
  mais fácil de reconciliar. Mitigado pelo critério de aceite que exige os sete itens presentes.
- **Congelar dado desatualizado.** Mitigado pelo entregável 3 (conferência item a item) — a skill
  atual já tem trecho envelhecido em potencial, e reescrevê-la sem conferir só troca o erro de
  lugar.
