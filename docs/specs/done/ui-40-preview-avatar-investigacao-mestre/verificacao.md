# UI-40 — verificação em 2026-10-17

## Implementação e decisão do autor

`EspectadorFichaCard` aplica a diretiva `PreviewAvatar` no avatar. O input
`mostrarPreviewAvatar` permite desligar o comportamento e nasce ligado. O autor
aprovou expressamente habilitá-lo também nas duas telas do espectador nesta sessão.
No painel sem iniciativa do mestre, o binding restringe a novidade à Investigação;
Resistência permanece sem preview. Os NPCs da campanha conservam o preview que já
tinham; criaturas não ganharam esse comportamento.

Foram removidos os outputs de hover do card e de `CampanhaFichasAbas`, o estado,
os temporizadores e os cálculos de posição de `detalhe-mestre` e `detalhe-jogador`,
assim como os overlays e estilos duplicados. A equipe do jogador aplica diretamente
a mesma diretiva nos dois tipos de avatar existentes. A diretiva não foi alterada.
O Acervo permanece com a implementação existente, inspecionada para regressão.

## Análogos e impacto

Análogos escolhidos antes da edição: Esquadrão da campanha do mestre, preview
reutilizável de `esquadrao-cena-jogador`/`trilha-turnos` e a própria diretiva.
Shell, densidade, hierarquia, espaçamento, ícones e controles foram preservados.
Nenhum primitivo de `shared/ui/` foi ampliado; não há controle novo.

`npm run impacto -- frontend/src/app/modules/campanha/componentes/espectador-ficha-card/espectador-ficha-card.component.ts`
levantou sete consumidores e três testes. Busca complementar por seletor/outputs
cobriu todos os templates, inclusive os dois usos de card em `CampanhaFichasAbas`.

| Consumidor | Classificação | Decisão/verificação |
|---|---|---|
| Investigação do mestre | pedido | Preview habilitado; Resistência explicitamente desligada |
| Esquadrão do mestre e NPCs da campanha | acompanha | Diretiva substitui o estado externo, preservando o preview já existente |
| Equipe do jogador | acompanha | Diretiva substitui os dois bindings de mouse e o estado próprio |
| Campanha do espectador | acompanha aprovado pelo autor | Preview habilitado e observado ao vivo |
| Painel da cena do espectador | acompanha aprovado pelo autor | Preview habilitado e observado ao vivo |
| `campanha-fichas-especiais.util.ts` e imports de tipos | acompanha | Contrato de dados inalterado |
| Acervo | controle de regressão | Sem edição; preview observado |

## Gates

- Testes focados dos cards e campanha do mestre: **76 passaram** em três arquivos.
- Suíte completa: `npm run test --workspace=frontend -- --watch=false`:
  **3.494 testes em 279 arquivos**, mais **89 do normalizador**, todos passaram.
  Inclui a diretiva e as páginas que perderam o estado próprio.
- `npm run build --workspace=frontend`: passou. Aviso de orçamento inicial já
  existente; bundle atual de 597,11 kB para orçamento de aviso de 450 kB.
- `npm run lint --workspace=frontend`: passou, zero erros; avisos antigos de
  convenções permanecem. Um local sem uso deixado no teste migrado foi corrigido.
- HTML/SCSS tocados formatados com Prettier; diff revisado com `convencoes-check`.
- `git diff --check` e `npm run repo:verificar`: passaram.

Shared e backend não foram alterados; seus builds/testes não foram repetidos.

## Aplicação real e comparação pessoal

Skills `verify` e `design-fidelity`: PostgreSQL local, backend compilado 3101,
frontend 4301, proxy e CORS casados. Cenário REST com mestre, jogador, espectador,
agentes com/sem imagem, criatura e Investigação ativa. Dados de jogo reutilizados
das fixtures existentes do backend, sem mudar fórmulas. Avatar PNG sintético.

Observados em **1920×1080** e **360×800**: Investigação do mestre, campanha do mestre,
campanha do jogador, campanha do espectador, cena do espectador e Acervo. No desktop,
preview de 300×300 com foto inteira e borda do tema, inclusive próximo à parte
direita/inferior da janela. Conferidos fechamento ao sair do avatar, rolagem real
da lista e redimensionamento. Em touchscreen, toque nos cards não abre o preview.
Fechamento ao pressionar o ponteiro e ausência de URL também são cobertos pelos
testes da diretiva/card; não se criou uma segunda implementação desses estados.

Inspeção pessoal das capturas: o preview é o mesmo do Esquadrão/Acervo, não é recortado
pelo grid e fica dentro do viewport. Mesmo shell, densidade e hierarquia; sem UI
genérica, alteração de controles/foco/contraste ou overflow horizontal. Avatares
sem imagem mantêm a aparência anterior. A equipe mobile conserva sua navegação
existente; o teste de hover dessa equipe foi feito no desktop.

O roteiro inicial tentou rolar listas que ainda cabiam na tela e selecionou um
avatar sem imagem: o cenário foi corrigido. Capturas integrais do espectador
provocavam rolagem e fechavam corretamente o preview; as evidências finais de
preview usam captura do viewport. Não foram defeitos de produto.

Evidências brutas locais, ignoradas pelo Git, em
`.artifacts/ui-40-preview-avatar-investigacao-mestre/`: capturas, roteiro e logs.
O relatório descreve os resultados sem depender desses arquivos no clone.
Contas, fichas, imagens e campanha temporárias foram removidas pelos endpoints
do produto (soft delete nas entidades).

## Fecho

UI-40 concluída. Nenhum backend, permissão ou evento de tempo real alterado.
Sem commit/deploy nesta tarefa. A UI-41 continua independente, aguardando votação.
