# m11-04-publicacao-e-leitura-por-papel.spec.md

> Task 4/10 do milestone [`m11-oficina-regras.spec.md`](m11-oficina-regras.spec.md). Torna o banco
> a fonte que o leitor consome.

## Objetivo

Montar a fotografia de um livro, publicar como rascunho ou versão (só `ADMIN`), expor a leitura por
papel (todos → publicada atual, `TESTER` → rascunho atual, `ADMIN` → qualquer versão) e fazer o
leitor de Regras ler da API em vez do JSON estático.

## Entregáveis

1. **Service** `livro` com: `montarFotografia` (árvore de peças → `LivroVersaoConteudoDto`,
   resolvendo link por `identificador` em âncora, aplicando também as âncoras antigas), `publicar`
   (rascunho ou versão), `recuperarLivro` por papel, `listarVersoes` e `recuperarVersao` (admin).
   Permissão validada na service (`ADMIN` publica; leitura conforme papel global), nunca na
   controller. Publicar de **versão** com pendência do validador (`m11-01`) é recusado com a lista;
   **rascunho** passa com as pendências registradas.
2. **Controller fina** `livro` e rotas: `GET /livros` (lista), `GET /livros/:codigo` (versão
   visível ao papel), `GET /livros/:codigo/versoes`, `GET /livros/:codigo/versoes/:id` (admin),
   `POST /livros/:codigo/publicacoes`. `GET` de leitura pública sem exigir login (a leitura de
   Regras hoje é pública); verificar na implementação como o papel é lido em rota `@Public()`.
3. **DTOs** em `shared/src/dtos/livro/` (entrada no infinitivo, saída no particípio).
4. **Leitor lê da API**: `regras.service.ts` passa a buscar o livro por `/livros/<codigo>`;
   `regras-consulta`, painel flutuante, pesquisa e impressão continuam funcionando com os mesmos
   tipos. Estratégia de carga/cache (API direta com cache ou fotografia como asset estático)
   decidida e registrada nesta task, medindo tempo de abertura e comportamento offline do painel.
5. **Marcadores de estado no leitor**: quando um tester vê rascunho, o leitor indica que é
   rascunho e o número; sem alterar o desenho para quem lê a versão publicada.
6. **Evento de tempo real**: avaliar `livro:publicado` para o leitor aberto avisar que há versão
   nova (broadcast-only, sala por papel); incluir só se o custo for baixo, senão registrar em
   `IDEAS.md`.

## Critérios de Aceite

- Testes de service: publicar por não-admin recusa; versão com pendência recusa; rascunho com
  pendência passa; leitura por papel devolve a fotografia certa para `NORMAL`, `TESTER` e `ADMIN`;
  fotografia publicada é imutável (nova publicação cria outra linha); âncora antiga continua
  resolvendo.
- Leitura pública sem token devolve a publicada; rascunho nunca vaza para quem não é tester/admin
  (teste explícito, incluindo acesso direto por id de versão).
- Prova de equivalência: o leitor renderizando via API mostra o mesmo que renderizava via JSON
  estático nos dois livros (comparação da `m11-03` reutilizada) e a verificação visual com `verify`
  em `1920×1080` e `360×800` (leitor, painel flutuante, pesquisa, impressão) não mostra regressão.
- `npm run lint`, `npm run test --workspaces --if-present` verdes. Revisão independente
  (`revisor`) por envolver permissão e leitura por papel.

## Fora de Escopo

Edição de peças; comparador; UI de publicar (`m11-09`); exportação para `docs/core/` (`m11-10`);
remover o JSON estático e o `prestart` (`m11-10`).

## Dependências

`m11-02` e `m11-03` em `done/`. `SYSTEM.SPEC.md` §12 e §14 (papéis; o global `ADMIN`/`TESTER` é
distinto do papel por campanha).

## Riscos e Mitigação

- **Rascunho vazando para público.** Teste de papel por rota e por id, mais revisão independente.
- **Regressão de abertura do leitor.** Medir antes/depois; o cache é parte do aceite.
- **Leitura pública exige saber o papel.** Rota opcionalmente autenticada; sem token = `NORMAL`.

## Resultado (10/10/2026)

Implementada conforme os entregáveis 1–5; o 6 (evento `livro:publicado`) foi avaliado e ficou fora
(`IDEAS.md` `I-061`). Estratégia de cache, equivalência do leitor e limites:
[`verificacao.md`](m11-04-publicacao-e-leitura-por-papel/verificacao.md). A prova de equivalência
reutiliza o conversor e a projeção da `m11-03`; revisão independente feita (permissão e leitura por papel).
