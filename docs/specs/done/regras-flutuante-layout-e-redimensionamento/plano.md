# Regras flutuantes — plano de implementação

**Objetivo:** aplicar a prévia aprovada e habilitar o redimensionamento.
**Spec:** [escopo e aceite](../regras-flutuante-layout-e-redimensionamento.spec.md).
**Arquitetura:** geometria na casca `RegrasFlutuante`; apresentação da barra
guardada por `emPainel`; pesquisa continua usando o mesmo controller/memória.
**Execução:** direta no checkout atual, preservando o trabalho paralelo no card.
**Análogos:** Caderno para moldura/alça; `Campo`, `Botao`, `BotaoIcone` e
`Segmentado` já presentes no leitor para identidade e densidade da barra aprovada.

## Impacto

`npm run impacto -- frontend/src/app/modules/regras/regras-leitor.component.ts`:
dois consumidores: painel (pedido), página/Oficina (preservadas por `emPainel`).
`npm run impacto -- frontend/src/app/modules/regras/regras-pesquisa.component.ts`:
somente leitor; apresentação padrão preservada, recortes opcionais campo/resultados
usados exclusivamente pelo painel compacto. Nenhum primitivo ampliado.

## Execução e revisão

- [x] Testes primeiro: geometria por ponteiro, restauração do tamanho escolhido,
  viewport reduzido e mobile; campo na barra sem duplicação e página preservada.
- [x] Casca: eventos de ponteiro na alça, limites por posição, estado normal
  preservado separadamente de maximização, cancelamento ao fechar/mudar viewport.
- [x] Pesquisa: recorte opcional de apresentação; barra em duas linhas somente
  no painel compacto; resultados e seleção existentes conservados no sumário.
- [x] Testes focados; formato dos HTML/SCSS tocados; build/lint e integração.
- [x] Inspeção pessoal ao vivo nos quatro viewports; corrigir divergências.
- [x] Revisão do diff e relatório; contexto/histórico e gate no fecho.

## Riscos a conferir

Arraste perto da borda não sai da tela; restaurar maximização não esquece a
dimensão escolhida; pesquisa no painel e página simultâneos mantém seu isolamento;
Escape limpa o campo antes de fechar a janela; resize não move o foco nem o livro.
