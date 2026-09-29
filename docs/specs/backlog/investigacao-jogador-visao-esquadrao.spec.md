# Investigação — visão de esquadrão para o jogador

## Origem e estado

Pedido do autor em 2026-09-29. Spec preparada para discussão visual; não implementar antes de definir a composição com o autor. Nenhum código alterado nesta análise.

`PainelCenaSemIniciativaJogador` apresenta documentos, rolagens e a própria ficha; não renderiza o esquadrão. O detalhe da campanha já tem a visão de equipe (`equipeExibicao`, painel Esquadrão), que deve servir de referência de conteúdo e permissões.

## Objetivo

O jogador acompanha sua equipe durante a Investigação sem voltar à campanha, mantendo acesso à própria ficha e aos documentos apresentados.

## Requisitos definidos

- Exibir apenas agentes autorizados para o observador: sua própria ficha pode aparecer mesmo oculta; ficha oculta de outro jogador não aparece nem deixa cartão, marcador, contador ou espaço reservado.
- Ficha visível sem acesso completo usa somente a carteirinha canônica; acesso completo não pode ser inferido pela presença no esquadrão. Reutilizar os contratos e regras do painel da campanha.
- Abrir ficha alheia apenas quando autorizado, usando o fluxo existente de ficha flutuante. Não acrescentar edição alheia.
- Preservar própria ficha, ações de rolagem e documentos; equipe não depende de o jogador possuir ficha.
- Sincronizar vitalidade/condições autorizadas, entrada/saída, ocultação/revelação e revogação; reconexão refaz o recorte. Ocultar ficha remove também seleção/prévia aberta de outro jogador.
- Mestre em prévia vê exatamente o recorte do jogador-alvo, nunca a lista completa do mestre.

## Discussão visual antes de implementar

Análogos a inspecionar: Esquadrão de `detalhe-jogador`, painel sem iniciativa do jogador e grade de agentes do mestre. Ler DESIGN e handoff tema; registrar shell, densidade, hierarquia, controles, estados e responsividade.

Comparar com o autor as opções, sem tratar nenhuma como aprovada:

| Composição | Vantagem | Custo |
|---|---|---|
| Seção de equipe no palco | Equipe imediatamente visível | Disputa altura com própria ficha e documentos |
| Painel lateral com alternância | Reaproveita a composição da campanha | Exige definir acesso e prioridade no mobile |
| Painel flutuante de esquadrão | Mantém a cena disponível | Pode sobrepor documentos e ficha; exige conferir cobertura dos primitivos |

Definir localização, abertura inicial, conteúdo de cada cartão, convivência com documentos/própria ficha e comportamento em 360×800. Produzir corte representativo para aprovação visual. Se shared/ui não cobrir a solução, consultar o autor antes de ampliar primitivo.

## Aceite e gates futuros

- Jogador vê colegas permitidos sem sair da Investigação; próprio agente oculto permanece disponível apenas para si e mestre.
- Cenário com colega visível sem concessão, colega com concessão, colega oculto e jogador sem ficha. Prévia e sessão real coincidem.
- Verificar atualizações e revogação com mestre e dois jogadores separados. Integrar `auditoria-ficha-oculta-todos-consumidores.spec.md` antes de liberar nova listagem.
- Testes focados e gates proporcionais; skill verify em 1920×1080 e 360×800 com documentos e ficha abertos, foco, toque, contraste e overflow. Registrar comparação pessoal com o análogo e correções. Sem decisão visual e evidência real, permanece aberta.

## Fora de escopo

Inventário compartilhado, novas regras de equipe, composição de participantes da cena e extensão para outros tipos de cena por conveniência.
