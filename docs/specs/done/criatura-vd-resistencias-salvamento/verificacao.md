# Verificação — criatura-vd-resistencias-salvamento

Data: 2026-11-26. Capturas em `.artifacts/criatura-ficha-usabilidade/` (`antes/` e `v1/`). Ficha usada: cópia
de teste de O Ausente (#32), aberta pelo admin de teste; as fichas do autor não foram tocadas.

## Ao vivo

- **VD** (`1920×1080`): 45 → 50 deu Vida 2.750/2.750 e Defesa 40; 50 → 45 voltou a 2.475 e 37; recarregar
  manteve. Antes da mudança O Ausente estava com Vida 1.650 (ajuste manual) — sobrescrito pela fórmula,
  como decidido.
- **Salvamento recusado**: VD 20 → servidor responde 400 ("custo total 60 excede o limite 40"); cabeçalho
  "NÃO SALVO", aviso fixo com o motivo, orçamento "60 / 40 pts" em vermelho e "Passa 20 pts do limite".
  Corrigir Físico para 10 pela caixa → 200, aviso some. Restaurado depois (VD 45, Físico 30).
- **Resistências** (`1920×1080` e `360×800`): selo clicável abre a caixa no lugar dele; Geral 40 mostra
  "Custa 80 pts (Geral conta 2×) · passa 20 do limite de 90" em vermelho; Remover, Cancelar e Salvar;
  segmentado de 5 tipos quebra em duas linhas no celular; "+" com 44px no celular. Fraquezas mostram
  "mín. 30"; caixa nova já começa no mínimo.
- Sem rolagem horizontal, sem erro de página nem `NG0` no console.

## Comparação visual

Análogos: o "Falha ao salvar" da ficha de NPC (cabeçalho em `--erro`), a caixa de Ataques/Habilidades da
própria criatura (`app-campo`, `app-segmentado`, ações à direita) e os selos atuais por tipo de dano.
Selo clicável é `app-botao` sem variante com a pele local por tipo — mesmo precedente dos botões de
rolagem; `app-chip` não é clicável.

## Testes

- `shared`: 78 arquivos, 1.355 testes verdes (novos: recálculo, soma de custo, mínimo da Fraqueza).
- Frontend: specs do service (VD, Tenacidade, mesmo valor/campo vazio), da lista de resistências
  (selo-botão, caixa, orçamento, custo ao vivo, mínimo). Suíte completa: 303 arquivos, 3.770 testes verdes.
- Backend (a validação passou a usar as funções novas): 82 arquivos, 1.365 testes verdes (100 pulados, como antes).
- Um `NG0100` apareceu só no teste que mudava o formulário por `patchValue` fora de evento; com clique e
  digitação reais passa, e ao vivo não houve `NG0`.

## Limites

- Ficha de Agente continua escondendo salvamento recusado (mesmo `catchError` → `ocioso`).
- "Bônus de Iniciativa —" na aba Geral não foi investigado.
