# Verificação da prancha — recorte documental

Data: 2026-10-18. Agente: Codex (OpenAI), subagente responsável pelos anexos.
Escopo: prancha offline e mapa de adoção, sem qualquer modificação de produto.

## Executado

- `node_modules/.bin/prettier.cmd --config frontend/.prettierrc.json --write docs/specs/active/icones-criatura-vd-tenacidade/prancha-icones.html` — formatado.
- Mesmo comando com `--check` — aprovado.
- `node .artifacts/icones-criatura-vd-tenacidade/verificar-prancha.cjs` — aprovado.
  Usa `vm.Script` e DOM simulado para verificar sintaxe e execução do script,
  seis opções, duas bases por opção, escala 16/24/40, sete vizinhos existentes,
  nenhum voto inicial, voto independente por conceito, desmarcar, persistência,
  limpeza, JSON inválido, índice/tipo inválido, `null`, armazenamento bloqueado
  e alternativa de seleção manual quando o clipboard falha.
- Conferida a ausência de links/scripts remotos; a prancha é autocontida.
- `npm run impacto -- --simbolo tenacidade` e `npm run impacto -- --simbolo vd` — executados;
  mapa e pontos cegos em [adocao-proposta.md](adocao-proposta.md).

O roteiro de teste bruto fica em `.artifacts/icones-criatura-vd-tenacidade/`,
ignorado pelo Git e disponível apenas neste ambiente. Não é dependência da prancha.

## Limites e pendências

Os testes acima simulam a interação e não medem layout, contraste, traço rasterizado,
overflow, foco no navegador ou qualidade perceptiva. Nenhuma captura ou aprovação visual
é alegada por este recorte. O agente principal deve inspecionar a prancha pessoalmente
em 1920×1080 e 360×800, ambas as bases, estados sem voto/com voto, seleção/limpeza/cópia
e legibilidade em 16px; registrar a evidência e corrigir divergências antes de apresentar.

A fonte IBM Plex depende da instalação local e usa fallback sem rede. Os controles HTML
pertencem somente ao anexo offline, conforme o análogo UI-41; a implementação futura
consome `app-icone` e os controles canônicos de `shared/ui`.

A spec continua aberta: falta voto explícito, decisão de consumidores/card do mestre,
implementação e todos os gates de produto. Lint/build/testes de Angular não foram repetidos
neste subrecorte documental, pois não se alterou código do produto. O gate `repo:verificar`
e a revisão integrada ficam com o agente principal.

## Complemento de comparação após inspeção do principal

Acrescentados os glifos reais `cena-perseguicao` e `cena-resistencia`, sem alterar
as opções ou suas geometrias. A igualdade do bloco de candidatos antes/depois foi
verificada durante a edição. A prancha e a proposta registram as associações
VD A ↔ trajetória de Perseguição e Tenacidade B ↔ pilar de Resistência.
Teste estrutural/interações e formatação repetidos após o complemento, aprovados.
O complemento não muda votos já guardados nem constitui novo voto ou decisão.

## Rodada 2 — direção de nível e coração rígido

Criada `prancha-icones-rodada-2.html` com seis geometrias novas, preservando integralmente
a rodada 1 (SHA-256 do arquivo: `f303fe453fe6622e01f8812db11beac95fd4b74926db73b8a78c0d32ac9dee29`).
A direção e o alcance decididos pelo autor estão registrados em `adocao-proposta.md`.

- `node .artifacts/icones-criatura-vd-tenacidade/verificar-prancha-rodada-2.cjs` — aprovado:
  mesmas verificações estruturais/funcionais anteriores, mais chave própria de armazenamento,
  IDs de grupo exclusivos e votos da rodada 1 ignorados na rodada 2.
- Prettier aplicado e `--check` aprovado para a nova prancha.
- Os sete vizinhos reais, duas bases e escala 16/24/40 permanecem disponíveis.

O teste continua usando DOM simulado. O agente principal deve inspecionar pessoalmente
layout e legibilidade da rodada 2 em desktop/mobile, claro/escuro e estados de voto;
esta etapa não afirma que a renderização foi inspecionada pelo subagente.

## Inspeção do principal e decisões

Principal inspecionou pessoalmente a rodada 1 em 1920×1080 e 360×800, ambas as
bases e opções 16/24/40; detalhes mobile capturados em .artifacts da task, sem
corte horizontal. Confirmados hierarquia, controles de voto e família de traço.
Rodada 2 foi observada no navegador interno em 18/10, com as três opções de nível
e as três de coração, ambas as bases. Confirmação de viewport exato mobile da
rodada 2 e aplicação Angular continuam pendentes; não há aceite final do produto.

Alcance foi aprovado, mestre-card preservado. Direção de nível/coração rígido
registrada; desenhos finais ainda dependem de escolha explícita. Nenhum voto da
rodada 1 foi aproveitado automaticamente.
