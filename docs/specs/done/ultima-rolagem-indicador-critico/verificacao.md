# Verificação — crítico na última rolagem

## Resultado e inspeção visual pessoal

Última orientação do autor aplicada: **ícone antes do texto e brilho, sem selo
nem palavra “Crítico” visível**. Texto usa `glow.duplo` de `ResultadoRolagem`; SVG
usa o halo canônico para ícones, na cor da ficha. Somente o rótulo longo elide;
ícone e total conservam espaço. `sr-only` identifica “Crítico:” para tecnologia assistiva.

Usa apenas `resultado.critico`/`dados[].criticos` recebidos, sem inferir pelo total,
alterar regras, seleção da última rolagem ou queries. Mapa no [plano](plano-verificacao.md).
Nenhum primitivo ou ícone canônico alterado.

Agente principal observou pessoalmente a aplicação real em **1920×1080 e 360×800**:
crítico e comum na campanha do mestre, crítico na prévia de espectador e ausência
de rolagem. Comparou ícone/brilho com o histórico na mesma tela. Mesma densidade e
hierarquia, sem controle novo ou overflow; total 24 permanece visível no mobile
com rótulo longo. Crítico passou a usar apenas aproximadamente 14px de ícone.

Cenário local usando conta/campanha de `docs/DEVELOPMENT.md`: resultados conhecidos
registrados por REST, mesmo total 24 nas duas variantes, e cópia temporária de ficha
para ausência. A UI foi observada após atualizar. Todas as rolagens temporárias
foram excluídas logicamente pelos ids/autoria/rótulo exatos; cópias removidas pela
API. Nenhum registro anterior foi alterado. Não se criou NPC nem se alterou cena
ativa para ampliar o cenário: esses consumidores foram revisados no código e
testes do componente, sem alegar percurso visual separado de todas as rotas.

Capturas/roteiros em `.artifacts/ultima-rolagem-indicador-critico/` são evidência
**local e ignorada**, ausente do clone.

## Gates

- Card final: **18/18**; flags, total comum alto, ausência, ordem do ícone/brilho,
  acessibilidade, ausência de Chip e substituição por comum. Focados integrados: **52/52**.
- Frontend: **3608 testes + 89 normalizadores**, antes da revisão de apresentação;
  versão final recebeu teste focado e build de produção.
- Lint integrado e frontend final: **zero erros**, avisos antigos de convenções.
  Build produção aprovado com aviso conhecido de orçamento inicial (603,33kB/450kB).
- Shared: **1340**. Backend: **1339 aprovados + 100 pulados**, e quatro HTTP
  impedidos inicialmente de conectar passaram na repetição autorizada.
- Revisões manual e independente: sem nova regressão; identidade por ficha,
  seleção e permissões preservadas. HTML/SCSS formatados; diff sem erro.

Este relatório encerra as pendências visuais/integradas do [plano](plano-verificacao.md).
`repo:verificar` aprovou organização/espelhos; `repo:test` passou 14/14. Sem commit/deploy;
sem pendência obrigatória do recorte solicitado.
