# Corrigir e verificar seleção e leitura dos documentos da Investigação

## Origem e diagnóstico

Relato do autor em 2026-09-29: documento aparece acima dos agentes, troca não acompanha e não desseleciona. Análise estática, sem reprodução ao vivo nesta tarefa.

- A coluna pertence a Investigação (`PainelCenaSemIniciativaMestre`), embora acessada pelo fluxo de cenas/Iniciativa. Não confundir com a seleção independente da Biblioteca flutuante.
- `focarDocumento` sempre chama a operação focar. `CenaDocumentoService.focar` e `CenaDocumentoRepository.definirFoco` sempre definem um vínculo, sem caminho para limpar foco. Repetir o clique conserva a seleção. A m7-25 não especificou desseleção.
- `carregarDocumentoFoco` faz subscriptions independentes, sem cancelar ou conferir identidade antes de aplicar a resposta. Trocas A→B podem renderizar A se sua resposta chegar por último. Ao limpar foco não há proteção contra resposta pendente. É risco demonstrável no fluxo, ainda sem confirmação de que causou o relato.
- O jogador abre documentos em modal; sua carga também não protege troca/fechamento contra respostas atrasadas.
- Os testes existentes cobrem abertura, apresentação e remoção, mas não a sequência completa de trocas, desseleção e respostas fora de ordem.

## Comportamento esperado

- Clique em A seleciona A; clique em B substitui o leitor por B; novo clique no selecionado limpa foco e leitor, mantendo a grade de agentes.
- Desselecionar não oculta, remove ou altera o documento da Biblioteca. Foco continua independente de revelação; não abrir automaticamente leitores de jogador/espectador ao focar/apresentar.
- Definir o contrato de limpeza em shared e na service dona, validado como mestre-only e bloqueado para cena encerrada; persistência coerente com o foco atual. Não usar id fictício.
- Aplicar apenas a resposta correspondente à seleção atual; fechar, remover ou mudar de cena invalida cargas pendentes. Erro não deixa documento antigo nem esqueleto permanente; permitir recuperação.
- Leitor aberto acompanha alteração autorizada de conteúdo/imagem; ocultação/remoção fecha leitura de quem perdeu acesso. Conferir assinaturas de `documento:alterado`, `cena:documento-alterado` e reconexão.
- Preservar as decisões da m7-25: foco do mestre não é apresentação sincronizada; documentos revelados são abertos voluntariamente pela mesa.

## Roteiro obrigatório

1. Dois documentos A/B, texto e imagem, anexados a Investigação; selecionar A→B→A, repetir clique, remover o focado e reabrir a cena.
2. Respostas controladas fora de ordem, erro de recuperação e fechamento durante carga: nenhum conteúdo antigo reaparece. Cobrir mestre e modal do jogador.
3. Mestre/jogador em sessões separadas: focar oculto não revela; apresentar revela; trocar foco não muda leitor alheio; alterar/ocultar/remover atualiza corretamente o leitor aberto.
4. Reordenar e alternar Biblioteca flutuante durante leitura não confundem a seleção da Biblioteca com o foco da cena. Reconexão recupera o estado autorizado.
5. Testes de contrato/service/repository e componentes, mais gates proporcionais. Usar skill verify em 1920×1080 e 360×800 e registrar cada sequência e resultado.

## Referências e escopo

SYSTEM.SPEC, CONVENTIONS, DESIGN, m7-25 e m9-07. Análogos: painel de Investigação atual e Biblioteca (toggle de seleção), respeitando suas semânticas distintas. Primitivos shared/ui completos; nenhuma nova biblioteca visual. Não estender documentos para cenas de combate nesta tarefa. Spec aberta; análise estática não equivale a correção nem teste ao vivo.
