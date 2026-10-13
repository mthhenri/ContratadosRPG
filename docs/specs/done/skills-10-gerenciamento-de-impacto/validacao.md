# Validação por uso — skills-10-gerenciamento-de-impacto

Exercício da skill `gerenciamento-de-impacto` sobre o caso que a originou: o botão "Trocar senha"
do Perfil exibindo a medalha de `patente`. Evidências brutas (capturas) em
`.artifacts/skills-10-gerenciamento-de-impacto/`, local e ignorada.

## 1. Nomear a mudança

Reaproveitamento **para dentro**: `perfil.page.html:139` usava `<app-icone nome="patente" />`.
`git log -L` no `@case ("patente")` mostra o desenho (medalha) inalterado desde a origem; o botão
nasceu emprestando o glifo em `6b33f25d` (m2-14). Não houve troca de desenho que passou
despercebida — houve um empréstimo de sentido. Mudança: glifo novo `senha` (aditivo) + troca no
consumidor.

## 2–3. Consumidores e classificação

### Impacto — glifo `patente` (consumidor emprestado sai)
Busca: `npm run impacto -- --icone patente` → 8 consumidores + 1 teste; pontos cegos conferidos:
`icone: 'patente'` em `simulacao-shell.component.ts`, `icones-dominio.ts` (sem `patente`), alias
`glifo()` (não envolve `patente`).

| Consumidor | Classe | Decisão |
|---|---|---|
| `usuario/paginas/perfil/perfil.page.html:139` (botão "Trocar senha") | destoa | item próprio `senha` (pedido do autor) |
| `simulacao/simulacao-shell.component.ts:32` (aba "Patentes") | não muda | glifo `patente` intocado |
| `simulacao.routes.ts`, `estado-abas-simulacao.service.ts`, `conteudo-ajuda.ts`, `patente.page.*` | falso positivo (rota/chave de estado/aba de ajuda) | — |
| `npc-identidade.component.html:270` (`[value]="patente"`) | falso positivo (variável do `@for`) | — |

### Impacto — `icone.component.*` (adição do glifo `senha`)
Busca: `npm run impacto -- frontend/src/app/shared/icone/icone.component.ts` → 262 consumidores.
Mudança só aditiva (novo `@case` e novo membro de `IconeNome`); nenhum glifo existente alterado,
logo nenhum consumidor muda. `npm run impacto -- --icone senha` antes de adicionar: só literais de
`formControlName="senha"`/`'senha'` de formulário (login, registro, gestão) — nome livre. "Redefinir
senha" da Gestão não tem ícone: sem consumidor a acompanhar.

## 4. Decisão

Pedido do autor cobre explicitamente o único consumidor afetado (Perfil). Aplicado.

## 5. Verificação

- Teste focado `icone.component.spec.ts`: 57/57 (inclui `senha` ≠ `patente` ≠ `vincular`).
- Lint dos arquivos tocados: 0 erros. `npm run lint --workspace=frontend` falha por 2 erros
  **preexistentes** em `regras/oficina/oficina-texto.component.ts` (`no-irregular-whitespace`,
  linhas 234–235, vindos do commit `9b853801`), fora desta tarefa.
- Ao vivo (frontend 4300/backend 3100 do autor, usuário de verificação `impacto*` criado por
  REST), `1920×1080` e `360×800`:
  - Perfil: o botão "Trocar senha" desenha a chave (2 `path`, `d` "M16.555 3.843…"), mesmo traço
    e peso do lápis de "Salvar perfil" e da lixeira de "Excluir conta" — análogo aprovado: os
    demais botões da própria tela; sem overflow horizontal; botão 34,5 px (desktop) / 44 px (mobile).
  - Simulação → aba "Patentes": continua a medalha (`circle r=5`) nos dois viewports — o
    consumidor que fica foi conferido como não alterado.
- Limite: o anel de foco não foi observado (foco programático não aciona `:focus-visible`); o
  primitivo `app-botao` não foi alterado.

## Achados da validação

- O hook disparou ao vivo nas duas primeiras edições de `icone.component.ts/.html` e ficou calado
  no `.spec.ts` e no Perfil (1 consumidor).
- Divergência de valores entre `docs/design/tema/_tokens.scss` e `frontend/src/styles/tema/_tokens.scss`
  apesar de `DESIGN.md` declarar espelho 1:1 → `PROBLEMS.md` `P-126`.
