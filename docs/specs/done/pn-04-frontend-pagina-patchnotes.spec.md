# pn-04-frontend-pagina-patchnotes.spec.md

> Task 4/5 do guarda-chuva `patchnotes-versao-sistema.spec.md` (entregáveis `pn-04`).

## Objetivo

Criar a página pública `/patchnotes` (lista de versões + nota renderizada), com os estados
aprovados no POC: carregando, versão inexistente e falha ao carregar.

## Entregáveis

1. `PatchnoteService` (cliente HTTP) e rotas públicas `/patchnotes` e `/patchnotes/:versao` em `modules/patchnotes/` — uma única entrada de rota com `matcher`, para o redirecionamento da raiz à versão mais recente reaproveitar a página em vez de recriá-la; `VersaoService.marcarVista()` ao abrir. `renderizarMarkdownSeguro` (sem uso até aqui) passa de `modules/pagina-caderno/` para `shared/markdown/`.
2. Página: lista de versões (coluna no desktop, faixa horizontal no mobile) e nota com blocos Novidades/Melhorias/Correções, renderizada por `renderizarMarkdownSeguro` (sem HTML cru, imagem nem esquema perigoso).
3. Componente compartilhado do documento de contenção, extraído de `AcessoNegadoPage` e reutilizado por ela e pelos estados 404/503 (sem copiar o SCSS); a tela de Acesso negado permanece idêntica.
4. Estados: carregando (`app-esqueleto`), 404 ("Ver todas as versões") e 503 ("Tentar novamente"/"Voltar ao painel"), com os textos do POC. O 503 declara o erro em `ERROS_TRATADOS_NA_TELA` (sem toast duplicado).
5. Componentes de `shared/ui/` em todos os controles; se faltar um primitivo, parar e perguntar ao autor.

## Critérios de Aceite

1. Testes do service, da página (estados, seleção de versão, marcar vista) e do matcher; o spec de `AcessoNegadoPage` continua verde com a única alteração de renomear dois seletores (`.acesso-negado__mensagem`/`__censura` → `.contencao__mensagem`/`__censura`), que passaram para o componente compartilhado.
2. Um teste prova que `<script>`/`onerror=` no Markdown não chega ao DOM.
3. Gate visual completo (`design-fidelity` + `verify`) em `1920×1080`, `960×1080` e `360×800`, todos os estados, com a tela de Acesso negado comparada pixel a pixel antes/depois da extração (0 px de diferença no desktop e no mobile).

## Fora de Escopo

- Publicar as notas reais (`pn-05`).
- Notificação in-app além do ponto da `pn-01`.

## Dependências

`pn-01` e `pn-03` concluídas; POC aprovado (https://claude.ai/artifact/E2xhXddp4QyyT4i9tjBqsL).
