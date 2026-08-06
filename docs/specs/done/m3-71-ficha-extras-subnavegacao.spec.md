# m3-71 — Subnavegação da aba Extras da ficha

## Objetivo

Separar o conteúdo hoje acumulado na aba **Extras** da `FichaVisualizacao` em dois recortes
coerentes e imediatamente descobríveis, sem criar rota, modal ou menu contextual. A solução deve
preservar o padrão visual da navegação interna do card de Status e permanecer plenamente utilizável
em viewport mobile.

## Fonte de verdade visual

- `docs/design/DESIGN.md` e `docs/design/tema/` continuam governando tokens, tipografia, foco e
  densidade.
- A barra de abas do card de Status é o componente análogo aprovado. A nova barra deve comunicar
  hierarquia subordinada, sem competir visualmente com a navegação principal.
- Nenhum hex, fonte, raio ou breakpoint será hardcoded fora dos tokens e mixins já existentes no
  frontend.

## Entregáveis

1. Ao selecionar **Extras**, renderizar uma subbarra persistente com duas opções:
   **Identidade** e **Fragmentos**.
2. **Identidade** é a seleção inicial e reúne, nesta ordem:
   - Patente;
   - Origem;
   - Personalidade.
3. **Fragmentos** reúne, nesta ordem:
   - Fragmentos Consumidos;
   - Afinidade de Fragmentos;
   - Anomalia Biológica.
4. A troca de recorte ocorre no próprio componente e não altera URL, documento da ficha nem
   contrato compartilhado. Enquanto a `FichaVisualizacao` permanecer montada, voltar a Extras
   preserva o último recorte escolhido; uma nova montagem começa em **Identidade**.
5. Os controles da subbarra são botões semânticos, expõem o estado ativo a tecnologias assistivas,
   mantêm foco visível e não dependem somente de cor para indicar seleção.
6. Em viewport mobile, as duas opções dividem a largura disponível, têm alvo de toque mínimo de
   44 px e não produzem overflow ou rolagem horizontal. Os rótulos permanecem completos — não usar
   abreviações diferentes no mobile.
7. Modo somente leitura e modo ajustável mostram a mesma subnavegação. As ações já existentes em
   Fragmentos Consumidos e Anomalia Biológica continuam obedecendo ao `ajustavel`, sem mudança de
   regra ou permissão.
8. Cada opção exibe um ícone canônico ao lado do rótulo: agente em **Identidade** e fragmento em
   **Fragmentos**.
9. A subbarra permanece fixa dentro de Extras e somente o painel do recorte ativo rola. No desktop,
   a coluna de Status não ultrapassa a altura compartilhada pelas colunas de Agente e Atributos; em
   tablet/mobile, o painel respeita o espaço útil do viewport.

## Estado e responsabilidade

- O recorte selecionado é estado efêmero de apresentação da `FichaVisualizacao`.
- Nenhuma regra de domínio, cálculo de Afinidade, Anomalia Biológica ou remoção de fragmento muda.
- O template apenas agrupa as seções existentes; cálculos e handlers continuam nas responsabilidades
  atuais.

## Critérios de aceite

- Ao abrir Extras pela primeira vez, somente Patente, Origem e Personalidade estão visíveis e
  **Identidade** aparece ativa.
- Ao selecionar **Fragmentos**, somente Fragmentos Consumidos, Afinidade de Fragmentos e Anomalia
  Biológica estão visíveis.
- Alternar para outra aba do card de Status e voltar a Extras preserva o recorte interno escolhido
  enquanto o componente estiver montado.
- A navegação funciona por mouse, toque e teclado, com estado ativo anunciado e foco perceptível.
- Em 360 px, não há sobreposição, corte de rótulo nem overflow horizontal; cada opção mantém alvo de
  toque mínimo de 44 px.
- Os ícones aparecem nos dois controles, fora do painel rolável, e a rolagem do painel não desloca a
  subbarra.
- O comportamento é coberto por testes do componente, incluindo seleção inicial, alternância,
  preservação local e modo somente leitura.
- Build, testes e lint proporcionais passam; a aplicação real é verificada conforme a skill
  `verify`, em desktop e mobile.

## Fora de escopo

- Renomear a aba principal **Extras**.
- Mover Origem ou Personalidade para História.
- Criar menu contextual, dropdown, nova rota ou persistência da subaba.
- Alterar cálculos, DTOs, permissões ou dados persistidos da ficha.
- Refatorar outras abas ou responsabilidades não necessárias para esta separação.
