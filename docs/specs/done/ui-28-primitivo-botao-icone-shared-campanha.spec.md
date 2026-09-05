# ui-28-primitivo-botao-icone-shared-campanha.spec.md

> Task 1/5 da série `ui-28`…`ui-32` (`docs/specs/backlog/INDEX-adocao-total-botao-icone.md`),
> origem `P-048` (`docs/context/PROBLEMS.md`). Fundação: amplia `app-botao-icone` e adota em
> `shared/` + `modules/campanha` — inclui os 5 controles já identificados na auditoria da `m8-03`
> (`.detalhe__cabecalho-voltar`, `.espectador__voltar`, `.detalhe__membro-acao` ×3,
> `.detalhe__cabecalho-menu-botao` ×2, `.rolagem-pill__d20`).

## Objetivo

Todo controle clicável de `frontend/src/app/shared/**` e `frontend/src/app/modules/campanha/**`
que hoje reimplementa hover/foco/tamanho/borda na mão passa a usar `app-botao` (com texto) ou
`app-botao-icone` (só ícone) — e `app-botao-icone` ganha suporte a `<a>` e um tamanho `mini` sem
borda para cobrir o padrão de ícone inline (`.rolagem-pill__d20`) sem distorcer sua identidade
visual atual.

## Entregáveis

1. **`BotaoIcone` aceita âncora**: seletor `button[app-botao-icone], a[app-botao-icone]`
   (`frontend/src/app/shared/ui/botao-icone/botao-icone.component.ts`). `:disabled` no SCSS
   continua sem efeito em `<a>` (pseudo-classe não se aplica a âncora) — comportamento aceitável,
   nenhum consumidor de âncora usa estado desabilitado hoje.
2. **`BotaoIcone` ganha tamanho `mini`**: `BotaoIconeTamanho` vira `'mini' | 'compacto' | 'padrao'`.
   `mini` é ~18×18px, **sem borda** (`border: none` ou `border-color: transparent`), fundo
   transparente, hover/foco só por cor (mesmo espírito do `.rolagem-pill__d20` atual). Cobre o
   padrão "ícone inline dentro de outro controle", distinto dos dois tamanhos existentes (ambos
   com borda, pensados para ação isolada).
3. **`shared/`** migrado para `app-botao`/`app-botao-icone`, removendo o CSS de identidade
   duplicado (mantém só geometria/posicionamento local quando necessário):
   - `bandeja-dados.component.html` — `.bandeja__fechar` (`app-botao-icone`, `compacto`)
   - `configuracoes-tema.component.html` — `.config-swatch-slot__remover`
   - `inventario-esquadrao-sidebar.component.html` — `.inventario-sidebar__fechar`
   - `ui/notificacao/notificacao.component.html` — `.notificacoes__fechar`
   - `shared/layout/layout.component.html` — `.topbar__sessao` (`<a>`, `app-botao`),
     `.topbar__perfil-gatilho`, `.topbar__perfil-item` ×2 (`app-botao`, têm texto)

   **Excluído por não ser o mesmo padrão** (achado ao inspecionar o código, não pelo levantamento
   original): `.calc-flutuante__gatilho`, `.historico-rolagens__gatilho` e
   `.inventario-sidebar__gatilho` (o **gatilho**, não o `__fechar` do painel) usam
   `_utilitario-flutuante.scss` — um botão de ação flutuante 48px, `position: fixed`, com
   empilhamento entre si via CSS custom properties. É um padrão já compartilhado (mixin único, 6
   consumidores) e genuinamente diferente de `app-botao-icone` (inline, sem posicionamento
   próprio) — mesma categoria de exceção que steppers/abas já têm em `botao-icone.component.ts`.
   Mesma exclusão vale para `.ficha-flutuante__gatilho` (`ui-29`) e `.caderno__gatilho` (`ui-30`).
4. **`modules/campanha`** migrado, incluindo os 5 originais do P-048:
   - `detalhe.page.html` — `.detalhe__cabecalho-voltar` (`<a>`, `app-botao-icone` após o
     Entregável 1), `.detalhe__cabecalho-menu-botao` ×2, `.detalhe__membro-acao` ×3,
     `.detalhe__ficha-menu-botao`, `.detalhe__estado-operacional` (tem texto, `app-botao`),
     `.detalhe__cabecalho-menu-item` ×2 (`app-botao`), `.detalhe__banner-link` (`<a>`,
     `app-botao`), `.detalhe__ficha-menu-item` (`app-botao`)
   - `espectador.page.html` — `.espectador__voltar` (`<a>`, `app-botao-icone`)
   - `previa-jogador.page.html` — `.rolagem-pill__d20` (`app-botao-icone` `mini`)
   - `componentes/inventario-esquadrao/inventario-esquadrao.component.html` —
     `.inventario-esquadrao__item-custom`, `__adicionar`, `__form-btn`, `__catalogo-adicionar`
     (têm texto, `app-botao`), `__item-editar`, `__remover` ×3, `__modificacao-remover` (ícone-só,
     `app-botao-icone`), `__catalogo-modificar`, `__pegar`, `__modificacao-adicionar` (`app-botao`)
5. Todo controle migrado preserva `aria-label`/`[appTooltip]` já existente; onde faltava (poucos
   casos do levantamento sem tooltip), completar antes de aplicar `app-botao-icone` — o primitivo
   exige os dois.
6. CSS local das classes migradas remove hover/foco/borda/transição duplicados; mantém só
   geometria (`flex`, `gap`, posição) e overrides de estado próprios do domínio (ex.:
   `--copiado`/`--confirmado`) que não são responsabilidade do primitivo.

## Critérios de Aceite

1. `grep -rn "<button\|<a " frontend/src/app/shared frontend/src/app/modules/campanha --include=*.html | grep -v "app-botao"`
   não retorna nenhum dos controles listados nos Entregáveis 3–4 (sobra só stepper/chip/aba/select
   customizado/overlay/link de prosa já excluídos pelo levantamento, e os gatilhos
   `utilitario-flutuante` do Entregável 3).
2. `npm run test --workspace=frontend` — sem regressão nas specs de `detalhe.page`,
   `espectador.page`, `previa-jogador.page`, `layout.component`, `notificacao.component`,
   `bandeja-dados.component` e das demais telas tocadas.
3. `npm run lint --workspace=frontend` sem novos erros.
4. Gate visual (`verify` + `design-fidelity`): análogo aprovado é o próprio uso já correto de
   `app-botao-icone` em `detalhe.page.html` (convite: `.detalhe__copiar`/`.detalhe__regenerar`,
   `tamanho="padrao"`) e em `modal.component.html` (`.modal__fechar`, `tamanho` default). Rodar a
   aplicação real, abrir `/campanhas/:id` (mestre e jogador), `/campanhas/:id/espectador`,
   `/campanhas/:id/previa/:usuarioAlvoId` e uma ficha com inventário de esquadrão, em `1920×1080` e
   `360×800`. Confirmar: identidade visual igual ao análogo (cor, raio, hover, foco), tamanho
   `mini` sem borda no dadinho d20 sem parecer quebrado, sem overflow, alvo de toque ≥44px no
   mobile (herdado do primitivo).

## Fora de Escopo

- `modules/encontro`, `modules/ficha` (ficha e criatura), `modules/simulacao`, `modules/usuario` —
  `ui-29`…`ui-32`.
- Grupo C (valor editável clicável) e Grupo D (select customizado) — ver `INDEX` desta série;
  Grupo C vira `P-057`.
- Qualquer novo primitivo além do tamanho `mini` em `app-botao-icone`.

## Dependências

Nenhuma.
