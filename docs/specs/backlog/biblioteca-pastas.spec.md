# biblioteca-pastas.spec.md

> Spec avulsa, **rascunho** (autor, 2026-10-16). As decisões em aberto abaixo precisam de resposta do
> autor antes de mover para `active/`.

## Objetivo

Permitir que cada usuário organize a Biblioteca da campanha em **pastas próprias**. O mestre tem as
suas; cada jogador tem as dele. As pastas são **pessoais e invisíveis entre usuários**: ninguém vê a
árvore de pastas de outro. Os documentos continuam sendo da campanha (um só conjunto, com a
revelação decidida pelo mestre); o que cada um personaliza é **onde enxerga** cada documento,
organizando-os como quiser.

## Situação atual (levantada em 2026-10-16)

- Documento: tabela `documento` (`docs/SCHEMA.md`, m9-01), por campanha, com `ordem` manual única da
  biblioteca (`ix_documento_campanha_ordem`) e `revelado` (jogador/espectador só leem `revelado = true`).
- Backend: `backend/src/modules/documento/` (controller → service → repository, leitura/presença em
  `documento-leitura.service.ts`). Frontend: `frontend/src/app/modules/documento/`, páginas do mestre
  e do jogador/espectador e painel flutuante `BibliotecaFlutuante` (corpo em `BibliotecaCorpo`,
  `ListaDocumentos`, `DocumentoCartao`).
- Hoje a lista é plana, igual para todos os leitores, e a ordem é única e do mestre.

## Entregáveis (a confirmar pelas decisões)

1. **Contrato** em `shared/` (DTOs `DocumentoPasta*Dto`, validadores de nome) e schema novo
   (skill `sql-migrations`): tabela `documento_pasta` (dona = `usuario` + `campanha`, nome, pasta-mãe se
   houver aninhamento, `ordem`) e vínculo documento↔pasta **por usuário** (um documento está em no
   máximo uma pasta de cada usuário; sem vínculo = raiz). Documentos nunca ganham coluna de pasta.
2. **Backend**: criar, renomear, reordenar, excluir (soft delete) pasta; mover documento para pasta ou
   de volta à raiz. Toda consulta filtra pelo usuário autenticado — outro usuário jamais lê pasta ou
   vínculo alheio. Pasta só aceita documento que o usuário **pode ver** (jogador: revelado); quando o
   mestre oculta ou exclui um documento, o vínculo deixa de aparecer para o jogador sem vazar título.
3. **Frontend** nas três visões da Biblioteca (página do mestre, página do jogador/espectador e
   painel flutuante): árvore/lista de pastas, criar/renomear/excluir, mover documento (arrastar no
   desktop; ação equivalente por menu no toque), pasta recolhível, busca respeitando as pastas.
   Espectador: ver a decisão 3.
4. **Tempo real** (skill `tempo-real`): as pastas são pessoais, então a mutação só atualiza as demais
   abas/dispositivos **do próprio usuário**; revelar/ocultar/excluir documento pelo mestre continua
   refletindo na organização de cada jogador.
5. Gravação das regras em `SYSTEM.SPEC.md` (Biblioteca), `SCHEMA.md` e `DESIGN.md`.

## Decisões em aberto (autor)

1. **Aninhamento**: pastas dentro de pastas, ou um único nível?
2. **Documento novo / recém-revelado**: aparece na raiz de cada jogador? Há destaque de "não
   organizado" até o jogador movê-lo?
3. **Espectador**: tem pastas próprias como o jogador, ou só lê a lista plana?
4. **Mestre**: a organização dele é só pessoal, ou também define uma organização inicial que os
   jogadores herdam e depois reorganizam?
5. **Ordem manual atual** (`documento.ordem`): permanece como ordem dentro de cada pasta ou passa a
   ser pessoal também?
6. **Ao excluir pasta com documentos**: voltam à raiz do dono (recomendado) ou a exclusão é bloqueada?
7. **Importar Markdown como rascunho** (m9-08) e criação de documento: nascem na pasta aberta no momento?

## Critérios de Aceite (provisórios)

- Teste de permissão no backend: jogador A não lê, move nem exclui pastas do jogador B nem do mestre,
  e vice-versa; jogador não vincula documento não revelado.
- Excluir ou ocultar um documento não deixa vínculo órfão visível para ninguém.
- Gate visual em `1920×1080` e `360×800` (inclusive o caminho por toque), análogo: a lista atual da
  Biblioteca e o seletor de pastas/páginas do Caderno. Primitivos de `shared/ui/` com a API completa;
  se faltar um (ex.: árvore), parar e perguntar ao autor.
- Testes, lint, build e `npm run repo:verificar`.

## Fora de Escopo

Compartilhar pastas entre usuários, pastas da campanha controladas pelo mestre para todos, permissão
por pasta, tags e filtros salvos.
