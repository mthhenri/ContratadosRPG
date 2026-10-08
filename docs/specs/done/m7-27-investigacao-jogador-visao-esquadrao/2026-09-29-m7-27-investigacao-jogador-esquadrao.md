# m7-27 — Investigação: visão de esquadrão do jogador · plano de implementação

> **Para execução:** usar `superpowers:executing-plans` se o autor escolher execução nesta conversa. Os passos marcados com `- [ ]` registram o avanço. A spec e os gates do repositório têm precedência.

**Objetivo:** mostrar o Esquadrão na Investigação do jogador e na prévia somente leitura do mestre, sempre com o recorte do jogador observado.

**Arquitetura:** a cena real continua usando `EncontroPainelDadosService`; um componente de lista apresenta exclusivamente o recorte já decidido pelo backend. A prévia tem rota e fonte de dados próprias: usa `recuperarPreviaJogador` para identidade/fichas/membros/rolagens, os endpoints seguros de cena/documento do painel de espectador para a Investigação ativa e `recuperarFichaPreviaJogador` para a ficha completa. Nenhuma chamada normal de mestre deve alimentar a prévia.

**Tecnologia:** Angular 21 standalone/Signals, NestJS apenas se algum contrato seguro existente se mostrar insuficiente, Vitest, Postgres/Socket.IO na verificação real.

**Spec:** `docs/specs/done/m7-27-investigacao-jogador-visao-esquadrao.spec.md`. Implementação e gates registrados na spec concluída.

## Restrições globais

- Ler `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/context/CONTEXT.md`, `docs/design/DESIGN.md` e handoff do tema antes de editar.
- Reusar os primitivos `shared/ui/` com seus inputs de densidade. Se um controle necessário não couber neles, consultar o autor antes de criar variante local ou ampliar o primitivo.
- Não duplicar regra de acesso: o backend recorta `membros`, `fichas` e ficha completa. O front só apresenta e invalida.
- Toda abertura de ficha e documento na prévia usa a projeção segura do alvo; nenhuma mutação da ficha, da cena ou da campanha.
- A tarefa só fecha após teste com mestre e dois jogadores, reconexão, auditoria de ficha oculta integrada e inspeção pessoal em 1920×1080, 1366×768, 960×1080 e 360×800.
- Todo commit criado pelo agente inclui `Co-authored-by: Codex <noreply@openai.com>` e conferência do trailer gravado.

## Foco da revisão

1. Colega oculto com concessão antiga: nenhum cartão nem janela aberta; teste na tarefa 2 e cenário real na tarefa 5.
2. Colega visível sem acesso completo: carteirinha sem vitais e sem abertura; teste na tarefa 2.
3. Jogador sem ficha: Esquadrão e documentos continuam acessíveis; teste na tarefa 3.
4. Resposta antiga após revogação/troca de cena: não repõe cartão, documento ou ficha; testes nas tarefas 1, 3 e 4.
5. Mestre na prévia: nenhuma chamada aos endpoints normais de mestre e nenhum controle de escrita; teste na tarefa 4.

## Mapa de responsabilidades

| Unidade | Responsabilidade |
|---|---|
| `frontend/src/app/modules/encontro/paginas/painel/encontro-painel-dados.service.ts` | Invalidar e reler fichas/membros da cena real nos eventos relevantes. |
| `frontend/src/app/modules/cena/componentes/esquadrao-cena-jogador/*` | Apresentar o roster; recebe fichas/membros/identidade, emite id de ficha acessível; não decide permissão. |
| `frontend/src/app/modules/cena/paginas/painel-sem-iniciativa-jogador/*` | Compor seletor lateral e palco, abrir/fechar ficha alheia, preservar ferramentas/documentos/ficha própria. |
| `frontend/src/app/modules/cena/paginas/previa-investigacao-jogador/*` | Casca da prévia de Investigação em leitura, incluindo carga, invalidação e abertura segura. |
| `frontend/src/app/app.routes.ts` e `frontend/src/app/modules/campanha/paginas/detalhe-jogador/detalhe-jogador.page.html` | Rota protegida e entradas desktop/mobile a partir da prévia da campanha. |
| `docs/context/{HISTORY,CONTEXT}.md` e spec | Evidência, estado e fechamento da tarefa após os gates. |

### Tarefa 1 — Recorte atualizado ao vivo

**Arquivos:** modificar `encontro-painel-dados.service.ts` e seu spec.

**Interface produzida:** `membrosDaCampanha()` e `fichasCampanha()` permanecem as fontes públicas da cena. Novo método privado `recarregarMembros(): void` relê `CampanhaService.listarMembros(campanhaId)`.

- [ ] Escrever testes: `membroEntrou$` relê membros; `fichaRecortesAlterados$` com `membros` relê membros, com `fichas` relê fichas; ocultação/remoção refaz ambos os recortes necessários; reconexão recompõe os dois. Uma resposta atrasada não pode restaurar recorte anterior após invalidação mais recente.
- [ ] Executar somente o spec do serviço e conferir a falha esperada.
- [ ] Implementar invalidação dataless respeitando os campos do evento e uma geração por lista (ou `switchMap`) para descartar respostas obsoletas. Esboço da assinatura:

```ts
private recarregarMembros(): void {
  const geracao = ++this.geracaoMembros;
  this.campanhaService.listarMembros(this.campanhaId).subscribe({
    next: membros => { if (geracao === this.geracaoMembros) this.membrosInterno.set(membros); },
  });
}
```

- [ ] Reexecutar o spec; revisar a compatibilidade com os fluxos de Iniciativa, que compartilham o serviço.

### Tarefa 2 — Roster de Investigação

**Arquivos:** criar `frontend/src/app/modules/cena/componentes/esquadrao-cena-jogador/` (`.ts`, `.html`, `.scss`, `.spec.ts`).

**Interface produzida:** inputs `membros: readonly CampanhaMembroResumoDto[]`, `fichas: readonly FichaResumoDto[]`, `usuarioObservadorId: number | null`; output `abrirFicha: number`. Recebe apenas o recorte do observador.

- [ ] Testar: ficha própria oculta presente; colega oculto ausente; colega sem concessão só com nome/classe/avatar/condições; colega com concessão com vitais e botão; múltiplas fichas por membro; sem ficha e lista vazia. Injetar dados com `membro.fichas[].acessoCompleto` divergente da lista de resumos para provar que o resumo não amplia acesso.
- [ ] Rodar o spec e observar a falha inicial.
- [ ] Montar a lista com `ordenarMembros` + `agruparFichasPorMembro` + `montarEquipeExibicao`, filtrando `JOGADOR` e cartões existentes. Usar `app-cartao`, `app-botao` (`variante`, `estilo`, `tamanho`, `fluido`), `app-chip` e `app-estado-vazio`; botão apenas para ficha alheia `completa`. Um exemplo de decisão no template:

```html
@if (ficha.tipo === 'completa' && item.membro.usuarioId !== usuarioObservadorId()) {
  <button app-botao variante="secundario" estilo="texto" tamanho="medio" [fluido]="true"
    (click)="abrirFicha.emit(ficha.id)">...</button>
} @else {
  <div class="esquadrao-cena__resumo">...</div>
}
```

- [ ] Comparar shell, densidade e hierarquia com o Esquadrão aprovado em `detalhe-jogador`; corrigir diferenças de código antes da verificação renderizada.

### Tarefa 3 — Composição A na cena real

**Arquivos:** modificar `painel-sem-iniciativa-jogador.page.{ts,html,scss,spec.ts}`; avaliar uma API pública mínima em `ficha-flutuante.component.ts` e respectivo spec para fechar alvo removido do recorte.

**Interface consumida:** componente da tarefa 2, `dados.membrosDaCampanha()` e `dados.fichasCampanha()`. Se necessário, `FichaFlutuante.fecharSeAlvo(fichaId: number): void` fecha apenas o alvo coincidente e cancela abertura diferida.

- [ ] Testar seleção inicial `esquadrao`, alternância para `rolagens` e preservação do histórico; abertura só de colega completo; retirada de cartão e fechamento da janela após ocultação/revogação; documentos e própria ficha preservados; jogador sem ficha mantém painel lateral.
- [ ] Rodar o spec da página e observar a falha inicial.
- [ ] Colocar `app-segmentado` e dois `app-segmentado-item` acima do painel lateral. Iniciar `signal<'esquadrao' | 'rolagens'>('esquadrao')`; manter o histórico montado ao alternar se a janela de histórico exigir estado persistente. Para a ficha, resolver o alvo somente a partir do recorte atualizado e conferir `acessoCompleto` em `membros` no instante do clique.
- [ ] Em mobile, ordenar documentos, seletor/esquadrão e ficha própria; conferir o caso da janela de histórico desacoplada e os alvos de toque. Não usar CSS para criar um novo botão/cartão.
- [ ] Reexecutar specs da página e da ficha flutuante.

### Tarefa 4 — Prévia segura e somente leitura

**Arquivos:** criar `frontend/src/app/modules/cena/paginas/previa-investigacao-jogador/` (`.ts`, `.html`, `.scss`, `.spec.ts`); modificar `app.routes.ts` e `detalhe-jogador.page.html`/spec. Reusar `CampanhaProjecaoService` sem alterar sua API; backend/shared só se a verificação de contrato mostrar lacuna concreta.

**Interface consumida:** `recuperarPreviaJogador(id, alvoId)`, `recuperarCenaAtivaPainelEspectador(id)`, `listarDocumentosCenaEspectador(id, cenaId)`, `recuperarDocumentoCenaEspectador(id, cenaId, documentoId)` e `recuperarFichaPreviaJogador(id, alvoId, fichaId)`.

- [ ] Testar acesso direto à rota com resolver de prévia; cena ausente ou de outro tipo mostra vazio; Investigação ativa mostra roster/ficha/documentos/rolagens do alvo; nenhuma chamada a `FichaService`, `CenaService` ou `CampanhaService` normais. Testar invalidações e resposta antiga após troca da cena; ocultação fecha ficha alheia aberta.
- [ ] Rodar os specs e observar a falha inicial.
- [ ] Adicionar rota mais específica antes de `campanhas/:id/previa/:usuarioAlvoId`, com `autenticacaoGuard` e `previaJogadorCampanhaResolver`. Trocar os dois itens Cenas desabilitados na prévia (coluna e menu mobile) por links para a nova rota; preservar Biblioteca desabilitada.
- [ ] Na nova página, buscar a projeção do alvo e a cena ativa segura; só desenhar se `tipo === INVESTIGACAO`. Alimentar roster com membros/fichas da projeção. Buscar a ficha própria e a ficha alheia aberta sempre pelo endpoint `recuperarFichaPreviaJogador`. Renderizar `FichaCampanhaCard` com `ajustavel=false`, `podeRolar=false`, `ehMestre=false`, sem outputs de edição; mostrar a ficha alheia num `app-modal` de leitura, sem usar `FichaFlutuante`, que buscaria dados normais do mestre. Leitor de documentos usa os endpoints seguros. Recarregar as projeções nos eventos de cena, documento, ficha, membros e reconexão; descartar resultados antigos com geração/`switchMap`.
- [ ] Reexecutar specs e conferir que um link direto não expõe cena planejada nem ficha oculta de terceiro. Se for necessário ampliar contrato, registrar o motivo na spec antes de editar backend/DTOs e usar as skills `dto-conventions` e `tempo-real`.

### Tarefa 5 — Verificação integrada e fechamento

**Arquivos:** spec ativa, `docs/context/HISTORY.md`, seções afetadas de `docs/context/CONTEXT.md`, auditoria de ficha oculta; mover spec para `done/` somente após todos os gates.

- [ ] Rodar specs focados; depois build, lint e testes de `frontend`, `backend` e `shared` proporcionais ao diff, sem repetir suíte sem alteração relevante.
- [ ] Pela skill `verify`, levantar Postgres, API e Angular reais. Observar pessoalmente a cena em 1920×1080, 1366×768, 960×1080 e 360×800; alternar painéis, abrir documento e ficha; comparar com `detalhe-jogador` e com o POC A. Conferir foco, contraste, toque e overflow.
- [ ] Com mestre e dois jogadores, testar sem concessão, concessão, própria ficha oculta, colega oculto, jogador sem ficha, entrada/saída, vitalidade/condições, revogação com ficha aberta, desconexão/reconexão e correspondência exata entre sessão real e prévia do alvo. Documentar a evidência e integrar o resultado à auditoria de ficha oculta.
- [ ] Revisar diff completo com `convencoes-check`; corrigir divergências encontradas; registrar comandos/resultados e limites em `HISTORY.md` e atualizar somente o estado atual em `CONTEXT.md`.
- [ ] Somente com aceite e gates completos, mover a spec a `done/`. Conferir `git status`, trailer de cada commit criado e ausência de mudanças fora do escopo.
