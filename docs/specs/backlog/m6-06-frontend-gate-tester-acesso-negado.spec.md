# m6-06-frontend-gate-tester-acesso-negado.spec.md

> Task 6/7 do milestone `m6-gestao-usuarios-papeis.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e a identidade "Terminal de Contenção"
> em `docs/design/tema/`. Não existe hoje uma tela análoga de negação/erro no projeto — esta é
> a primeira; ainda assim, reusar shell, tokens, tipografia (`IBM Plex`) e componentes de
> feedback já existentes (ex.: estados vazios/erro de outras telas) em vez de desenhar do zero
> sobre HTML genérico (Proibição #29, processo de UI do `AGENTS.md`).

## Objetivo

Infra **genérica** de acesso limitado a testers, pronta para uso em módulos futuros — **sem
aplicar** em nenhuma tela atual. Duas peças: um guard de rota `tipoGuard(tipos)` e a tela de
"acesso negado" para onde ele redireciona, na estética institucional SCP já definida no spec do
milestone (censura, `[DADOS EXPURGADOS]`/`REDACTED`, chip de classificação).

## Entregáveis

1. **`tipoGuard`** (`frontend/src/app/core/guards/tipo.guard.ts`) — **factory** de
   `CanActivateFn` parametrizada pelos tipos permitidos, ex.: `tipoGuard([TipoUsuarioEnum.
   ADMIN, TipoUsuarioEnum.TESTER])`. Sem sessão → mesmo comportamento do `autenticacaoGuard`
   (redireciona a `/login` guardando `retorno`); com sessão mas tipo fora da lista →
   redireciona a `/acesso-negado`. É o guard genérico que qualquer módulo "em testes" usa nas
   próprias rotas — nenhuma rota atual o consome nesta task.
2. **Rota `/acesso-negado`** em `app.routes.ts` (standalone, lazy, sem guard próprio — é o
   destino de negação, não uma área protegida).
3. **Tela de "acesso negado"** (`frontend/src/app/modules/acesso-negado/` ou
   `frontend/src/app/shared/acesso-negado/`, a decidir pela convenção de "página sem módulo de
   negócio" vs "componente compartilhado" na implementação):
   - Texto corporativo/frio no tom da Fundação (mensagem de acesso restrito, sem detalhar o que
     está sendo ocultado).
   - Blocos de censura (retângulos pretos) sobre parte do conteúdo/texto.
   - `[DADOS EXPURGADOS]` / `REDACTED` sobrepostos a algum trecho.
   - Chip de classificação no padrão `CLASSE-_ // CONFIDENCIAL` (ex.: `CLASSE-4 //
     CONFIDENCIAL`, valor exato a definir no corte visual).
   - Ação de retorno (ex.: botão para `/painel`).
   - Só tokens do tema (Proibição #29) — nenhuma cor/fonte/raio hardcoded; a tela é
     **reaproveitável** por qualquer negação de acesso futura, não só a de tester (ex.: um
     eventual "não é membro desta campanha").
4. **Guia de aplicação num módulo novo** (comentário JSDoc no `tipoGuard` + trecho curto no
   `AGENTS.md`/`CONTEXT.md`): como adicionar `canActivate: [tipoGuard([...])]` nas rotas de um
   módulo em teste e como removê-lo quando o módulo abre para todos — espelhando o guia
   equivalente do backend (`@TiposPermitidos`, `m6-02`).

## Critérios de Aceite

- `tipoGuard` existe, testado (sem sessão → `/login`; sessão sem o tipo exigido → `/acesso-
  negado`; sessão com o tipo exigido → libera), e documentado para aplicação futura.
- Nenhuma rota atual do sistema fica restrita por este guard nesta entrega.
- Tela de "acesso negado" segue a estética institucional SCP descrita acima, usando só tokens
  do tema; acessível diretamente (sem crashar) mesmo sem vir de um redirect do guard.
- Padrões do frontend respeitados (standalone, Signals se houver estado, `.scss`/BEM —
  Proibições #16/#17/#18/#29).

## Fora de Escopo

- Aplicar o gate em qualquer módulo existente (calculadora, campanha, ficha) — nenhum trava
  nesta entrega.
- `adminGuard` e a tela de gestão de usuários (`m6-05`) — guards independentes, sem dependência
  cruzada entre as duas tasks.
- Validação/refinamento mobile — `m6-07`.

## Dependências

- `m6-02` (`TipoUsuarioEnum`, `tipo` no JWT/sessão — o guard lê `sessaoService.usuario()?.tipo`,
  já disponível desde que a `m6-02`/`m6-05` exponham o campo no `SessaoService`).
- `docs/design/DESIGN.md` e `docs/design/tema/` (identidade visual).
