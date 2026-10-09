# Verificação — ícones de dano, categoria de habilidade, fragmento e reação

09/10/2026. **Concluída.** Três tarefas implementadas e observadas ao vivo em duas passadas (a segunda fechou
os pontos que a primeira deixou em aberto).

## O que mudou

- **Catálogo (`app-icone`):** 19 nomes novos (`dano-*`, `habilidade-*`, `reacao-*`) e os dois
  fragmentos redesenhados (`fragmento-construtor` = Prisma, `fragmento-potencializador` = Cristal
  radiante; `link`/`chama` mantêm o par diamante + selo). Desenhos votados nas pranchas de
  `icones-recursos-sistema`; o miolo de cada um está em [`desenhos-aprovados.md`](./desenhos-aprovados.md).
  - Estouro duplo: o estouro interno foi gravado já escalado (0,42), sem `transform`.
  - Espada atrás do escudo: a lâmina é recortada em duas peças (cabo/guarda e ponta), sem
    `<mask>`/`id`; a rotação de 45° usa `transform` no grupo. A spec dizia "assar a geometria";
    o grupo rotacionado cumpre o objetivo (sem id) com menos risco de erro de coordenada.
- **Ponte domínio → ícone:** `frontend/src/app/shared/icone/icones-dominio.ts` (`ICONE_TIPO_DANO`,
  `ICONE_CATEGORIA_HABILIDADE`, `ICONE_REACAO`, `iconeTipoDano`, `iconeDefesa`). As telas consomem
  isto; nenhuma repete o mapa.
- **Adoção (ícone ao lado do texto, texto mantido):**
  - Tipo de dano: chip de grupo do resultado de rolagem; dialog "Receber dano" (linhas, Geral e
    resumo); resistências da ficha e da ficha resumida do encontro; faixa de resistências do
    cartão do combatente; lista de resistências/fraquezas da criatura; resistências do equipamento
    do NPC (`app-stat [icone]`).
  - Categoria de habilidade: chip da lista de habilidades da ficha; selo "Geral melhorada" do seletor.
  - Reações: tiles Esquiva/Bloqueio/Contra-ataque da ficha; ficha resumida e cartão do encontro
    (incluindo o ícone de Defesa, que faltava nesses dois); card do espectador; Bloquear/Esquivar
    do NPC (visualização, criação: atributos e revisão); Esquiva/Bloqueio da simulação do agente.
- Fora, por decisão: `<option>` de select (não aceita ícone), siglas F/B/E/Q/G do montador de
  rolagem, placeholders e textos de ajuda, chips pré-montados em texto das Regras, opções de
  formação ("Esquiva ou Bloqueio").

## Verificação

- Frontend: 235 arquivos / 3.175 testes passam (inclui `icone.component.spec.ts` com 56 casos e
  `icones-dominio.spec.ts`); build passou (o aviso de orçamento do bundle inicial é anterior);
  lint sem erros (avisos de aspas existentes).
- Ao vivo (stack do autor; campanha, agente, NPC, criatura e encontro sintéticos, removidos por
  soft delete), 1920×1080 e 360×800, tema escuro, e claro em recortes: ficha de jogador
  (reações, resistências, chips de habilidade), NPC, criatura, iniciativa (cartões, ficha resumida,
  histórico de rolagem), dialog "Receber dano", simulação do agente, passo "Atributos" da criação de NPC.
- Catálogo conferido a 16/24/40px nos dois temas em prancha renderizada a partir do próprio
  `icone.component.html`.
- **Achados só ao vivo (corrigidos):**
  1. "Receber dano": a coluna de 60px (46px no celular) cortava "Balíst.", "Explos." e "Químico" com
     reticências depois do ícone; passou a 76px/62px.
  2. Lista de fraquezas da criatura: o ícone ficou numa linha própria acima do nome (o bloco
     tipo/subtipo é uma coluna); o ícone ganhou um wrapper em linha ao lado do bloco.
  3. Resistências da ficha no celular: o ícone quebrava de linha só nas caixas cujo rótulo não
     cabia, deixando as cinco irregulares; no celular o ícone vai sobre o rótulo em todas.
- Observação sem relação com esta task: no tema claro o valor "0" de Geral (caixa de resistência)
  fica quase invisível — ver P-113.

## Segunda passada (pontos que faltavam)

Cenário sintético novo (mestre + espectador, ficha Lutador nível 6 com Faca de Ossos/Fragmento
Potencializador/Colete Leve, NPC com Colete Leve, encontro), 1920×1080, removido por soft delete:

- **Card do espectador** (usuário com papel `ESPECTADOR`): Esquiva, Bloqueio e, agora, Defesa com ícone, em
  escuro e claro. O Defesa foi acrescentado nesta passada: sem ele a linha ficava com Esq/Blo ilustrados e
  Def não.
- **Criação de NPC, Revisão** (6/6): Bloquear e Esquivar com ícone, como no passo Atributos.
- **NPC, aba Equipamento:** as cinco resistências do equipamento com o ícone do tipo.
- **Seletor "Do sistema", aba Gerais:** selo "Geral melhorada" com o ícone.
- **Fragmentos:** na lista de categorias do "Item custom", Fragmento Construtor (Prisma) e Fragmento
  Potencializador (Cristal radiante); a categoria "Fragmentos" das abas continua com o diamante genérico por
  decisão da spec. As ações Aplicar/Consumir (`link`/`chama`) mantêm o selo antigo.
- **Tema claro:** cartão e ficha resumida do encontro, "Receber dano" e card do espectador legíveis; a cor
  de Geral continua fraca (P-113).
- Avisos do build: o aviso do orçamento do bundle inicial (593,5 kB contra 450 kB, 143,5 kB acima) é
  anterior à task; a contribuição dela não foi medida isoladamente e é de poucos kB (glifos em SVG).

## Limites

Não observados individualmente: `inventario-esquadrao` (painel da campanha) e `guia-equipamento-loja`, que usam o
mesmo mapa de categoria → ícone do inventário; e o celular em escuro/claro do espectador. Cobertos por
build, lint e testes.

Evidências locais (capturas e scripts) em `.artifacts/icones-dano-habilidade-fragmento-reacao/`,
ignorada pelo Git; não vêm no clone.
