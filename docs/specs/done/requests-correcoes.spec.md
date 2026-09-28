# requests-correcoes.spec.md

> Guarda-chuva da revisão de requests de 2026-09-26. Origem: P-082…P-086 e carregamento
> antecipado do inventário observados em navegador. Não executar este arquivo diretamente.

## Objetivo

Eliminar gravações dirigidas à ficha errada, restabelecer a ressincronização e reduzir
leituras sem necessidade, preservando permissões e dados privados.

## Entregáveis

1. Executar as seis tasks abaixo, cada uma com seu próprio gate e passagem backlog → active → done.
2. Manter as evidências antes/depois vinculadas ao relatório da revisão, sem tokens ou senhas.
3. Encerrar P-082…P-086 somente após os critérios das respectivas tasks passarem.

| Ordem | Task | Resultado |
|---|---|---|
| 1 | [p-082-ficha-autosave-e-selecao](p-082-ficha-autosave-e-selecao.spec.md) | Escrita vinculada à origem e leitura imune a resposta antiga |
| 2 | [p-083-reconexao-sem-carga-duplicada](p-083-reconexao-sem-carga-duplicada.spec.md) | Consumidores reagem à nova reconexão, sem repetir carga inicial |
| 3 | [p-084-ressincronizacao-recursos](p-084-ressincronizacao-recursos.spec.md) | Recursos carregados recuperados após eventos perdidos |
| 4 | [p-085-invalidacao-seletiva-ficha](p-085-invalidacao-seletiva-ficha.spec.md) | Edições invalidam somente recortes afetados |
| 5 | [p-086-estado-campanha-sem-refetch](p-086-estado-campanha-sem-refetch.spec.md) | Estado recebido aplicado sem reler campanha/inventário |
| 6 | [requests-inventario-sob-demanda](requests-inventario-sob-demanda.spec.md) | Inventário carregado ao abrir e invalidado enquanto fechado |

A ordem é recomendada; dependências obrigatórias estão nas tasks. P-085 e P-086 são
independentes das primeiras, mas compartilham arquivos: integrar sequencialmente.

## Critérios de Aceite

- Cada task tem testes de regressão focados e reprodução real conforme a skill verify.
- Gate comum de conclusão: `npm run test --workspaces --if-present`, `npm run lint`,
  `npm run build --workspace=shared`, `npm run build --workspace=backend` e
  `npm run build --workspace=frontend`. Executar uma vez por corte integrado sem repetir
  checagens idênticas sem mudança; registrar falhas preexistentes separadamente.
- Capturar método, endpoint, status e quantidade de chamadas por ação nos dois clientes.
  Separar REST de handshake/ping Socket.IO, assets e requests de preparação do cenário.
- Em 1920×1080 e 360×800, repetir jornadas afetadas; se mudar UI/estado visual, registrar
  análogo aprovado (a própria tela existente e seus estados canônicos), usar shared/ui e
  comparar renderização conforme design-fidelity. Esta iniciativa não redesenha telas.
- Cenário isolado de teste, limpeza via soft delete/API e relato de contas mantidas.
- Métrica por recurso/ação, não teto global rígido de GETs: novas funcionalidades de Cenas
  podem adicionar chamadas legítimas. Antes da task 6, baseline do jogador era 6 GETs;
  após reconexão/navegação era 8. O requisito é remover os dois duplicados.

## Fora de Escopo

Cache global, polling novo, troca de biblioteca de estado, mudança de regra de jogo,
paginação geral, redesign e otimização de assets. Não criar endpoint só para nome de campanha:
a oportunidade do relatório ainda exige medir custo/benefício. Não reparar dados históricos
possivelmente atingidos por P-082 sem auditoria e autorização próprias.

## Dependências

- [Revisão e evidências](../../reviews/requests-2026-09-26.md).
- SYSTEM.SPEC §8/§9/§14, CONVENTIONS, PROBLEMS, DESIGN e skills task-flow, tempo-real,
  convencoes-check e verify.
- Conferir estado de m7-23 antes de implementar: se Cenas já tiver substituído rotas/painéis
  de Encontro, aplicar os mesmos critérios aos consumidores atuais, sem reverter a migração.
