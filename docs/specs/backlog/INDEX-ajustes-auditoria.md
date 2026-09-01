# Ajustes derivados da auditoria visual

Última spec de UI no repositório: `docs/specs/done/ui-11-normalizar-tokens-acabamento.spec.md`.
A série existente é ui-01, ui-01b, ui-02 … ui-09, ui-11 (não há ui-10). A numeração abaixo
continua daí.

## Escritas

| Spec | Escopo | Ordem sugerida |
| --- | --- | --- |
| UI-12 | Tokens semânticos de estado (erro, perigo, accent-text, pressionado) | 1 — corrige semântica sem tocar em layout |
| UI-13 | Chip com severidade e ícone; absorve 5 cópias | 2 |
| UI-14 | `app-estado-vazio` e `app-esqueleto` | 2 |
| UI-15 | Rodapé de ações no modal e `app-confirmacao` | 3 |
| UI-16 | `app-barra-recurso` e recuo do cartão de combatente | 4 — pede rodada de mesa |
| UI-17 | `app-painel-flutuante` | 5 — move comportamento |

## Achados da auditoria ainda sem spec

- Escala de espaço em cinco degraus (4 · 8 · 12 · 16 · 20) e migração por componente.
- `app-botao`: `carregando` acessível (`aria-disabled` + guarda no clique), opacidade única de
  desabilitado (0,55 × 0,6) e degraus de tamanho no primitivo.
- Fila de notificações: ícone por severidade, ação em erro, barra de duração e pausa no hover.
- Chrome da topbar: régua de accent no item ativo, slot de contexto, `Escape` no dropdown de
  perfil, lugar fixo do selo de tempo real e migração do painel de tema para o `app-modal`.
- `app-resultado-rolagem`: variante `[compacto]`, `aria-label` do dado descartado, duração da
  barra vinda do serviço e token de realce do crítico.
- `app-stat` sem valor e rodapé do `app-cartao`.
