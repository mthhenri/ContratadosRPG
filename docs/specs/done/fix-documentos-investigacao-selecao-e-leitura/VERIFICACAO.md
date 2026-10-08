# Seleção e leitura dos documentos da Investigação — 2026-09-29

Spec: `docs/specs/done/fix-documentos-investigacao-selecao-e-leitura.spec.md`.
Verificação pela skill `verify`, com PostgreSQL local, NestJS e Angular reais em
`localhost:3100`/`localhost:4300`. Mestre e jogador em contextos Chromium separados,
com sessões autenticadas; sem substituição da aplicação por mockup.

## Implementação e causas

- `DELETE /cena/:id/documento/foco`, contrato explícito em shared, mestre-only e bloqueado
  para cena encerrada. Não revela, remove nem emite. Segundo clique no focado chama a limpeza.
- A troca de foco libera o índice único parcial antes de marcar o novo vínculo, na mesma
  transação, serializada pela linha da cena. O UPDATE anterior podia falhar conforme a ordem
  física dos vínculos. `null` significa ausência de foco; nenhum id fictício.
- `CenaDocumentoLeituraService`, provido por painel, concentra a carga cancelável e os estados
  do leitor do mestre e do modal do jogador; não compartilha seleção com a Biblioteca.
  Fecha/cancela em troca, fechamento e perda de acesso; falha recuperável mostra estado vazio
  e botão canônico. Assina `documento:alterado` e `reconexao$` para o documento escolhido.
- A listagem da cena também acompanha `documento:alterado`. Geração de requisição impede que
  um GET anterior ou resposta de escrita anterior à invalidação restaure documentos antigos.
  Trocar a cena limpa a lista antes de publicar a nova identidade. Falha de escrita relê a lista.

## Sequências observadas ao vivo

| Sequência | Evidência e resultado |
|---|---|
| A texto → B imagem → A → segundo clique → recarregar cena | Conteúdo corresponde à seleção; foco limpo persistido; leitor ausente após recarregar. |
| Focar oculto; apresentar; trocar foco | Foco não revela nem abre o jogador; apresentar revela e só adiciona o cartão; trocar foco não muda a leitura alheia. |
| A com resposta retida → B → liberar A | Interceptação da resposta HTTP real no mestre; B continua no leitor, A não reaparece. |
| Jogador abre A com resposta retida → fecha o modal → libera A | Leitor permanece fechado, sem esqueleto permanente. |
| HTTP 500 controlado → Tentar novamente, nos dois papéis | Estado de erro legível; nova recuperação abre o conteúdo; alvo mobile ≥44px. |
| Jogador lê A → mestre altera Markdown | Conteúdo novo chega pelo evento, sem recarregar a página. |
| Mestre lê B → substitui PNG | URL e imagem do leitor aberto mudam para o arquivo novo. |
| Ocultar/remover documento aberto | Jogador perde o leitor; mestre continua lendo ao ocultar e fecha ao remover. |
| Remover vínculo focado → reabrir cena | Leitor fecha; foco não reaparece; documento continua na Biblioteca. |
| Abrir Biblioteca flutuante em B enquanto cena foca A; reordenar vínculos | As duas seleções permanecem independentes. |
| Desconectar sockets mestre/jogador → alterar conteúdo → reconectar | Reconexão real; ambos recuperam conteúdo perdido, com sentinela JS preservada. |
| Desconectar jogador → ocultar → reconectar | A releitura autorizada fecha o modal; não mantém conteúdo sem acesso. |
| Desselecionar com agente em 360×800 | Cartão do agente e seção Agentes permanecem; sem overflow horizontal. |

O teste de reconexão desligou e religou as conexões Socket.IO reais dos clientes; o servidor
continuou disponível para gravar as alterações durante a desconexão. Não foi um disparo
sintético de `reconexao$`. A campanha, documentos e ficha temporários foram removidos por
soft delete via REST ao final; fixtures e cenas preexistentes foram preservadas.

## Comparação visual pessoal

Análogos: painel de Investigação atual (`m7-25`) para shell, hierarquia, colunas, agentes,
ícones e responsividade; Biblioteca (`m9-07`) para toggle e `aria-pressed`; estado de erro da
Biblioteca para `app-estado-vazio` compacto + `app-botao` secundário/contorno/pequeno.

O agente principal inspecionou pessoalmente as capturas reais em **1920×1080 e 360×800**,
com documentos texto/imagem, foco limpo, foco preenchido, erro e modal de leitura, além da
grade preenchida com agente. Mesma densidade e tipografia IBM Plex; mesmas superfícies,
controles e ícones; não há formulário genérico ou receita visual nova. Sem overflow horizontal.
O retry mobile mede pelo menos 44px e usa a API completa do botão; foco segue o tratamento
canônico global, e o cartão preserva `aria-pressed`. A posição acima dos agentes foi mantida
conforme a `m7-25`; a desseleção agora restitui o palco só de agentes.

Capturas principais:

- [Mestre, leitor e agentes no desktop](../../../../.artifacts/fix-documentos-investigacao/mestre-agentes-desktop.png).
- [Mestre, leitor e agentes no celular](../../../../.artifacts/fix-documentos-investigacao/mestre-agentes-mobile.png).
- [Mestre, desseleção no celular](../../../../.artifacts/fix-documentos-investigacao/mestre-desselecionado-mobile.png).
- [Jogador, leitura no celular](../../../../.artifacts/fix-documentos-investigacao/jogador-leitura-mobile.png).
- [Jogador, erro recuperável no celular](../../../../.artifacts/fix-documentos-investigacao/jogador-erro-mobile.png).
- [Mestre, imagem alterada](../../../../.artifacts/fix-documentos-investigacao/mestre-imagem-desktop.png).

## Gates e revisão

- `npm run test --workspace=shared`: **773 passaram**.
- `npm run test --workspace=backend`: **815 passaram, 1 opt-in ignorado** na suíte comum.
  `$env:TESTAR_POSTGRES_FOCO='1'; npm run test --workspace=backend -- src/modules/cena`:
  **64 passaram**, incluindo PostgreSQL real com tabelas temporárias e índice único parcial,
  sequência B→A→B→A→null→null. Contrato shared e rota/controller também cobertos.
- `npm run test --workspace=frontend`: **2566 passaram**, incluindo regressões do leitor,
  segundo clique, DOM do jogador, troca de cena, escrita atrasada e recuperação de falha.
- `npm run lint`: **0 erros**, avisos de convenção no código existente; lint focal das últimas
  alterações também saiu sem erros. Sem hardcodes visuais novos, tooltip nativo ou estilo inline.
- Builds de shared, backend e frontend passaram. Frontend mantém o aviso de budget inicial:
  **551,92kB**, acima do limiar de aviso de 450kB, abaixo do limiar de erro; budget não foi alterado.
- HTML/SCSS tocados passaram pelo formatador do projeto; diff completo lido contra a spec,
  SQL/DTO/controller e arquitetura; `git diff --check` limpo.
- `npm run openapi:gerar-contratos --workspace=backend`: contrato da nova rota atualizado,
  preservando alterações concorrentes. A suíte OpenAPI passou depois da regeneração.
- Revisão independente encontrou duas corridas adicionais (troca de cena e resposta atrasada
  de escrita); regressões reproduziram as falhas antes das correções, e a revisão final confirmou
  resolução. Verificação integrada pelo agente principal, não delegada como substituto do gate.

Sem pendência obrigatória desta spec. Avisos de canvas/PointerEvent do ambiente jsdom, avisos
de estilo do lint e aviso de bundle não impediram os gates. A primeira suíte integrada apanhou
o OpenAPI antes da regeneração e os testes novos mirando um modal da ficha; o contrato foi
regenerado e os seletores delimitados ao modal de documentos, com suites finais verdes.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
