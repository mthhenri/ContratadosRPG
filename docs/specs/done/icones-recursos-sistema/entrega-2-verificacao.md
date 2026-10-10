# Recursos — entrega 2 (adoção no site)

> **Estado após repriorização de 09/10/2026:** rodada arquivada por decisão do autor.
> Pendências preservadas na [continuação em backlog](../../backlog/icones-recursos-glifos-e-pendencias.spec.md).
> O relato abaixo registra a rodada anterior e conserva seus limites.

09/10/2026. **Verificação ao vivo fechada na segunda rodada (abaixo); a spec segue ativa pelo
levantamento de glifos da entrega 3, mantido aberto pelo autor.** Decisão do autor nesta sessão: o ícone entra **ao lado
do texto**, não no lugar dele (a spec dizia "no lugar de"), e só onde há valor numérico; frases,
placeholders e rótulos de formulário ficam como estão.

## O que mudou

- `app-stat`: input `icone`; Vida e Energia derivam da `variante`, Defesa passa `icone="defesa"`.
  Sem efeito em `faixa`, que já tem o quadro `[statIcone]`.
- `app-barra-recurso`: ícone do recurso antes do rótulo, na cor fixa de cada recurso.
- `app-icone`: classe de host `icone--texto` (≈1em, alinhada à linha) para ícone no meio de texto.
- Consumidores de Defesa em `app-stat`: ficha e criação de NPC, criação de criatura, criação de
  ficha, simulação do agente, bloco de regras da criatura.
- Textos soltos com valor: cartões do acervo, equipe (detalhe do jogador), lista de campanhas,
  esquadrão da cena, cabeçalhos Defesa/Vida da criatura, custos "N Energia" (chips de habilidade
  de NPC e fragmentos do inventário), tile Defesa de `ficha-reacoes`.

## Verificação

- Frontend: 234 arquivos de teste passam, com testes novos do ícone em `Stat` e `BarraRecurso`;
  lint sem erros (avisos preexistentes de aspas). Dois testes do inventário quebraram por espaço
  duplo ("3  Energia") e foram resolvidos movendo o ícone para antes do número.
- Ao vivo (stack do autor, dados sintéticos removidos por soft delete), 1920×1080 e 360×800:
  simulação do agente, campanha, acervo, ficha de jogador, NPC e criatura; tema escuro e, em
  recortes, claro.
- **Achado só ao vivo:** a primeira versão saiu grande demais (13,8px ao lado de rótulo de 10px no
  `app-stat`; 17,5px na barra; 12,6px nos textos do acervo). Corrigido para acompanhar o rótulo:
  10,9px no stat, 10,3px na barra compacta, 10,8px no acervo, 7,8–9,8px nos rótulos de 8–9px.
- Coração de Vida na criatura herdava o cinza do rótulo; passou a usar `--vida`, como a barra.
- Foco/tooltip: o `appTooltip` do ícone repete o rótulo visível (ex.: "Vida"); não foi inspecionado
  o texto "N de Vida" por extenso que a spec cita para o valor.

## Limites da primeira rodada

Não observados ao vivo: lista de campanhas do jogador (`minhaFichaResumo`), detalhe do jogador,
esquadrão da cena, custos "N Energia" no inventário e nos chips de habilidade de NPC, criação de
ficha/NPC/criatura e simulação de descanso. Fechados na rodada abaixo.

## Fecho da verificação ao vivo (09/10/2026, segunda rodada)

Pedido do autor: terminar as validações visuais pendentes. Stack do autor (4300/3100), cenário
sintético por REST — mestre, dois jogadores com ficha na campanha, NPC com habilidade ativa de
custo 4 e cena de investigação ativa —, removido ao fim por soft delete (3 fichas, campanha e 3
usuários). Tema escuro; 1920×1080 e 360×800 em todos os pontos, 960×1080 no detalhe do jogador.
Medição por script do tamanho do ícone, da fonte do texto vizinho, do desalinhamento vertical
entre ícone e linha e da cor; recortes ampliados inspecionados pessoalmente.

| Ponto | Estado percorrido | Resultado |
|---|---|---|
| Lista de campanhas (jogador) | linha "minha ficha" | 11,7px / texto 12px, alinhado |
| Detalhe do jogador | aba Esquadrão; no celular via Rolagens → Esquadrão | **dois defeitos, corrigidos** (abaixo) |
| Esquadrão da cena (jogador) | painel sem iniciativa | 9,8px / 10px, alinhado |
| Inventário — catálogo de Fragmentos | Adicionar itens → Fragmentos | 11,7px / 12px; **um defeito, corrigido** |
| NPC — chips de habilidade | aba Habilidades, habilidade ativa | 10,8px / 11px, alinhado |
| Criação de NPC | etapas 1–6 com o resumo; celular com resumo aberto | 9,8px / 9px; escudo 12px (1,4em de projeto) |
| Criação de criatura | até a etapa 06 Defesa (atributos e modificadores distribuídos) | idem; Vida Máxima na etapa Saúde |
| Criação de ficha | até a etapa 04 Atributos; celular pelo modal Resumo | idem |
| Simulação de descanso | página pública | 10,9px / 10px, Vida e Energia nas cores do recurso |

Sem overflow horizontal em nenhuma página. Desalinhamento vertical entre −0,4 e +0,3px. Os
ícones dentro de texto herdam a cor do texto vizinho; os de `app-stat` e `app-barra-recurso` usam
`--vida`/`--energia`.

**Defeitos achados só ao vivo e corrigidos:**

1. Detalhe do jogador, Esquadrão: a regra `.detalhe__equipe-ficha app-icone { font-size: 12px }`,
   feita para o olho, pegava também Vida/Energia e os deixava com 13,8px ao lado de texto de 10px.
   Passou a `> app-icone`, e os dois voltaram a 9,8px.
2. Mesmo cartão a 360px: com os ícones, "Vida 14/60 · Energia 7/47" passou 10px da largura e
   cortava em "Energia 7…". Cada vital virou um trecho que não se parte e a linha quebra entre
   eles; sem corte em 360 e 960.
3. Catálogo de Fragmentos a 360px: o custo quebrava em "⚡3 / Energia". Com `nowrap`, passou 3px
   da borda, porque o rótulo não cedia espaço. O custo ficou rígido (`flex: none`, `gap: 8px`) e
   quem quebra é o rótulo; linha com 252px exatos.

Testes de `detalhe-jogador` e `ficha-inventario` passam (2 arquivos, 223 testes); ESLint sem erros
nos arquivos tocados; Prettier aprovado nos três arquivos.

**Divergência para o autor:** a spec pede `appTooltip` por extenso ("3 de Energia", "12 de Vida").
Todos os pontos usam o rótulo ("Vida", "Energia"), e em todos o texto visível já repete rótulo e
valor, então o ícone nunca é a única leitura. Fica registrada para decisão, sem mudança.

**Não verificado nesta rodada:** tema claro nos pontos novos (os ícones herdam a cor do texto, que
já é a do tema) e toque real (sem API de toque no navegador automatizado).

## Entrega 3

Prancha de votação em [prancha-icones.html](./prancha-icones.html): tipos de dano (5 + Composto),
categorias de habilidade (10), fragmentos (2) e reações Esquiva/Bloqueio/Contra-ataque, três
opções cada. Itens do inventário, Descanso, conceitos repetidos e glifos de texto ficaram fora por
decisão do autor. Implementar só o aprovado, em task própria.
