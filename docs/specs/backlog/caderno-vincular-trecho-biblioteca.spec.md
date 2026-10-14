# caderno-vincular-trecho-biblioteca.spec.md

> Spec avulsa, **candidata a próxima feature** (autor, 2026-10-14). Ainda é rascunho: as decisões em
> aberto abaixo precisam de resposta do autor antes de mover para `active/`.

## Objetivo

No Caderno de anotações, o jogador seleciona um trecho do texto, clica com o botão direito e
**atribui aquele trecho a um item da Biblioteca** da campanha — por exemplo, marcar "a mulher de
casaco vermelho" como ligada ao documento "Depoimento da testemunha".

## Situação atual (levantada em 2026-10-14)

- Caderno: `frontend/src/app/modules/pagina-caderno/` (`caderno-conteudo`, `caderno-flutuante`, store,
  colaboração do esquadrão), editor `app-editor-markdown` (`shared/ui/editor-markdown`).
- Biblioteca: `frontend/src/app/modules/documento/` — o jogador só enxerga documentos **revelados**
  (`documento-revelacao.service.ts`); painel flutuante `BibliotecaFlutuante`.
- Nenhum menu de contexto próprio no app hoje (os `(contextmenu)` existentes só limpam filtros em
  `ficha-habilidades`). O Markdown do caderno não tem sintaxe de vínculo a documento.

## Entregáveis (a confirmar pelas decisões)

1. Menu de contexto sobre a seleção no editor do caderno (botão direito; no toque, alternativa
   equivalente — o botão direito não existe no celular) com a ação "Vincular à Biblioteca…".
2. Seletor de documento (busca entre os documentos que **aquele jogador** pode ver) reaproveitando a
   busca da Biblioteca.
3. Persistência do vínculo e sua exibição no caderno (trecho marcado, clique abre o documento no
   leitor/painel flutuante).
4. Comportamento quando o documento deixa de estar visível (mestre ocultou/excluiu): o trecho continua
   no texto, o vínculo não vaza título nem conteúdo.

## Decisões em aberto (autor)

1. **Sentido do vínculo**: (a) o trecho do caderno vira um link para o documento; (b) o trecho é
   anexado ao documento como anotação do jogador, visível ao abri-lo na Biblioteca; (c) os dois.
2. **Onde o vínculo vive**: dentro do próprio Markdown (sintaxe de link interno, sem schema novo) ou em
   tabela própria (exige migration — skill `sql-migrations`).
3. **Visibilidade**: o vínculo é pessoal, do esquadrão (caderno colaborativo) ou também visível ao mestre.
4. **Alvo**: só documentos da Biblioteca, ou também outros itens (fichas, NPCs revelados).
5. Prioridade em relação às demais specs abertas desta rodada.

## Critérios de Aceite (provisórios)

- Jogador nunca vê nem vincula documento não revelado (teste de permissão no backend se houver API).
- Vínculo sobrevive à edição colaborativa do caderno sem corromper o texto.
- Gate visual em `1920×1080` e `360×800` (inclusive o caminho por toque), análogo: o próprio Caderno
  flutuante e o painel da Biblioteca. Testes, lint, build e `npm run repo:verificar`.

## Fora de Escopo

Vínculos criados pelo mestre em documentos, grafo de relações, importação/exportação (ver `I-022`).
