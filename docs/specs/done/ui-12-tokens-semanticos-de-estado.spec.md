# UI-12 — Tokens semânticos de estado

> Filha da auditoria visual (`docs/design/AUDITORIA-BIBLIOTECA-VISUAL.md`, seção Tokens).
> Corrige semântica de cor sem tocar em layout.

## Objetivo

Separar o que é identidade fixa do que o usuário troca no seletor de tema: erro e perigo deixam
de seguir o `--accent`, o texto sobre preenchimento de accent passa a usar o token que existe
para isso, e a série de interação ganha o degrau de pressionado que falta.

## Entregáveis

1. Criar o alias `--erro` apontando para `--vida` em `tema/_tokens.scss` e migrar `.campo__erro`
   para ele. O asterisco de campo obrigatório e a notificação de erro já usam `--vida` por esse
   mesmo motivo; o alias transforma o caso isolado em regra nomeada.
2. Desacoplar a severidade `perigo` do `app-botao` do mapa de `--accent`: passa a usar
   `--erro`/`--vida`. Hoje `primario` e `perigo` apontam para o mesmo mapa de cor e só o estilo
   padrão (preenchido × contorno) os separa — num diálogo de confirmação "Confirmar" e "Excluir"
   saem idênticos, e com accent verde o botão destrutivo fica verde.
3. Trocar `--bg` por `--accent-text` na aba ativa (`app-abas`) e na tecla `=` da calculadora
   flutuante. O `TemaService` recalcula o contraste de `--accent-text` a cada troca de tema;
   `--bg` é cor de fundo de página e na base clara sai do controle de contraste.
4. Calcular `--accent-press` no `TemaService`, na mesma direção do `--accent-hover`, e aplicar em
   `:active` do botão preenchido e do contorno, fechando a série repouso → hover → pressionado.
5. Registrar os quatro tokens em `docs/design/DESIGN.md` com a regra de escolha entre cor de
   identidade (fixa) e cor de accent (trocável).

## Critérios de Aceite

- Com o accent trocado para verde e para a base clara: mensagem de erro, asterisco de
  obrigatório, notificação de erro e botão `perigo` permanecem vermelhos; aba ativa e tecla `=`
  mantêm contraste legível nos onze presets de tema.
- `:active` do botão preenchido e do contorno é visualmente distinto de `:hover` em todos os
  presets; nenhum novo valor de cor é hardcoded fora de `_tokens.scss`.
- Lint, testes do primitivo e gate visual em `1920×1080` e `360×800` nos módulos afetados.

## Fora de Escopo

Redesenhar a paleta, mexer na escala de espaço (UI-13) ou alterar a API do `app-botao` além do
mapa de cor da severidade `perigo`.

## Dependências

`ui-06`, `ui-11`, `tema/_tokens.scss`, `TemaService` e `docs/design/DESIGN.md`.

## Riscos e Mitigação

- `perigo` é usado hoje em botões que não são destrutivos. Antes de migrar, listar os
  consumidores e trocar os que só queriam ênfase para `primario`, senão o vermelho vira ruído.
