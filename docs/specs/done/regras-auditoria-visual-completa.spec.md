# regras-auditoria-visual-completa.spec.md

> Pedido do autor em 09/10/2026. Auditoria documental, sem alteração de código.

> **Fecho documental em 09/10/2026:** bateria executada; dez grupos confirmados e dez specs
> de correção no backlog. Cobertura, reprodução, prioridades, gates e limites no
> [relatório](regras-auditoria-visual-completa/auditoria.md). Os defeitos continuam abertos.

## Objetivo

Inspecionar a aplicação real da página de Regras, nos dois livros e nas visões de página,
painel e mobile, procurando inconsistências de textos, tabelas, blocos e navegação.
Criar specs de correção somente após concluir a bateria visual.

## Escopo e aceite

- Percorrer o conteúdo integral visível de Sistema e Guia em 1920×1080 e 360×800,
  incluindo abas condicionais; conferir os padrões em 960×1080 e 1366×768.
- Verificar sumário, busca com/sem resultados, links, painel normal/maximizado e gaveta.
- Conferir base clara em blocos representativos e registrar comparação com o leitor
  aprovado, os cartões/abas/controles de shared/ui e docs/design.
- Registrar cobertura, reprodução, gravidade, evidências locais e limites por achado.
- Consolidar as specs futuras em backlog depois das verificações; não implementar correções.
- Executar npm run repo:verificar e revisar o diff documental.

## Destinos

Relatório: regras-auditoria-visual-completa/auditoria.md, ao lado desta spec.
Capturas e dados brutos locais: .artifacts/regras-auditoria-visual-completa/.

## Fora de escopo

Código, regras autorais, normalização/publicação dos JSONs, commit/push, implementar
correções e revisão página a página de PDF (já possui spec própria em backlog).
Preservar todas as alterações existentes do usuário e de outras sessões.
