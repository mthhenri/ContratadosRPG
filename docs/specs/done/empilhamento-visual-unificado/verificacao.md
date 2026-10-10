# Verificação — empilhamento visual unificado

Spec: [empilhamento-visual-unificado.spec.md](../empilhamento-visual-unificado.spec.md).
Capturas locais em `.artifacts/empilhamento-visual-unificado/` (ignoradas pelo Git).

## Entregue

- Primitivo `app-empilhamento` (`shared/ui/empilhamento/`): caixas CSS em três estados (inicial,
  comprado, vazio), `role="img"` + `aria-label`. O tom do inicial é um `color-mix()` entre
  `var(--accent)` e `var(--text)` calculado no próprio primitivo, então acompanha preset, base
  clara/escura e cor de ficha. Nas Regras (sem `atuais`) o inicial usa o accent puro. Accent
  extremo (branco no escuro, preto no claro) dobra a luminosidade do tom (escurece/clareia) para
  não ficar igual ao comprado; ajuste feito após revisão do autor, sem nova captura. Auxiliar `resolverEmpilhamentoModificacao` para mods aplicadas.
- Regras: Modificações com o primitivo, linha de custo/peso da categoria e peso próprio só quando
  difere (valores lidos do catálogo do motor, `regras-modificacoes-motor.ts`). Amplificadores
  ganharam bloco tipado (`regras-amplificadores.mjs` + renderer); a detecção ad hoc e o CSS
  `.regras-tabela--amplificadores` foram removidos. As tabelas de modificações carregam `categoria`.
- Telas de item: ficha-inventario (mods e amplificadores, inventário e catálogo), Simulação,
  inventário do esquadrão (mods aplicadas, item custom e seletor) e equipamento de NPC.
  `×N` de quantidade e contadores agregados continuam texto.
- Teste de paridade motor × documento (`scripts/regras-amplificadores.test.mjs`): nomes, iniciais e
  máximo das 7 categorias e dos 16 amplificadores batem. Nenhuma divergência encontrada.

## Casos de borda (decisões)

- Mod custom: 1 inicial, máximo = `empilhamentoMaximo` gravado (ou os empilhamentos atuais).
- Mod acima do próprio teto (`ignoraLimiteProprio`): as caixas se estendem até os empilhamentos
  atuais, para não cortar um empilhamento que o item tem.
- Excedente e De Fragmento: etiqueta/ícone preservados ao lado das caixas.
- Amplificador: caixas mostram o máximo próprio; quando o limite efetivo (patente) é menor, o texto
  `máx. N` continua ao lado. Não adquirido no catálogo mostra a prévia da 1ª compra.
- Mod sem empilhamento: uma caixa inicial.

## Gates

- `npm run test --workspace=frontend`: 81 testes de normalização + 3.201 testes de componente, verdes.
  Build de desenvolvimento verde; lint sem erros (avisos de aspas já existentes).
- Visual (agente principal, Chromium): Regras página 1920/1366/960/360, escuro e claro, preset
  vermelho, azul e dourado; painel flutuante 1920 e 360; Simulação 4 viewports com Excedente;
  ficha, esquadrão e NPC em 1920/360 (960 também) e claro no esquadrão; seletor de mods do
  esquadrão. Sem overflow horizontal. O inicial é mais claro no escuro e mais escuro no claro
  (cores computadas conferidas), distinto do comprado.

## Limites

- NPC em modo edição (step input ao lado das caixas) e o formulário de item custom do esquadrão
  não foram capturados; cobertos só por teste/leitura de código.
- Catálogo de amplificadores da ficha capturado em 1920 e 360; ficha-inventario em 1366 e a base
  clara da ficha/NPC não foram inspecionadas uma a uma.
- Contraste medido por cores computadas, não por ferramenta de razão WCAG.
- Preexistente, fora do escopo: botão "− Stack" estreito nos cartões de amplificador do inventário.
