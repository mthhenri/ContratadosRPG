# ficha-avatar-leitura-autorizada.spec.md
> **Estado em 2026-10-21 — implementação revertida, volta como pendência do sistema.** O autor decidiu não adotar agora o
> bucket privado de fichas. A implementação local (leitura autenticada, `/uploads/fichas/`, migração) está no commit
> `84532f88` e foi revertida; reaplicá-la é `git revert` do commit de reversão. [Plano](ficha-avatar-leitura-autorizada/plano.md) e
> [verificação](ficha-avatar-leitura-autorizada/verificacao.md) descrevem o que foi feito e o que faltava (gate real R2/CDN).
> `P-132` segue aberto em `PROBLEMS.md`.

> H-02 / P-132: leitura anônima local confirmada; política decidida em 19/10/2026.

## Objetivo

Exigir permissão atual de leitura da ficha para cada nova leitura do avatar,
inclusive quando a URL anterior é conhecida. Não prometer apagar cópias já
baixadas ou capturas feitas pelo usuário.

## Entregáveis

1. Medir todos os consumidores de imagem de ficha, incluindo resumo/membros,
   acervo, encontro, prévias, avatar ampliado, upload, substituição e exclusão,
   e os consumidores distintos do armazenamento de documentos/patchnotes.
   Política de ficha não pode privatizar indiscriminadamente outros arquivos.
2. Definir e implementar leitura autenticada que consulte a service dona da
   visibilidade atual antes de servir a imagem. Escolher o transporte compatível
   com o frontend e a identidade das URLs sem duplicar a autorização no storage,
   controller ou browser. Uma URL assinada reutilizável até expirar não satisfaz
   sozinha a exigência de permissão atual em **cada nova leitura**.
3. Eliminar bypass pela origem antiga: `/uploads/agentes/...` público e objetos
   R2/domínio público já emitidos. Planejar a transição dos objetos existentes e
   do cache; execução em produção tem seu próprio gate, após plano concreto.
   Não basta trocar a URL nos DTOs enquanto a URL pública conhecida funciona.
4. Definir cache/revalidação e comportamento em ocultação, revogação, exclusão,
   substituição e reconexão; evitar resposta autenticada reutilizada entre
   usuários. Dono/mestre continuam lendo. Garantir imagem/fallback coerente
   sem entregar a terceiros o objeto ou metadados negados.
5. Testes reais do provedor local e teste controlado R2/CDN da configuração a
   implantar, com relatório e limites. Nenhum DELETE físico de entidade; só
   ciclo de vida de arquivo já previsto pela arquitetura. Anexos seguem §3.1.

## Critérios de Aceite

- B vê avatar com concessão, guarda URL, A oculta. Nova aba/contexto sem cache
  e sem JWT não baixa a imagem; B autenticado também não. M/A continuam lendo.
  Repetir com URL anterior, origem direta, pedido condicional/ETag e revogação.
- Exibir reativa a concessão para o avatar conforme a ficha. Criatura/NPC
  revelada respeita sua autorização; não herda suspensão de jogador por engano.
- Sem mudar URLs de documentos/patchnotes fora da responsabilidade de ficha.
  Sem afirmar controle sobre bytes que já chegaram ao usuário.
- `verify` nos consumidores representativos em 1920×1080/360×800; testes de
  autorização/storage, build/lint proporcionais e `repo:verificar` aprovados.
  Falta de verificação R2/CDN mantém a entrega correspondente aberta.

## Fora de Escopo

Revogar cópias offline, censurar capturas, privatizar todo bucket sem mapa,
apagar avatar ao ocultar ficha, trocar política de documentos ou implementar
sem plano a migração de dados de produção.

## Dependências

- [H-02 e decisão do autor](../done/auditoria-ficha-oculta-retomada-cobertura/verificacao.md).
- `docs/SYSTEM.SPEC.md` §14 e provedores em `backend/src/core/armazenamento/`.
- Skills `gerenciamento-de-impacto`, `dto-conventions` quando necessário,
  `tempo-real`, `design-fidelity` e `verify` conforme o recorte implementado.
