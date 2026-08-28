# Caderno do esquadrão colaborativo

> Task avulsa especificada em `docs/superpowers/specs/2026-08-27-caderno-esquadrao-colaborativo-design.md`.

## Objetivo

Disponibilizar um caderno compartilhado por campanha, com edição colaborativa em tempo real entre todos os membros ativos. Membros podem criar, renomear e editar páginas; apenas o mestre pode excluí-las.

## Entregáveis

1. Contratos compartilhados, persistência PostgreSQL e endpoints REST para páginas do Esquadrão, com documento CRDT persistido e projeção Markdown pesquisável.
2. Sincronização Yjs por REST autorizado e broadcast Socket.IO pós-gravação, incluindo reconexão, presença e cursores remotos no editor Milkdown.
3. Terceiro modo no Caderno: todos veem Meu Caderno e Esquadrão; mestre também vê Caderno dos Jogadores. A busca inclui o caderno do Esquadrão.

## Critérios de Aceite

1. Dois membros ativos na mesma página preservam edições concorrentes depois de sincronizar e reconectar.
2. Membro e mestre podem criar, listar, abrir, renomear e editar; a exclusão responde 403 para jogador e funciona para mestre.
3. Busca encontra páginas do Esquadrão, sem expor snapshots ou metadados a não membros.
4. Testes, lint e builds passam; a aplicação real é verificada em 1920×1080 e 360×800 contra `CadernoFlutuante`.

## Fora de Escopo

Comentários, anexos, histórico de versões, permissões por página e colaboração nos cadernos privados existentes.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md` e o desenho aprovado em `docs/superpowers/specs/2026-08-27-caderno-esquadrao-colaborativo-design.md`.
