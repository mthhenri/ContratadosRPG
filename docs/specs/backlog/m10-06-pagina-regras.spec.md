# m10-06-pagina-regras.spec.md

> Task do milestone `m10-regras.spec.md`, depois de `m10-01` e `m10-04`. Fonte visual: exemplão,
> aba *Protótipo*, modo página, **Coluna**.

> **Antes de qualquer UI:** `docs/design/DESIGN.md` e `docs/design/tema/`; skills
> `design-fidelity` e `verify`. Análogo aprovado: **leitura em trilhos dos patchnotes**
> (`modules/patchnotes`: `sumario-patchnote`, `capitulo-ativo.ts`, `rolagem-pagina.ts`).

## Objetivo

Criar o módulo `frontend/src/app/modules/regras` com a página completa `/regras/sistema` e
`/regras/guia`, renderizando o formato canônico da `m10-01` com os blocos básicos, e trocar a
entrada da topbar por **Regras**.

## Entregáveis

1. **Rotas** públicas (sem login) `/regras/sistema` e `/regras/guia`, lazy; `/regras` redireciona
   para o Sistema. Service que carrega o JSON de `public/regras/` com cache em memória.
2. **Layout em dois trilhos, coluna à esquerda:** sumário fixo à esquerda (árvore até ⬥, largo o
   bastante para não quebrar título, seção ativa marcada ao rolar) + documento numa coluna de
   ~960px onde texto, tabela e grade têm a mesma largura; conjunto alinhado à esquerda; rolagem do
   site. Cabeçalho do trilho: `app-segmentado` Sistema ↔ Guia e "Sistema · v4.1.3" (versão do JSON).
3. **Blocos básicos**, um componente por tipo: seções ⬢ (rótulo de capítulo) / ⬡ (título mono) /
   ⬥ (subtítulo) / ⬦ (verbete com filete); parágrafo e inline (negrito, itálico, tarja como barra
   sólida no tom do Documento de contenção, link externo); lista; Nota (filete amarelo fixo);
   Exemplo (cor tema, `--accent`); tabela de dados no estilo simples; habilidade em lista densa
   (nome mono, chip de Energia, selo REAÇÃO — o chip usa o ícone de Energia quando a entrega 1 de
   `icones-recursos-sistema` existir; até lá, o texto "N E"); bloco genérico.
4. **Navegação:** a URL acompanha a seção (`/regras/sistema#vida`, sem empilhar histórico a cada
   rolagem); link interno rola e **pisca** o destino; seção inexistente abre no topo com aviso
   (`app-notificacao` ou equivalente existente).
5. **Estados:** `app-esqueleto` com a silhueta do trilho e do texto na abertura e na troca de
   documento.
6. **Topbar:** "Documentos" vira **Regras** com o ícone `scp` (`m10-04`) e leva à página. O leitor de
   PDF continua acessível como **download provisório** do PDF antigo até a `m10-11`. Crédito
   CC BY-SA no rodapé das Regras.

## Verificação

`verify` em 1920×1080, 1366×768 e 360×800 (no celular, enquanto a `m10-08` não existir, o sumário
pode ficar acima do texto — registrar). Estados: abertura, troca Sistema ↔ Guia, link interno,
âncora inexistente, URL com âncora colada direto. Comparar com os patchnotes e com o exemplão.

## Fora de escopo

Blocos ricos (`m10-07`), painel/celular (`m10-08`), pesquisa (`m10-09`), PDF (`m10-10`).
