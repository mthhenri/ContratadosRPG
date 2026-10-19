# Plano — vínculos do Caderno à Biblioteca

Spec: [caderno-vincular-trecho-biblioteca](../caderno-vincular-trecho-biblioteca.spec.md).
Decisões funcionais e ampliação opcional dos primitivos aprovadas em 2026-10-19,
conforme `AGENTS.md`, “Biblioteca de componentes é obrigatória”.

## Arquitetura proposta

Persistir um link Markdown contendo somente o ID do documento e o texto selecionado,
sem copiar título ou conteúdo da Biblioteca. O módulo do Caderno resolve o alvo pela API
existente, que continua sendo a autoridade de acesso. Não alterar schema ou permissões.

O editor oferece recursos genéricos opcionais de seleção e aplicação de link, sem importar
o módulo Documento. A seleção deve acompanhar transações, inclusive remotas de Yjs, durante
a escolha; descartar a operação se o trecho for removido ou se a página mudar. Aplicar uma
transação de marca, preservando formatação, histórico e texto concorrente; nunca substituir
todo o Markdown para inserir um vínculo.

Reutilizar `MenuAcoes` com abertura contextual opcional e conservar seu gatilho para toque e
teclado. Reutilizar `Modal`, `BuscaDocumentos`, os controles e o leitor existentes no seletor.
Estado da Biblioteca e permissões permanecem fora dos primitivos genéricos.

## Análogos visuais

- Caderno flutuante e janela externa: shell, barra compacta, hierarquia e comportamento mobile.
- Biblioteca flutuante e `BuscaDocumentos`: campo, resultados, carregamento, erro e vazio.
- `MenuAcoes`: densidade, navegação por teclado, foco e ações.
- `Modal`: fechamento, foco e folha mobile; sem overlay local.

## Impacto levantado

`npm run impacto -- frontend/src/app/shared/ui/editor-markdown/editor-markdown.component.ts`
identificou 11 consumidores e 10 arquivos de teste. O Caderno é o consumidor pedido.
Os dez demais (edição/leitura de documento, anotações de ficha, ataques/habilidades de criatura,
habilidades e visualização de ficha, descrição de habilidade, conduta e visualização de NPC)
devem conservar comportamento e aparência com os novos recursos desligados por padrão.

Antes de alterar o menu, levantar também seus consumidores pelo script de impacto.

## Execução e aceite

- [x] Registrar decisões funcionais e mover spec para `active/`.
- [x] Obter decisão do autor sobre ampliar os dois primitivos existentes.
- [x] Testar seleção, marca de link e serialização com Milkdown real; cobrir histórico,
  formatação e seleção invalidada/remapeada por edição concorrente.
- [x] Implementar APIs opcionais e menu contextual; verificar regressão dos consumidores.
- [x] Integrar seletor e abertura no Caderno pessoal, colaborativo e janela externa.
- [x] Verificar backend existente: documento oculto/excluído/de outra campanha não revela dados.
- [x] Testar os fluxos integrados, lint, testes e `npm run repo:verificar`.
- [x] Aprovar build distribuível; contorno documentado da P-111 aplicado sem alterar cache/configuração.
- [x] Usar `verify` e `design-fidelity`: desktop 1920×1080, mobile 360×800,
  tela dividida 960×1080 e notebook 1366×768. Cobrir botão direito, toque, teclado,
  busca vazia/erro/resultados, cancelamento, colaboração, reabertura e perda de acesso.
- [x] Revisar diff, registrar evidências e limites e atualizar contexto/histórico.
- [x] Mover spec e anexos para `done/` somente depois dos gates obrigatórios.

Capturas e cenários temporários: `.artifacts/caderno-vincular-trecho-biblioteca/`.
Nenhum arquivo preexistente alterado pelo autor deve ser revertido ou incluído nesta tarefa.
