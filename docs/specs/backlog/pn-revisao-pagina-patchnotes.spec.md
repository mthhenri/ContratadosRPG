# pn-revisao-pagina-patchnotes.spec.md

> Guarda-chuva da revisão da página pública `/patchnotes`. Continua
> `patchnotes-versao-sistema.spec.md`; a `pn-06` está concluída.
>
> - **Pedido do autor (2026-10-05):** a página está "muito central" e sobra espaço lateral vazio;
>   ele quer distribuir melhor a informação e ter capítulos dinâmicos dentro da nota.
> - **Escopo fechado (2026-10-06):** depois de comparar as features ao vivo numa bancada
>   interativa com as notas reais. O protótipo aprovado é o conjunto **Definido** da bancada
>   (artifact privado do autor: <https://claude.ai/artifact/1ZSaLeRyHe3Hq41WRr39rr>).
> - **Divisão:** cinco tasks, `pn-07` a `pn-11`, cada uma num arquivo próprio em `backlog/`.

## Diagnóstico (estado atual, `1920×1080`)

- **Página espremida no centro.** `.patchnotes` tem `max-width: 1120px` centralizado, o que deixa
  cerca de 400px vazios de cada lado.
- **Lista de versões pobre.** A coluna de ~220px mostra só número e data, sem título, e não há
  marca do que é novo.
- **Nota sem mapa.** É um texto longo (a `1.4.0` tem 2 grupos e 10 blocos `##`) sem sumário e sem
  link direto para um trecho.
- **Resumo no lugar errado.** O resumo da versão fica no fim, onde quem lê por cima não chega.

## Escopo decidido

| Feature | Task |
|---|---|
| Capítulos derivados do Markdown, âncoras estáveis e "copiar link" por capítulo | `pn-07` |
| Layout amplo em trilhos (três zonas), cabeçalho compacto e botão do ADMIN preservado | `pn-08` |
| Sumário "Nesta versão" e destaque do capítulo visível | `pn-09` |
| Lista de versões com título, agrupada por linha, e "Novo desde a última visita" | `pn-10` |
| Resumo em destaque no topo, anterior e próxima no rodapé, e fechamento | `pn-11` |

Ordem: `pn-07` e `pn-08` podem correr em paralelo. `pn-09` precisa das duas, `pn-10` precisa da
`pn-08`, e a `pn-11` é a última.

## Decisões de desenho (valem para todas as tasks)

1. **Três zonas a partir de ~1240px**: à esquerda as versões, no centro a nota e à direita
   "Nesta versão". **`1366×768` também tem três zonas**; a versão anterior desta spec previa duas,
   e a bancada mostrou que cabem.
   - Entre ~720px e 1239px: duas zonas, e o sumário vira uma seção recolhível no topo da nota.
   - Abaixo de 720px: uma coluna, com as versões em faixa horizontal.
2. **Largura vem dos trilhos, nunca do parágrafo.** O Markdown vai no máximo a `15px`/`70ch` em
   três zonas.
3. **Capítulos são derivados, não autorados.** Nada muda em `docs/patchnotes/*.md`, no R2, na API
   nem na skill `publicar-versao`.
4. **Só tokens e primitivos de `shared/ui/`.** Duas lacunas já identificadas, ambas decisão do
   autor ao abrir a task:
   - não existe um primitivo de sumário (TOC), em `pn-09`;
   - o `app-chip` não tem severidade positiva para o "Novo", em `pn-10`.
5. **Análogos aprovados:**
   - trilho fixo: `.criar__resumo` (`criar.page.scss`);
   - leitura longa: a Biblioteca de documentos;
   - item ativo: o `.patchnotes__item--ativo` atual;
   - composição: o conjunto Definido da bancada.

## Critérios de Aceite (do guarda-chuva)

1. As cinco tasks estão em `done/`, cada uma com o seu próprio gate cumprido.
2. O gate visual final da `pn-11` passa nos quatro viewports, comparando com o conjunto Definido.
3. `shared` e `backend` ficam intocados, com uma exceção: a `pn-10` só lê a chave existente do
   `VersaoService`, que é código de frontend.

## Fora de Escopo

As features abaixo foram avaliadas na bancada e **não entram**:

- Filtro Players / Mestre.
- Contagem de seções por público. As notas reais não usam os blocos
  Novidades/Melhorias/Correções, então a ideia original de "contagem por tipo" não se aplicava.
- Resumo no trilho direito.

E as que ficaram fora desde o início:

- Busca dentro das notas e comparação entre versões.
- Agrupar a lista por mês.
- Mudar o formato dos patchnotes, o índice, o R2 ou a API.
- Editor de patchnotes na interface (descartado desde `patchnotes-versao-sistema`).

## Questões resolvidas

1. **Milestone próprio ou série `pn-*`?** A revisão continua na série `pn-*`: é uma página só e
   não mexe no backend.
2. **Resumo destacado?** Sim, no topo da nota, em todas as larguras (`pn-11`).
3. **Agrupar a lista de versões?** Sim, por linha `MAJOR.MINOR`, e não por mês (`pn-10`).
