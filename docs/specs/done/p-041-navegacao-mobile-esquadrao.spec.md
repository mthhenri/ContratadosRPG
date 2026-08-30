# p-041-navegacao-mobile-esquadrao.spec.md

> Task solta, corrigindo `P-041` (`docs/context/PROBLEMS.md`).

## Objetivo

Corrigir a navegação mobile do `CadernoFlutuante` em modo Esquadrão: ao tocar uma página na
lista (`360×800`), a vista deve trocar de `LISTA` para `CONTEUDO`, como já acontece no caderno
privado (`Meu caderno`).

## Entregáveis

1. `executarTrocaPagina` (`caderno-flutuante.component.ts`), ramo `ESQUADRAO` — chamar
   `this.store.definirVistaMobile('CONTEUDO')` antes de `this.colaboracaoEsquadrao.abrir(paginaId)`,
   espelhando o que `CadernoFlutuanteStore.recuperarPagina` já faz para o caderno privado.
2. `iniciarNovaPagina` (`caderno-flutuante.component.ts`), ramo `ESQUADRAO` — mesma chamada antes
   de `this.colaboracaoEsquadrao.criar(...)`, para que criar uma página nova do Esquadrão também
   fique visível no mobile (mesma causa raiz, achado durante a investigação da P-041).
3. **Não** mover a chamada para dentro de `refletirPaginaColaborativa` — essa função também roda em
   toda atualização remota passiva (título/conteúdo digitado por outro colaborador, evento de
   socket `paginaEsquadraoAlterada$`), inclusive enquanto o usuário está de volta na lista; forçar
   `CONTEUDO` ali arrastaria a tela do usuário toda vez que outra pessoa editasse.

## Critérios de Aceite

- `verify` ao vivo em `360×800`, modo Esquadrão: tocar uma página existente na lista troca a vista
  para o editor; tocar "Criar página" também troca; "Voltar" retorna à lista.
- Regressão: com uma página Esquadrão aberta, um segundo usuário edita o título/conteúdo — a vista
  do primeiro usuário **não** deve saltar de volta para `CONTEUDO` se ele já tiver voltado à lista.
- `npm run test --workspace=frontend -- --include=**/caderno-flutuante.component.spec.ts`.

## Fora de Escopo

- Qualquer outra divergência de mobile do Caderno não descrita na P-041.
- P-040 (token `--danger` do Inventário) — problema não relacionado.

## Dependências

Nenhuma.
