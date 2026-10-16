# biblioteca-pastas.spec.md

> Spec avulsa, **rascunho** (autor, 2026-10-16; modelo por cargo corrigido pelo autor no mesmo dia).
> As decisões em aberto abaixo precisam de resposta do autor antes de mover para `active/`.

## Objetivo

Permitir organizar a Biblioteca da campanha em **pastas**, com **duas organizações independentes,
uma por cargo**:

- **Mestre**: tem a sua árvore de pastas, que só ele vê e edita.
- **Jogadores e espectadores**: compartilham **uma única** organização na campanha. O que um cria,
  renomeia ou move aparece para todos eles, e todos podem reorganizar como quiserem.

Cada cargo nunca enxerga a organização do outro. Os documentos continuam sendo um conjunto só da
campanha (a revelação segue com o mestre); o que muda por cargo é **em que pasta** cada documento
aparece. Documento sem vínculo fica na raiz.

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
   (skill `sql-migrations`): tabela `documento_pasta` por campanha com a coluna de **cargo** da
   organização (`MESTRE` ou `JOGADOR`, onde `JOGADOR` cobre jogadores e espectadores; decidir entre
   tabela `tipo_*` e enum conforme a convenção), nome, pasta-mãe se houver aninhamento e `ordem`; e
   vínculo documento↔pasta, no máximo um por documento e por cargo. Documentos nunca ganham coluna
   de pasta.
2. **Backend**: criar, renomear, reordenar, excluir (soft delete) pasta e mover documento. O cargo do
   usuário na campanha define qual organização ele lê e escreve; nunca a do outro. Pasta
   compartilhada só aceita documento revelado; quando o mestre oculta ou exclui um documento, o
   vínculo some da visão dos jogadores sem vazar título. Espectador: ver decisão 2.
3. **Frontend** nas três visões da Biblioteca (página do mestre, página do jogador/espectador e
   painel flutuante): árvore/lista de pastas, criar/renomear/excluir, mover documento (arrastar no
   desktop; ação equivalente por menu no toque), pasta recolhível, busca respeitando as pastas.
4. **Tempo real** (skill `tempo-real`): a organização dos jogadores é compartilhada, então a mutação
   é emitida à sala dos jogadores/espectadores da campanha (nunca ao mestre); a do mestre é emitida só
   às sessões dele. Cuidar de edição simultânea (dois jogadores movendo/renomeando ao mesmo tempo:
   vence a última gravação, sem estado corrompido) e de reconexão.
5. Gravação das regras em `SYSTEM.SPEC.md` (Biblioteca), `SCHEMA.md` e `DESIGN.md`.

## Decisões em aberto (autor)

1. **Aninhamento**: pastas dentro de pastas, ou um único nível?
2. **Espectador**: edita a organização compartilhada como o jogador, ou só a vê?
3. **Documento novo / recém-revelado**: aparece na raiz da organização dos jogadores? Há destaque de
   "não organizado"?
4. **Ordem manual atual** (`documento.ordem`): permanece como ordem dentro de cada pasta (e vale só
   para a visão do mestre) ou cada cargo passa a ter a sua?
5. **Ao excluir pasta com documentos**: voltam à raiz (recomendado) ou a exclusão é bloqueada?
6. **Importar Markdown como rascunho** (m9-08) e criação de documento: nascem na pasta aberta?
7. **Quem exclui pasta compartilhada**: qualquer jogador (a organização é de todos) ou há alguma
   proteção, como confirmação?

## Critérios de Aceite (provisórios)

- Teste de permissão no backend: o mestre não lê nem altera a organização dos jogadores, e jogador/
  espectador não lê nem altera a do mestre; usuário de fora da campanha não acessa nenhuma.
- Duas sessões de jogadores diferentes veem a mesma organização e se atualizam em tempo real
  (verificar ao vivo com dois usuários, skill `verify`); o mestre não recebe esses eventos.
- Excluir ou ocultar um documento não deixa vínculo órfão visível para ninguém.
- Gate visual em `1920×1080` e `360×800` (inclusive o caminho por toque), análogo: a lista atual da
  Biblioteca e o seletor de pastas/páginas do Caderno. Primitivos de `shared/ui/` com a API completa;
  se faltar um (ex.: árvore), parar e perguntar ao autor.
- Testes, lint, build e `npm run repo:verificar`.

## Fora de Escopo

Organização individual por usuário, pastas controladas pelo mestre para os jogadores, permissão por
pasta, tags e filtros salvos.
