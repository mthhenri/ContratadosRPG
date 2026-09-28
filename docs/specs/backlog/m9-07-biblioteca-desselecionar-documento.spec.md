# m9-07-biblioteca-desselecionar-documento.spec.md

> **Task avulsa pós-M9 (pedido direto do autor, 2026-09-28).** Primeira de quatro specs de melhoria da
> Biblioteca: `m9-07` (desselecionar), `m9-08` (importar Markdown), `m9-09`/`m9-10` (quem está lendo).
> Independentes entre si; integrar em sequência porque tocam os mesmos arquivos da página do mestre.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` (seção "Biblioteca de documentos") e o handoff
> em `docs/design/tema/`. Todo controle usa o primitivo de `shared/ui/`; se faltar um, **parar e
> perguntar ao autor**.

## Objetivo

Clicar no documento que **já está aberto** na lista da Biblioteca o fecha: o painel volta ao estado
"nenhum documento aberto", nas três visões (mestre, jogador, espectador). Hoje o segundo clique é
ignorado e a única forma de fechar é o "voltar" do celular.

## Análogo aprovado (registrar no fecho da task)

- A própria Biblioteca da `m9-04`/`m9-05`: o estado do painel sem documento aberto (`painelVazioApoio`
  em `BibliotecaLayout`) já existe e é o destino do fechamento — nenhuma tela nova.
- O "voltar" do celular (`fecharDocumento`), que já faz exatamente o fechamento pedido, inclusive a
  confirmação de descarte do mestre.

## Estado atual

- `ListaDocumentos` emite `selecionar(id)` a cada clique no `app-documento-cartao`
  (`lista-documentos.component.html`); o cartão já marca o aberto com `aria-current="true"` e a classe
  `documento-cartao--aberto`.
- Mestre: `BibliotecaMestre.selecionar` (`biblioteca-mestre.page.ts:260`) **retorna cedo** quando
  `id === abertoId()`. `fecharDocumento()` (`:269`) pergunta o descarte (`confirmarDescarte`), sai da
  edição e zera `abertoId`/`aberto`.
- Jogador e espectador: `BibliotecaLeituraStore.selecionar` só carrega quando `id !== abertoId()`;
  `fecharDocumento()` zera os dois signals.
- A busca (`BuscaDocumentos`) usa o mesmo output `selecionar` do layout para abrir um resultado.
- No celular (`≤ 560px`) a lista some enquanto há documento aberto — o segundo clique na lista só é
  alcançável da largura em que lista e painel convivem.

## Entregáveis

1. **A decisão de alternar é da página/store, não do cartão.** `ListaDocumentos` continua só emitindo
   `selecionar(id)`; quem recebe decide:
   - `BibliotecaMestre.selecionar(id)`: se `id === abertoId()`, delega a `fecharDocumento()` (que já
     pergunta o descarte quando há rascunho — "Continuar editando" mantém o documento aberto e em
     edição); senão, o fluxo atual.
   - `BibliotecaLeituraStore.selecionar(id)`: se `id === abertoId()`, `fecharDocumento()`; senão, o
     fluxo atual.
2. **A busca não alterna.** Clicar num resultado da busca é navegação: abre o documento e, se ele já
   estiver aberto, não faz nada (comportamento de hoje). Para isso o layout separa os dois caminhos —
   o resultado da busca passa a sair por um output próprio (ex.: `abrir`) ou a página recebe a origem
   do clique; escolher o que deixar a página mais simples e registrar no fecho. A lista usa o
   `selecionar` alternável.
3. **Acessibilidade:** o cartão aberto troca `aria-current` por `aria-pressed` (`true`/`false`), já que
   passa a ser um botão de alternância; o foco permanece no cartão depois de fechar (nenhum salto de
   foco para o painel vazio). O `appTooltip`/rótulo do cartão não muda.
4. **Documentação de design:** a seção "Biblioteca de documentos" de `DESIGN.md` registra que o cartão
   aberto alterna (clique de novo fecha) e que o resultado de busca não alterna.

## Critérios de Aceite

- `npm run test -w frontend` verde, com testes novos: segundo clique no aberto fecha (mestre e store);
  mestre em edição com rascunho → pergunta o descarte e, cancelando, continua aberto e em edição;
  mestre em edição sem mudança → fecha sem perguntar; clique em resultado de busca já aberto não fecha;
  `aria-pressed` reflete o estado.
- `npm run lint -w frontend` sem erros.
- **Verificação pela skill `verify`** em `1920×1080` e `960×1080` (larguras em que lista e painel
  convivem) e `360×800` (confirmar que o fluxo do celular — abrir, "voltar" — não mudou), nas visões
  do mestre e do jogador: abrir → clicar de novo → painel vazio; abrir com edição suja → clicar de
  novo → dialog de descarte nos dois caminhos; foco visível no cartão depois de fechar.
- Comparação visual: o painel vazio depois do fechamento é idêntico ao da primeira carga da página.

## Fora de Escopo

- Fechar pelo teclado com `Esc` fora do dialog, ou um botão "Fechar" no cabeçalho do documento aberto.
- Mudar o comportamento da busca além do item 2.
- Qualquer mudança de backend ou de `shared/`.

## Dependências

`m9-04` (`BibliotecaMestre`, `confirmarDescarte`), `m9-05` (`BibliotecaLayout`, `ListaDocumentos`,
`BibliotecaLeituraStore`, `BuscaDocumentos`), `docs/design/DESIGN.md`.

## Decisões assumidas ao especificar (confirmar com o autor)

1. **Resultado de busca não alterna** — quem clica num resultado quer ler aquilo; fechar por engano ao
   refinar a busca seria surpresa. Se o autor preferir o mesmo comportamento da lista, o item 2 cai.
2. **Com rascunho sujo, o segundo clique pergunta** (mesma confirmação do "voltar" e da troca de
   documento), em vez de ser ignorado durante a edição.
