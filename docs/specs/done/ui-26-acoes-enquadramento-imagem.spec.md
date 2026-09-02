# ui-26-acoes-enquadramento-imagem.spec.md

> Contexto: ajuste visual solicitado no seletor de enquadramento do avatar de agente.

## Objetivo

Padronizar as ações de confirmar e cancelar do painel de enquadramento de imagem com o primitivo
de botão do sistema, na ordem e dimensões esperadas para ações de confirmação.

## Entregáveis

1. O rodapé de `AjusteEnquadramentoImagem` usa `app-botao` com o degrau canônico explícito,
   mantendo as variantes secundária para cancelar e primária para confirmar.
2. As ações são apresentadas como `Cancelar` seguido de `Confirmar`; no mobile ocupam o rodapé
   sem reduzir o alvo de toque mínimo.
3. O teste do componente cobre ordem, variantes e degrau visual das duas ações.

## Critérios de Aceite

- O teste focado de `AjusteEnquadramentoImagem` passa.
- A suíte, lint e build do frontend passam sem erros novos.
- Em `1920×1080` e `360×800`, o painel aberto mantém a mesma linguagem do rodapé de
  `Confirmacao`, não apresenta overflow e os dois controles são legíveis, focáveis e têm alvo de
  toque de ao menos 44px no mobile.

## Fora de Escopo

- Alterar a matemática de pan/zoom, o envio do arquivo, a persistência da imagem ou o recorte
  renderizado do avatar.
- Redesenhar outros rodapés de modal ou de popover.

## Dependências

- `docs/design/DESIGN.md` e o primitivo `frontend/src/app/shared/ui/botao/`.
- Análogo aprovado: `Confirmacao` dentro de `app-modal`, para hierarquia secundária/primária,
  densidade e comportamento de ações em telas menores.

## Riscos e Mitigação

- O painel é um popover compacto: conferir ao vivo que a grade móvel não excede sua largura nem
  encobre o conteúdo do enquadramento.
