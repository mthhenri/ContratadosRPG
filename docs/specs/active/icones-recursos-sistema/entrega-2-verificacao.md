# Recursos — entrega 2 (adoção no site)

09/10/2026. **Parcial: spec permanece ativa.** Decisão do autor nesta sessão: o ícone entra **ao lado
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

## Limites (item aberto)

Não observados ao vivo: lista de campanhas do jogador (`minhaFichaResumo`), detalhe do jogador,
esquadrão da cena, custos "N Energia" no inventário e nos chips de habilidade de NPC, criação de
ficha/NPC/criatura e simulação de descanso. Estão cobertos só por build, lint e testes. A spec
não pode ser declarada concluída sem esses estados e sem a entrega 3.

## Entrega 3

Prancha de votação em [prancha-icones.html](./prancha-icones.html): tipos de dano (5 + Composto),
categorias de habilidade (10), fragmentos (2) e reações Esquiva/Bloqueio/Contra-ataque, três
opções cada. Itens do inventário, Descanso, conceitos repetidos e glifos de texto ficaram fora por
decisão do autor. Implementar só o aprovado, em task própria.
