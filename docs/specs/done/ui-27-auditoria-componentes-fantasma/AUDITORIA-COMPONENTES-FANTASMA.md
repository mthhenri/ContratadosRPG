# Auditoria de Componentes Fantasma — UI-27

> Estado: **concluída** · responsável: Codex · 2026-09-03.
> Recorte: inventário estático posterior à UI-06, cobrindo os 72 templates e seus SCSS em
> `frontend/src/app`. Nenhum consumidor foi alterado nesta task.

## Resposta curta

**Sim.** Há quatro famílias que já deveriam consumir primitivos existentes, duas famílias em que
o primitivo atual precisa de uma pequena evolução e uma família recorrente que justifica um novo
primitivo. O problema não é a existência de HTML nativo: widgets de domínio (teclado da
calculadora, steppers de Vida, cartões selecionáveis, menus e controles de arquivo/cor) podem e
devem continuar locais. O componente é “fantasma” quando a marcação local volta a possuir a mesma
identidade ou o mesmo contrato já centralizado em `shared/ui`.

## Método reproduzível

Executado na raiz do repositório:

```bash
find frontend/src/app -name '*.html' | wc -l
rg -n '<dialog|dialogo__|modal__' frontend/src/app --glob '*.html' --glob '*.scss'
rg -n 'esqueleto-bloco|@keyframes.*esqueleto' frontend/src/app --glob '*.html' --glob '*.scss'
rg -n '^\.(agente-stat|calc-stat|stat)(\s|\{|,)' frontend/src/app --glob '*.scss'
rg -n '^\s*\.?cartao|\.cartao__|class="cartao__' frontend/src/app --glob '*.html' --glob '*.scss'
rg -n '(segmentado|__segmento)' frontend/src/app --glob '*.html' --glob '*.scss'
rg -l '__(vazio|estado|carregando)' frontend/src/app --glob '*.html'
```

Números de orientação, não vereditos: 72 templates, 671 elementos `<button>`, 251 usos de
`app-botao`, 36 de `app-botao-icone`, 42 de `app-cartao`, 18 de `app-stat`, 32 de `app-modal` e 3
de `app-painel-flutuante`. A queda de botões nativos em relação à UI-06 confirma adoção relevante,
mas contagem não prova composição correta.

## Achados confirmados

| Prioridade | Categoria   | Fantasma                                    | Evidência                                                                                                                                                                                                                                                                                                    | Decisão                                                                                                                                                                                                                                    |
| ---------- | ----------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0         | **ADOTAR**  | Esqueleto de carregamento                   | `perfil.page` recria `.esqueleto-bloco`, pulso e `prefers-reduced-motion`; `campanha/detalhe`, `ficha/visualizar` e `ficha/visualizar-criatura` repetem a mesma identidade em escala maior. `app-esqueleto` já declara exatamente cor, raio, pulso e redução de movimento, deixando dimensões ao consumidor. | Trocar cada `<span>` base por `<app-esqueleto class="…">`, preservar só modificadores geométricos locais e apagar quatro keyframes/bases duplicadas. Não é necessária evolução do primitivo.                                               |
| P0         | **ADOTAR**  | Cabeçalho/cartão de Iniciativa              | `painel-encontro.page` possui `.cartao__cabecalho`, `__indice`, `__titulo` e `__regua`, estrutura idêntica ao cabeçalho de `app-cartao`; o SCSS volta a possuir fonte, cor, raio e régua.                                                                                                                    | Compor os estados de abertura e encontro em `app-cartao`, usando `cartaoIndice`/`cartaoFim`. Se o corpo sem borda for requisito real, evoluir o cartão com uma variante estrutural somente depois de comparar ao vivo; não manter a cópia. |
| P1         | **ADOTAR**  | Conteúdo de modal recriando o próprio modal | Três modais em `campanha/detalhe` colocam dentro de `app-modal` outro `.dialogo__painel` com cabeçalho, título, índice, régua e ações; o primitivo já é dono do título e oferece `modalIcone`/`modalAcoes`.                                                                                                  | Projetar ícone e ações nos slots canônicos e manter local apenas o conteúdo de domínio. `compras-modal` e `guia-modal` são nomes locais de conteúdo dentro do primitivo e não foram classificados automaticamente como cópia.              |
| P1         | **ADOTAR**  | Stats da Simulação                          | Cinco páginas (`agente`, `novo-agente`, `patente`, `descanso`, `compras`) ainda mantêm `.agente-stat`/`.calc-stat`, embora `app-stat` já tenha `nota`, tamanhos e variantes que nasceram desta mesma família.                                                                                                | Migrar os casos simples diretamente. Mapear `destaque` para variante semântica existente; só ampliar `Stat` quando um caso real não couber em `rotulo`/`valor`/`nota`/`variante`/`tamanho`.                                                |
| P1         | **EVOLUIR** | Estado vazio compacto                       | `app-estado-vazio` cobre estados de página/lista com caixa tracejada e 32px verticais. Listas densas (`log-encontro`, seletor de combatentes, ataques, habilidades, resistências, combos e filtros) mantêm `<p class="…__vazio">` porque a geometria atual seria grande demais.                              | Acrescentar `tamanho="compacto"` ao primitivo, sem ícone obrigatório e com padding/tipografia próprios da densidade já observada; migrar primeiro os consumidores repetidos. Mensagens auxiliares de formulário e carregamento não entram. |
| P1         | **EVOLUIR** | Saída/ações do modal                        | Vários consumidores de `app-modal` ainda criam `.dialogo__acoes` porque o slot `[modalAcoes]` exige projeção no nível direto do modal e nem toda composição atual consegue manter seu fluxo condicional sem wrapper.                                                                                         | Auditar os 32 modais e, se confirmado o impedimento de projeção, oferecer uma diretiva/slot de rodapé que aceite o wrapper real. Não criar mais um modal.                                                                                  |
| P2         | **CRIAR**   | Controle segmentado                         | Caderno, Leitor de Documentos e Inventário da ficha implementam grupos mutuamente exclusivos, estado ativo, borda, raio, foco e responsividade localmente. `app-abas` não cabe: estes grupos alteram modo/fonte dentro do mesmo painel e usam `aria-pressed`, não `tablist`/`tabpanel`.                      | Criar `app-segmentado` + item por atributo ou diretiva, com seleção única, foco, estado desabilitado e densidade compacta. Nasce de três consumidores reais e tem papel interativo próprio.                                                |

## Candidatos rejeitados (não são fantasmas)

- **Botões sem diretiva, por si só:** teclas da calculadora, cards selecionáveis, steppers de
  recurso, swatches, gatilhos flutuantes e itens de menu expressam valor/seleção/chrome de widget;
  `app-botao` ou `app-botao-icone` apagaria seu papel.
- **Campos nativos dentro de `app-campo`:** o primitivo é invólucro, não CVA. Range, checkbox,
  arquivo e cor têm geometria nativa específica e não justificam um “input universal”.
- **Painéis laterais de Histórico e Inventário:** compartilham mecânica de reserva/transição, mas
  não são `app-painel-flutuante`: são drawers ancorados que mudam a área de trabalho. A mecânica já
  está coordenada no shell; extrair um novo primitivo agora deslocaria domínio sem eliminar uma
  terceira cópia real.
- **Cartões de domínio:** `cartao-combatente`, `cartao-ficha-acervo` e cartões selecionáveis têm
  interação e anatomia próprias. O nome “cartão” não os torna automaticamente `app-cartao`, que é
  um container de seção.

## Ordem recomendada

1. **Esqueletos** — adoção mecânica, elimina quatro implementações da mesma animação.
2. **Cartão de Iniciativa e conteúdo duplicado de modal** — violações diretas de identidade.
3. **Stats da Simulação** — maior superfície repetida; `Stat` já possui quase todo o contrato.
4. **Estado vazio compacto** — evolução pequena com muitos consumidores imediatos.
5. **Controle segmentado** — novo componente, depois de congelar a semântica dos três usos.
6. **Slot de ações do modal** — confirmar o impedimento estrutural durante a migração antes de
   ampliar a API.

Cada correção deve ganhar spec própria e gate visual em `1920×1080`, `960×1080` e `360×800`, com
o consumidor atual como análogo para preservar densidade e comportamento enquanto a identidade
migra ao primitivo.
