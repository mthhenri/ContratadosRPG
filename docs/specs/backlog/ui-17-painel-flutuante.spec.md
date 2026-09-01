# UI-17 — Primitivo de painel flutuante

> Filha da auditoria visual (seção Utilitários flutuantes). Maior das tasks derivadas e a única
> que move comportamento, não só aparência.

## Objetivo

Transformar o mixin `_utilitario-flutuante.scss` em um componente `app-painel-flutuante` que
guarde moldura e comportamento no mesmo lugar, eliminando a reimplementação de arrastar, lembrar
posição, minimizar, empilhar e fechar em cada utilitário.

## Entregáveis

1. `app-painel-flutuante` com corpo projetado: superfície, borda forte, sombra
   `0 20px 50px −18px`, cabeçalho de arraste com `×` — tudo o que o mixin já define — mais o
   comportamento hoje duplicado em TypeScript (arraste, persistência de posição, empilhamento de
   z-index, fechar).
2. Os dois estados que nenhum utilitário tem hoje: minimizado e vazio (este via `app-estado-vazio`
   da `ui-14`).
3. Migrar caderno, calculadora flutuante e leitor de documentos, apagando a cópia de
   comportamento de cada um e mantendo o conteúdo intacto.
4. Prender o foco enquanto o painel está aberto e fechar por `Escape` — hoje nenhum flutuante faz
   os dois, e abertos por teclado o `Tab` continua correndo pela página atrás.
5. Documentar no `DESIGN.md` a diferença entre painel flutuante, modal e painel lateral de 500px.

## Critérios de Aceite

- Os três utilitários compartilham um único caminho de código para arraste, posição, z-index,
  minimizar e fechar; nenhum mantém handler próprio.
- Abrindo por teclado: foco entra no painel, `Tab` circula dentro dele, `Escape` fecha e o foco
  volta para o gatilho — verificado nos três.
- Posição e estado minimizado sobrevivem a recarregar a página, como hoje.
- Gate visual dos três utilitários nos dois viewports, nos estados normal, minimizado e vazio.

## Fora de Escopo

Redimensionar por arraste, encaixe em bordas, multi-instância do mesmo utilitário e mudanças no
conteúdo de calculadora, caderno ou leitor.

## Dependências

`ui-14` (estado vazio), `_utilitario-flutuante.scss`, `ui-07` (modal nativo, para a regra de
escolha).
