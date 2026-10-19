# caderno-vincular-trecho-biblioteca.spec.md

> Spec concluída em 2026-10-19. Decisões funcionais e ampliação dos primitivos aprovadas pelo autor.
> Evidências e limites: [verificação](caderno-vincular-trecho-biblioteca/verificacao.md).

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

## Entregáveis

1. Menu de contexto sobre a seleção no editor do caderno (botão direito; no toque, alternativa
   equivalente — o botão direito não existe no celular) com a ação "Vincular à Biblioteca…".
2. Seletor de documento (busca entre os documentos que **aquele jogador** pode ver) reaproveitando a
   busca da Biblioteca.
3. Persistência do vínculo e sua exibição no caderno (trecho marcado, clique abre o documento no
   leitor/painel flutuante).
4. Comportamento quando o documento deixa de estar visível (mestre ocultou/excluiu): o trecho continua
   no texto, o vínculo não vaza título nem conteúdo.

## Decisões aprovadas (autor, 2026-10-19)

1. **Sentido:** o trecho vira um link que abre o documento; nenhuma anotação é anexada à Biblioteca.
2. **Persistência:** no próprio Markdown, referenciando o ID do documento, sem tabela nova.
3. **Visibilidade:** acompanha a página (pessoal ou esquadrão); cada leitor somente abre documentos
   aos quais tem acesso. O vínculo não concede acesso.
4. **Alvo:** somente documentos da Biblioteca.
5. **Prioridade:** execução solicitada nesta sessão.

### Decisão técnica aprovada (autor, 2026-10-19)

O autor aprovou a ampliação opcional dos primitivos `EditorMarkdown` e `MenuAcoes`,
conforme `AGENTS.md`, “Biblioteca de componentes é obrigatória”. Demais usos devem permanecer
inalterados; recursos da Biblioteca pertencem ao módulo do Caderno, não ao primitivo genérico.

## Critérios de Aceite

- Jogador nunca vê nem vincula documento não revelado (teste de permissão no backend se houver API).
- Vínculo sobrevive à edição colaborativa do caderno sem corromper o texto.
- Gate visual em `1920×1080` e `360×800` (inclusive o caminho por toque), análogo: o próprio Caderno
  flutuante e o painel da Biblioteca. Testes, lint, build e `npm run repo:verificar`.

## Fora de Escopo

Vínculos criados pelo mestre em documentos, grafo de relações, importação/exportação (ver `I-022`).
