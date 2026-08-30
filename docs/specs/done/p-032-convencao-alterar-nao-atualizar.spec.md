# p-032-convencao-alterar-nao-atualizar.spec.md

> Task avulsa. Origem: `docs/context/PROBLEMS.md` P-032 — "Convenção `alterar`/`alterado` ainda
> violada em identificadores existentes".

## Objetivo

Eliminar os identificadores de produção que ainda usam o verbo `atualizar`/particípio
`atualizado` onde `CONVENTIONS.md`/`CLAUDE.md` exige `alterar`/`alterado`, mapeando todos os
chamadores, testes e contratos de rede (evento de socket, rota REST) afetados por cada rename.

## Entregáveis

Inventário completo (via varredura de `atualiz*` em `shared/src`, `backend/src`, `frontend/src`)
classificado em: identificador de mutação (método/propriedade), campo de DTO, evento de
socket/`@Output`/rota REST, ícone, classe CSS, texto de UI, comentário/prosa. Só a primeira
categoria (e o subconjunto de "campo de DTO"/"evento" que nomeia uma mutação de domínio) está no
escopo desta task — ver Fora de Escopo para a justificativa de cada exclusão.

1. `frontend/src/app/core/services/sessao.service.ts` — `atualizarPerfil` → `alterarPerfil` (e
   callers: `perfil.page.ts`, specs de `sessao.service` e `perfil.page`).
2. `frontend/src/app/modules/ficha/ficha-edicao-criatura.service.ts` — `atualizarDados` (privado)
   → `alterarDados` (uso 100% interno ao arquivo).
3. `frontend/src/app/modules/ficha/paginas/criar/criar.page.ts` (classe `FichaCriar`) —
   `atualizar` (protected) e delegados `atualizarOrigem`, `atualizarEspecialidade`,
   `atualizarParametroFormacao`, `atualizarTextoFormacao`, `atualizarPersonalidadeBase`,
   `atualizarFortificacao` → prefixo `alterar*`. Atualizar bindings em `criar.page.html` e
   chamadas via acesso a membro protegido (`componente['atualizar']`) em `criar.page.spec.ts`.
4. `frontend/src/app/modules/ficha/paginas/criar-criatura/criar-criatura.page.ts` (classe
   `FichaCriarCriatura`) — mesmo padrão: `atualizar` e `atualizarResistencia`,
   `atualizarFraqueza`, `atualizarRegeneracao`, `atualizarDeslocamento`, `atualizarAtaque`,
   `atualizarHabilidade` → prefixo `alterar*`, propagando para `criar-criatura.page.html` e
   `criar-criatura.page.spec.ts`.
5. `frontend/src/app/modules/pagina-caderno/editor-markdown.component.ts` — `atualizarEstadoTabela`
   → `alterarEstadoTabela`, `atualizarPosicaoRolagem` → `alterarPosicaoRolagem` (host bindings no
   próprio decorator `@Component`, sem consumidor externo).
6. `backend/src/modules/ficha/ficha.service.ts` — variáveis locais `itensCampanhaAtualizados` →
   `itensCampanhaAlterados`, `itensFichaAtualizados` → `itensFichaAlterados` (escopo local à
   função, sem chamador externo).
7. `backend/src/core/gateway/campanha.gateway.ts` — `emitirPaginaEsquadraoAtualizada` →
   `emitirPaginaEsquadraoAlterada`, alinhando com `alterarPaginaEsquadrao` (service) e
   `PaginaCadernoEsquadraoAlteradaDto`, já corretos. Propagar para o caller em
   `pagina-caderno.service.ts` e os dublês em `pagina-caderno.service.spec.ts` e
   `campanha.gateway.spec.ts`.
8. Evento de socket `'caderno-esquadrao:atualizado'` → `'caderno-esquadrao:alterado'` — trocar as
   duas pontas juntas: emissão em `campanha.gateway.ts`, escuta em `tempo-real.service.ts`,
   asserção em `campanha.gateway.spec.ts`. Renomear em conjunto o observable/subject espelho no
   frontend: `paginaEsquadraoAtualizada$`/`paginaEsquadraoAtualizadaSubject` →
   `paginaEsquadraoAlterada$`/`paginaEsquadraoAlteradaSubject` em `tempo-real.service.ts`, e todos
   os consumidores (`caderno-esquadrao-colaborativo.service.ts`, `caderno-flutuante.component.ts`)
   e dublês de teste (`painel-encontro.page.spec.ts`, `detalhe.page.spec.ts`,
   `caderno-esquadrao-colaborativo.service.spec.ts`, `caderno-flutuante.component.spec.ts`).
9. Rota REST `PUT pagina-caderno/:id/esquadrao/atualizacoes` → `.../esquadrao/alteracoes` —
   trocar o decorator em `pagina-caderno.controller.ts` e a URL montada em
   `pagina-caderno.service.ts` (frontend) juntas (o handler já se chama `alterarEsquadrao`; só o
   segmento da URL usa a palavra banida).
10. `@Output() atualizado` → `@Output() alterado` em
    `frontend/src/app/modules/campanha/componentes/inventario-esquadrao/inventario-esquadrao.component.ts`
    e em `frontend/src/app/shared/inventario-esquadrao-sidebar/inventario-esquadrao-sidebar.component.ts`
    (que reemite o evento do filho sob o mesmo nome) — propagar para os `.emit(...)`, o binding de
    reemissão em `inventario-esquadrao-sidebar.component.html` e os bindings de consumo em
    `detalhe.page.html` (linhas 96 e 988).
11. `shared/src/dtos/campanha/campanha.dtos.ts` — campo `atualizadoEm` → `alteradoEm` no DTO de
    resumo de campanha. Propagar para a query de `campanha.repository.ts` (alias SQL
    `"atualizadoEm"` → `"alteradoEm"`, e o alias interno da CTE lateral `ultima_atualizacao` →
    `ultima_alteracao`, só cosmético, sem consumidor externo) e para todo consumo/fixture:
    `campanha.service.spec.ts` (backend e frontend), `lista.page.ts`, `lista.page.spec.ts`,
    `acervo.page.spec.ts`. Atualizar os comentários que citam o nome do campo entre crases
    (`campanha.repository.ts:109`, `lista.page.ts:39,105`) para o novo nome.
12. Ajustar a descrição do teste em `campanha.gateway.spec.ts` que descreve o comportamento do
    método renomeado no item 7 ("emite atualização do Esquadrão..." → "emite alteração do
    Esquadrão...").

## Critérios de Aceite

1. `grep -rniE "atualizar|atualizad[oa]" shared/src backend/src frontend/src` não retorna nenhuma
   ocorrência nos identificadores listados nos Entregáveis 1–12 (execução manual de conferência;
   o restante do grep — ícone, CSS, texto de UI, prosa, CRDT — permanece, ver Fora de Escopo).
2. `npm run build --workspace=shared` (o DTO mudou de campo).
3. `npm run test --workspace=shared`, `npm run test --workspace=backend`,
   `npm run test --workspace=frontend` — verdes, sem novo teste quebrado.
4. `npm run lint` (raiz, três workspaces) — verde.
5. Nenhuma mudança de comportamento: é rename puro de identificador/nome de evento/rota, sem
   alterar lógica, formato de payload ou assinatura de tipos além do nome do campo.

## Fora de Escopo

- **Ícone `'atualizar'`** (`icone.component.ts`/`.html`, usado em `criar.page.html`,
  `criar-criatura.page.html`, `detalhe.page.html`) — nomeia o glifo de "recarregar/refresh", um
  conceito visual diferente de "alterar domínio"; renomear id de ícone é decisão de design, não
  de nomenclatura de código. Fica registrado, não corrigido aqui.
- **Payload CRDT `atualizacao`** (`PaginaCadernoEsquadraoAlterarDto.atualizacao`,
  `PaginaCadernoEsquadraoAlteradaDto.atualizacao`, `PaginaCadernoEsquadraoPresencaDto.atualizacao`,
  `decodificarAtualizacao`, `atualizacoesPendentes`, `Symbol('atualizacao-remota')` em
  `caderno-esquadrao-colaborativo.service.ts`) — é terminologia técnica do Yjs (`Y.applyUpdate`/
  "update" binário), não o verbo de domínio "alterar uma entidade". Os DTOs-contêiner já seguem a
  convenção (`...AlterarDto`/`...AlteradaDto`); só o campo interno usa o termo técnico do CRDT.
- **Rótulos de frescor** (`ultimaAtualizacaoEm`, `textoAtualizacao`, `rotuloAtualizacao` em
  `detalhe.page.ts`/`lista.page.ts`, classes CSS `__secao-atualizado`/`__linha-atualizado`, texto
  exibido "Atualizado agora/há Xs", "Perfil atualizado.", "atualizada a cada mudança") —
  "atualizar" aqui significa recarregar/exibir o quão recente é o dado (refresh), um conceito
  distinto de "alterar" (mudar o domínio). Renomear mudaria o texto visível ao usuário, fora do
  escopo de uma correção de nomenclatura de identificador interno.
- **Comentários, JSDoc e descrições de teste em prosa livre** que usam "atualizar" como palavra
  comum da língua portuguesa (ex.: "recuperam o valor atualizado via REST", "eco desatualizado",
  "versão de token desatualizada") — não são identificadores, é uso legítimo do idioma.
- Qualquer achado de nomenclatura fora desta lista que apareça durante a implementação vira nova
  entrada em `PROBLEMS.md`, não diff desta task.

## Dependências

Nenhuma.

## Riscos e Mitigação

- **Evento de socket e rota REST são contrato entre backend e frontend**: renomear só de um lado
  quebra silenciosamente o tempo real/a chamada REST em produção. Mitigação: trocar as duas
  pontas no mesmo commit e conferir com a skill `verify` (dois usuários, tempo real do Caderno do
  Esquadrão) antes de fechar, não só rodar os testes unitários.
- **Volume de call-sites em `criar.page.*`/`criar-criatura.page.*`** (~200 pontos entre template e
  spec): risco de rename parcial deixar o build quebrado. Mitigação: renomear por identificador
  completo (não substring solta) e rodar `npm run build --workspace=frontend` + suíte de teste
  desses dois módulos antes de seguir para os demais itens.
