# m1-09-pagina-descanso.spec.md

> Task 9/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Entregar a página `descanso` com paridade, **incluindo a rolagem de descanso com animação**
(entregável 5 da milestone). As regras determinísticas vêm de `shared/regras/descanso`; a
animação/scramble e o gatilho visual vivem na página.

**Antes de qualquer UI, ler `docs/design/DESIGN.md`** e reusar os padrões BEM do tema.

## Entregáveis

1. Formulário reativo (tipo de descanso, qualidade, atributo, dados extras, bônus) + exibição
   do resultado, consumindo `shared/regras/descanso`.
2. **Rolagem animada** em paridade com o site antigo (`rollDescanso`/`scramble`): efeito de
   embaralhamento antes de assentar no valor final; o RNG usa a utilidade de rolagem do
   domínio (ou `Math.random` local, se a rolagem não estiver em `regras/`).
3. Consumo dos tokens e padrões BEM do tema; estado em Signals.

## Critérios de Aceite

- Mesmas saídas determinísticas do site antigo; animação com paridade de comportamento.
- Zero regra de jogo duplicada no front; funciona offline do backend.
- Sem NgModule/`.css`/`style=""`/hex solto.

## Fora de Escopo

- Demais abas; conteúdo de ajuda (m1-12); troca de tema em runtime (m1-13).

## Dependências

- `m1-04-regras-descanso.spec.md` e `m1-06-frontend-calculadora-base.spec.md`.
