# Plano — mudanças publicadas para leitores

Spec: [livros-mudancas-publicadas-para-leitores.spec.md](../livros-mudancas-publicadas-para-leitores.spec.md).

## Objetivo e arquitetura

NestJS autoriza e recorta publicações; `shared/livro` continua dono do comparador.
Componente público próprio concentra transporte, estado e apresentação, evitando
acrescentar essa responsabilidade ao leitor extenso ou ao estado da Oficina.
Angular Signals + Reactive Forms, editor e renderização Markdown canônicos.

## Restrições e contrato integrado

- Somente PUBLICADA; destino atual, origem opcional (anterior por padrão).
- GET `/livros/:codigo/mudancas?origemId=...`, autenticação opcional.
- `LivroPublicacaoResumoDto`: id, numero, publicacaoData, nota.
- `LivroMudancasPublicadasRecuperarDto`: codigo, origemId?: number.
- `LivroMudancasPublicadasDto`: codigo, titulo, publicacoes (mais recente primeiro),
  origem (resumo ou null), atual (resumo), notas (resumos em ordem cronológica), mudancas.
- `LivroMudancaPublicadaDto`: identificador, situacao, caminho, caminhoAnterior,
  antesMarkdown (string|null), depoisMarkdown (string|null), ancoraAtual (string|null),
  campos (readonly LivroCampoAlteradoDto[]) e posicao opcional. Uma entrada por peça, movimento combinado
  à alteração sem repetir texto. Fragmentos Markdown legíveis pelo exportador existente;
  nenhuma fotografia integral devolvida ao cliente público.
- Campos alterados servem ao destaque de palavras/formatação; conteúdo completo do
  bloco aparece antes/depois. Containers alterados não arrastam filhas inalteradas.
- Sem migration: reutilizar nota existente. Sem mudar primitivos/tokens globais.
- Critérios/gates da spec são obrigatórios; produção e banco do autor preservados.

## Análogo e impacto antes da edição

Análogos: `oficina-mudancas.component.*` (gaveta, caminho pequeno, cabeçalho com chip,
grupos antes/depois e espaçamento compacto); `oficina-publicar.component.*` (modal,
ações inferiores e estados de erro); `shared/ui/editor-markdown/` (barra e editor).
Gaveta pública usa o mesmo shell `Gaveta`; controles usam Botao/Campo/Seletor,
Cartao/Chip/EstadoVazio/Esqueleto existentes. No celular, conteúdo em coluna, sem
overflow da superfície; tabelas com scroll local. Ícones de ações genéricos já existentes.

Impacto: contratos novos são aditivos; endpoints administrativos preservados;
comparador e exportador reutilizados sem mudar suas assinaturas; editor reutilizado
no diálogo de publicação, sem alteração de primitivo. Leitor recebe apenas um host
do componente e navegação autorizada; superfícies página/painel acompanham o pedido.
Executar `npm run impacto` para os itens reutilizados e conferir pontos cegos.

## Execução

- [x] API e DTOs: escrever testes de seleção/recusa e comparação pública, observar falha,
  implementar recorte e agrupamento, executar testes focados e build shared/backend.
- [x] Interface pública: transporte e estado próprios, testar descarte de respostas,
  notas/estados/blocos e segurança; implementar componente e integrar página/painel.
- [x] Publicação: testar persistência de Markdown pelo editor canônico e implementar
  formulário reativo com fechamento/salvamento coerentes.
- [x] Integração: cenário isolado com publicações/rascunho/trabalho e blocos ricos,
  verificar API e UI real em 1920×1080/1366×768/960×1080/360×800, claro/escuro,
  página/painel, publicação admin → leitura visitante/NORMAL; principal inspeciona.
- [x] Revisão independente consolidada, corrigir achados, testes/lint/build e
  repo:verificar; registrar relatório e contexto; mover spec/anexos juntos só ao concluir.

## Decisões de integração e revisão

- Leitura oficial explícita em GET `/livros/:codigo/publicada` para os links da
  comparação: admin/tester podem estar lendo rascunho no leitor normal; o link deve
  trocar para o texto vigente. Erro/retry conserva o pedido oficial e sua âncora.
- Comparação pública carrega estado próprio, sem compartilhar o store de edição;
  nenhuma extração ampla do leitor ou do comparador foi necessária.
- Movimento entre irmãs transporta posição além dos caminhos; categoria de habilidade
  ganha rótulo no fragmento público para mudanças booleanas não desaparecerem.

## Foco de revisão

Ids de outro livro/rascunho; respostas antigas restaurando livro/origem; publicação
sem anterior; subárvore duplicada; campos ricos/tabelas ilegíveis; links de removidas;
HTML/URLs hostis; nota de versão intermediária confundida com diff líquido.
