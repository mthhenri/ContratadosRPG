# ui-29-adocao-botao-icone-encontro.spec.md

> Task 2/5 da série `ui-28`…`ui-32` (`docs/specs/backlog/INDEX-adocao-total-botao-icone.md`),
> origem `P-048`. Depende de `ui-28` (primitivo `app-botao-icone` já ampliado com âncora e
> tamanho `mini`).

## Objetivo

Todo controle clicável de `frontend/src/app/modules/encontro/**` que reimplementa hover/foco/
tamanho na mão passa a usar `app-botao`/`app-botao-icone`.

## Entregáveis

1. `cartao-combatente.component.html` — `.combatente__identidade-acao`, `.combatente__abrir-ficha`,
   `.combatente__rolar-avulso`, `.combatente__receber-dano`, `.combatente__remover` (ícone-só,
   `app-botao-icone`); `.combatente__ajustar` (tem texto, `app-botao`).
2. `ficha-flutuante.component.html` — **excluído**: `.ficha-flutuante__gatilho` usa
   `_utilitario-flutuante.scss` (botão de ação flutuante 48px, `position: fixed`, padrão
   compartilhado e genuinamente diferente de `app-botao-icone`), ver nota em `ui-28`.
3. `log-encontro.component.html` — `.log__gatilho` (tem texto, `app-botao`); `.log__acao` ×2
   (`app-botao`).
4. `rolagem-avulso.component.html` — `.rolagem-avulso__fechar` (`app-botao-icone`);
   `.rolagem-avulso__visibilidade` (tem texto, `app-botao`).
5. `painel-encontro.page.html` — `.iniciativa__voltar` (`<a routerLink>`, `app-botao-icone`);
   `.iniciativa__historico` (ícone-só, `app-botao-icone`); `.iniciativa__minha-ficha` (tem texto,
   `app-botao`).
6. CSS local das classes migradas remove hover/foco/borda/transição duplicados; mantém só
   geometria/posicionamento.

## Critérios de Aceite

1. `grep -rn "<button\|<a " frontend/src/app/modules/encontro --include=*.html | grep -v "app-botao"`
   não retorna nenhum dos controles listados no Entregável 1–5.
2. `npm run test --workspace=frontend` sem regressão nas specs de `encontro` tocadas.
3. `npm run lint --workspace=frontend` sem novos erros.
4. Gate visual (`verify` + `design-fidelity`): análogo é o resultado de `ui-28` em
   `detalhe.page.html`/`modal.component.html`. Rodar um encontro real (`/painel/:campanhaId/...`),
   `1920×1080` e `360×800`, mestre e jogador, com pelo menos um combatente revelado e um não
   revelado.

## Fora de Escopo

Demais módulos — ver `INDEX`. Grupos C/D — idem.

## Dependências

`ui-28` (primitivo ampliado).
