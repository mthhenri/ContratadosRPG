# p-035-contraste-botao-accent.spec.md

> Ajuste avulso solicitado pelo autor; corrige `PROBLEMS.md` P-035.

## Objetivo

Garantir contraste WCAG AA de ao menos 4,5:1 para o rótulo de botões preenchidos que usam o accent,
inclusive quando o usuário seleciona outro preset ou uma cor customizada.

## Entregáveis

1. Um token `--accent-text`, definido para a base padrão e recalculado pelo `TemaService` ao aplicar
   um accent, escolhendo preto ou branco conforme o maior contraste.
2. As variantes preenchidas `primario` e `perigo` do primitivo `app-botao` passam a consumir
   `--accent-text`, sem alterar as demais variantes ou estilos.
3. Testes unitários cobrem a escolha de texto e a propriedade aplicada ao DOM para accents escuros e
   claros; a P-035 é retirada de `PROBLEMS.md` e o histórico/contexto registram a correção.

## Critérios de Aceite

- Cada preset de accent usa texto preto ou branco com razão de contraste de pelo menos 4,5:1.
- O tema padrão vermelho aplica texto branco, e um accent claro aplica texto preto.
- A suíte, lint e build do frontend passam; o botão é observado na aplicação real em `1920×1080` e
  `360×800`, nos estados padrão e hover. Foco e desabilitado não mudam nesta correção.

## Fora de Escopo

- Alterar o piso de 3:1 que valida o accent contra a superfície.
- Redefinir a paleta, o significado de `perigo`, ou outras severidades de botão.

## Dependências

- `docs/design/DESIGN.md`
- `docs/design/tema/_tokens.scss`
- `frontend/src/app/core/services/tema.service.ts`
- `frontend/src/app/shared/ui/botao/`
