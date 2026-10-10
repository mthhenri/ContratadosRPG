# RV-02 — decisão de apresentação dos bônus

Status: quebra opcional autorizada pelo autor nesta conversa em 10/10/2026;
implementação concluída e verificada. Nenhum contorno local de CSS.

## Análogo e causa

Análogos: bônus curtos de Lutador e painéis de Experimento Bestial/Artificial.
Manter `app-cartao`, título/ícone de identidade, quadro de saúde, painel de duas
colunas (270px + conteúdo), gap existente e habilidade inicial no destaque.
Chip sutil: mono, caixa alta, tokens `--text-mute`/`--border-strong`, padding
`--space-4`/`--space-8`, sem controles, truncamento ou ícone novo.
O container recolhe para uma coluna abaixo de 720px; a região de bônus continua
flexível, com gap `--space-8` e um selo por bônus.

Aplicação real (`verify`, navegador Codex): os dois bônus do Híbrido medem
295,20px cada, contra 225px disponíveis em 360×800 e 270px em 1920×1080.
`Chip` usa `white-space: nowrap` e só oferece variante, severidade e tom;
não existe input para quebra. `flex-wrap` do consumidor só passa selos inteiros
para outra linha. Aumentar a largura da coluna não resolve o celular.

Texto preservado: duas ocorrências de `+1 em ESCOLHA ( exceto LUT ou PON )`.
O Acadêmico e os demais arquétipos devem ser conferidos no mesmo corte integrado.
Evidência local: `.artifacts/regras-visual-02-bonus-longos/antes-hibrido-360.png`.

## Proposta recomendada

Adicionar `[quebravel]` booleano ao Chip, padrão `false`. Quando habilitado,
host limitado à largura disponível e texto com quebra natural, alinhado à
esquerda; preservar fonte, borda, cores, padding e demais variantes. Aplicar
`[quebravel]="true"` aos bônus de subclasse e arquétipo. Um bônus continua um
chip; LUT/PON permanece visível dentro dele. Bônus curtos continuam com uma linha.
Nenhum outro consumidor muda de comportamento.

Alternativa: permitir quebra automaticamente em todos os Chips. Evita o input,
mas muda o contrato global de selo curto e exige conferir consumidores de
identidade, custo, reação e estados em outras telas; risco e escopo maiores.

Depois da decisão: implementar a API e seus testes de contrato, consumir nos
dois templates, conferir página/painel nas quatro larguras e todos os bônus,
rodar gates proporcionais e fechar apenas após inspeção pessoal integrada.
