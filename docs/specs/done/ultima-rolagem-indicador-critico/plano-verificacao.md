# Plano e verificação — Última rolagem crítica

## Plano

1. Confirmar origem autoritativa: `RolagemResumoDto.resultado`, vindo do feed já
   carregado; a primeira ocorrência da ficha continua selecionada pelos pais.
2. Registrar análogo e impacto, adicionar testes e implementar ícone e brilho canônicos.
3. Executar teste focado e revisão de convenções; entregar ao agente principal
   para gate visual pessoal e gates integrados. Não fechar a spec antes disso.

## Análogo aprovado

`shared/resultado-rolagem`: semântica de crítico usa `resultado.critico` ou
`dados[].criticos`, e o ícone `critico` aprovado. Casca, faixa, tipografia, cor
do rótulo e total seguem o próprio `EspectadorFichaCard`; a revisão autoral removeu o Chip.
O texto usa `glow.duplo`, como o total crítico de `ResultadoRolagem`; o SVG usa
o halo `drop-shadow` já existente no ícone do painel do mestre. Sem alvo interativo novo;
somente o rótulo elide; ícone e total conservam espaço. Crítico tem texto `sr-only`.

## Impacto

Busca: `npm run impacto -- frontend/src/app/modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.ts`
→ 7 consumidores e 3 testes antes da edição.

| Consumidor | Classe | Decisão |
|---|---|---|
| `campanha-fichas-especiais.util.ts` | pedido | Só importa tipo; nenhum efeito funcional. |
| `campanha-fichas-abas.component.ts/html` | pedido | Esquadrão e NPC recebem última rolagem; mesmo indicador. |
| `detalhe-mestre.page.ts` | pedido | Uso/tipos de campanha preservados. |
| `espectador.page.ts/html` | pedido | Mesmo card e efeito, quando recebe última rolagem autorizada. |
| `painel-sem-iniciativa-mestre.page.ts/html` | pedido | Recebe `ultimaRolagemFicha`; acompanha o indicador no mesmo card. |
| `painel-espectador.page.ts/html` | pedido | Sem `ultimaRolagem`, não exibe indicador. |

O agente principal confirmou expressamente que os usos do mesmo card estão
cobertos pelo pedido. `npm run impacto -- --icone critico` identificou uso direto
em `ResultadoRolagem`, ações da ficha e falso positivo no tipo `critico` de
vitalidade do card. Nenhum desses arquivos/ícone foi alterado.
`npm run impacto -- frontend/src/app/shared/ui/chip/chip.component.ts` identificou
76 consumidores e 1 teste; todos preservados. O consumo temporário foi removido
por pedido do autor. Nenhum primitivo foi alterado. O mapa do mixin `glow` retornou dois consumidores: `ResultadoRolagem` (preservado) e este card (pedido).

## Evidência e pendências no repasse do subagente

Estas pendências do repasse foram encerradas pelo agente principal;
[resultado final, inspeção pessoal e gates](verificacao.md).

- Teste focado: `npm exec --workspace=frontend -- ng test --watch=false --include=src/app/modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.spec.ts`
  passou após a revisão autoral sem Chip: 1 arquivo, 18 testes. Confere ícone
  antes do nome/total, classe crítica de brilho, identificação acessível e remoção
  de ícone/classe na rolagem comum ou ausente. A primeira tentativa falhou antes de executar
  testes por EPERM ao renomear cache temporário do Vitest; a repetição usou
  TEMP/TMP em `.artifacts/ultima-rolagem-indicador-critico/tmp` e passou.
- ESLint focado em TS/spec/template: zero erros; avisos preexistentes de aspas
  simples e comprimento. Novas linhas foram alinhadas às convenções sem
  reformatar o arquivo inteiro.
- Revisão manual do diff: mantém seleção da última rolagem no pai, não calcula
  regra nem altera resultado. Sem hardcodes novos de tema, API ou permissões.
  `git diff --check`: sem erros (somente aviso de conversão CRLF no Windows).
- Gate visual: pendente; responsabilidade do agente principal em 1920×1080 e
  360×800. Verificar ícone + brilho crítico, comum e vazio, inclusive rótulo longo e tempo.
- Build/lint/repo: pendentes no gate integrado.
- Aprendizado da inspeção inicial do agente principal: aguardar atualização de
  estado Angular após registrar a rolagem. O rótulo longo já elidia em 360 sem
  overflow; a revisão atual protege explicitamente o espaço do ícone e total.

## Reprodução ao vivo

No seed local, usar a conta e campanha de mestre descritas em `docs/DEVELOPMENT.md`,
aba Esquadrão. Na ficha de um
agente, registrar rolagem pública pelo montador com um dado de margem crítica;
confirmar no feed que o resultado tem crítico e observar a faixa do card.
Registrar depois rolagem pública comum da mesma ficha: o ícone e o brilho devem sumir.
Repetir pela visão do espectador e aba NPC quando houver rolagem pública
autorizada desse NPC. Resultados privados continuam seguindo o recorte existente.
Para cenário determinístico, o agente principal pode preparar rolagens locais
com resultado autoritativo conhecido; não inferir crítico apenas de total 24.
