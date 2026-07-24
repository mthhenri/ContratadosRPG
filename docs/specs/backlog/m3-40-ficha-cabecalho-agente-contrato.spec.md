# m3-40-ficha-cabecalho-agente-contrato.spec.md

> Task 37 do milestone `m3-ficha-jogador.spec.md`. Lote de refino da ficha (`m3-40`…`m3-56`).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Renomear o rótulo **"Codinome"** do cabeçalho da ficha para **"Agente"** e adicionar, ao lado,
um campo **"Contrato — 0000"** editável **apenas pelo mestre**. Além disso, liberar ao mestre a
**edição da Personalidade** do agente (hoje travada pela imutabilidade de Identidade para o dono).

## Entregáveis

1. **Rótulo "Agente":** trocar o texto "Codinome" no card de Identidade
   (`frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`,
   ~linhas 41-70). O binding de valor (`nome()`, coluna relacional) permanece; só o rótulo muda.
2. **Campo "Contrato":** novo dado `contrato?: string` (ou número formatado) em
   `FichaJogadorDadosDto` (`shared/src/dtos/ficha/ficha.dtos.ts`) — é conteúdo de jogo, mora no
   JSONB `dados`, **não** vira coluna. Atualizar `docs/SCHEMA.md`.
   - Exibido ao lado do nome do Agente, no padrão de edição inline (`ajuste*` + persistência
     debounced em `visualizar.page.ts`), **habilitado só quando `ehMestre()`** (input `ehMestre`
     já existe em `ficha-visualizacao.component.ts`, ~linha 727). Para o dono/visualizador é
     somente-leitura.
   - Formato de exibição "CONTRATO — 0000" (mono, uppercase, tokens do tema). O chip de
     classificação (`ficha-visualizacao.component.ts` ~linha 435) pode passar a refletir o número
     do contrato.
3. **Edição da Personalidade pelo mestre:** a Personalidade vive em `identidade.personalidade`
   (`FichaIdentidadeDto`) e na habilidade `HabilidadeCategoriaEnum.PERSONALIDADE`, editada inline
   pelo canal `editandoIdentidade` (mesmo padrão do Codinome). A imutabilidade da Identidade
   (`m3-24`/`m3-25`) trava o **dono** mas **libera o mestre** — garantir que o gate `ehMestre()`
   habilite a edição da Personalidade para o mestre, reusando
   `FichaService.validarImutabilidadeIdentidade` no backend (o mestre passa a trava).

## Critérios de Aceite

- O card de Identidade mostra "Agente" no lugar de "Codinome".
- O mestre consegue editar o número do Contrato; dono e visualizador veem, mas não editam.
- O mestre consegue editar a Personalidade de uma ficha da sua campanha; o dono continua travado
  pela imutabilidade (comportamento da `m3-24`).
- Contrato persiste em `dados` e sobrevive a reload (backend não rejeita a forma).

## Fora de Escopo

- Geração/validação automática do número de contrato (é texto livre do mestre por ora).
- Qualquer mudança na regra de imutabilidade da Origem (`m3-24`) além de confirmar que o mestre
  já passa.

## Dependências

- `m3-23` (contrato de Identidade — Personalidade), `m3-24`/`m3-25` (imutabilidade + edição
  só-mestre da Identidade), `m3-01` (contrato `FichaJogadorDadosDto`).
