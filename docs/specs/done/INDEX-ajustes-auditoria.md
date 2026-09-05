# Ajustes derivados da auditoria visual

Última spec de UI no repositório: `docs/specs/done/ui-11-normalizar-tokens-acabamento.spec.md`.
A série existente é ui-01, ui-01b, ui-02 … ui-09, ui-11 (não há ui-10). A numeração abaixo
continua daí. Todos os achados da auditoria estão cobertos.

## Specs

| Spec | Escopo | Onda |
| --- | --- | --- |
| UI-12 | Tokens semânticos de estado (erro, perigo, accent-text, pressionado) | 1 — semântica, sem tocar em layout |
| UI-18 | Escala de espaço em cinco degraus (4 · 8 · 12 · 16 · 20) | 1 — base das demais |
| UI-13 | Chip com severidade e ícone; absorve 5 cópias | 2 — apaga duplicação |
| UI-14 | `app-estado-vazio` e `app-esqueleto` | 2 |
| UI-19 | Botão: carregando acessível, opacidade única, degraus de tamanho | 2 |
| UI-23 | Stat sem valor e rodapé do cartão | 2 — as duas menores |
| UI-15 | Rodapé de ações no modal e `app-confirmacao` | 3 |
| UI-20 | Fila de notificações: ícone, ação e duração | 3 |
| UI-21 | Chrome da topbar: item ativo, contexto, Escape, painel de tema | 3 |
| UI-16 | `app-barra-recurso` e recuo do cartão de combatente | 4 — pede rodada de mesa |
| UI-22 | Resultado de rolagem compacto e acabamento | 4 — pede rodada de mesa |
| UI-17 | `app-painel-flutuante` | 5 — move comportamento, maior das tasks |

## Ordem sugerida

1. `ui-12`, `ui-18` — vocabulário: cor semântica e espaço. As outras dez se apoiam nelas.
2. `ui-13`, `ui-14`, `ui-19`, `ui-23` — primitivos que apagam cópia existente ou fecham lacuna
   isolada.
3. `ui-15`, `ui-20`, `ui-21` — composição: diálogo, fila e chrome.
4. `ui-16`, `ui-22` — telas de jogo; validar em sessão real antes de fechar.
5. `ui-17` — painel flutuante, único que move comportamento de TypeScript.

## Dependências entre specs

- `ui-12` → `ui-13` (mapa de severidade), `ui-15` (perigo em `--erro`), `ui-21` (`--accent-text`)
- `ui-18` → `ui-19` (degraus de tamanho), `ui-22`, `ui-23`
- `ui-13` → `ui-16` (Cadência como chip), `ui-22` (chips de dano)
- `ui-14` → `ui-17` (estado vazio do painel)
- `ui-19` → `ui-20` (ação em estilo `link`)
