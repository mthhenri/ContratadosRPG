# M4-10 — refinamento mobile de criatura e NPC

Data: 2026-09-30. **Implementação e gates concluídos.** Spec em `done/`.
M4-09 enviada em `03926a60` antes desta task. Autor autorizou ampliações dos
primitivos e commit/envio separado da M4-10.

## Corte e análogos aprovados

Guia de jogador/criatura: shell, progresso, navegação inferior, resumo e densidade.
Fichas de jogador/criatura e `FICHA-NPC.md`: hierarquia, recursos, edição, abas e ações.
CampanhaFichasEspeciais/acervo: cartões, filtros e acesso.

- NPC recebeu progresso compacto e navegação fixa mobile, com reserva de conteúdo.
  Campos e StepInput mantêm piso de toque e valores ao navegar entre etapas.
- Ambos os resumos usam `Modal[posicao="inferior"]`: folha inferior apenas no
  mobile, altura limitada e rolagem interna. Resumo lateral desktop conservado.
  ngTemplateOutlet mantém uma única instância ativa de cada conteúdo, sem duplicar
  entrada, cálculo ou estado de domínio.
- ValorEditavel passou da pseudoárea sobreposta para caixa real de 44px no mobile.
  BarraRecurso conserva o piso ao digitar e alinha atual/separador/máximo ao centro.
- ColunaAcoes conserva largura mínima de 44px por item e rolagem interna; página
  de criatura reserva espaço da barra, incluindo scrollbar.
- Modificadores/passos de Vida consomem Botao com tamanho/variante/estilo; retrato
  usa BotaoIcone com tamanho/nome acessível e arquivo acionável pelo teclado.
  Registro/inputs e cards de nomes longos receberam ajuste mobile.
- Nenhuma regra, fórmula, DTO, endpoint, permissão ou persistência de domínio mudou.
  Responsabilidades continuam nos consumidores/primitivos existentes; páginas
  extensas só importam apresentação e reutilizam o estado existente. Ampliações
  ocorreram após decisão explícita do autor.

## Gates de código

| Checagem | Resultado |
|---|---|
| `npm run test --workspace=frontend -- --watch=false` | **2703 testes passaram, 195 arquivos** |
| Focados: Modal, ValorEditavel, BarraRecurso e assistentes | **55 passaram** |
| Teste novo de Modal inferior | falhou antes da API; passou depois, provando foco/Escape/body lock |
| `npm run build --workspace=frontend` | **passou**; inicial 556,30 kB; P-004 preexistente, orçamento 450 kB |
| `npm run lint --workspaces --if-present` | **zero erros nos três workspaces**, avisos legados |
| Lint frontend final + ESLint das linhas novas | **zero erros**; aspas/comprimento introduzidos corrigidos; página NPC sem avisos |
| `git diff --check` e leitura manual completa | sem whitespace inválido ou atalho de domínio/arquitetura |
| Revisão independente read-only do recorte | **sem achados acionáveis**, nenhum risco residual concreto |

Build encontrou tamanho inexistente do Botao na primeira rodada: corrigido para
`pequeno` e checagens afetadas repetidas. Buscas do patch: sem hex/fonte/raio solto,
title, ngModel, SQL ou DTO novos. Raios usam tokens; atributos Angular extensos
ficaram no formato canônico do Prettier. Sem reformatação em massa do código legado.
Backend/shared não mudaram; gates funcionais anteriores conservados e lint integrado
novo. Avisos jsdom de canvas e P-004/P-092 permanecem legados.

## Aplicação real e inspeção pessoal

Angular 4300, NestJS 3100 e PostgreSQL 16; Chromium com scrollbars reais e autenticação
de mestre/jogador. Viewports: **360×800, 390×844, 430×932, 960×1080, 1366×768,
1920×1080**. Agente principal inspecionou pessoalmente o corte nos seis tamanhos.

| Recorte | Estados percorridos |
|---|---|
| Criação NPC | cinco etapas; erro de identidade; atributos; habilidades/conduta vazias e preenchidas; revisão; voltar/continuar preservando valores |
| Criação criatura | doze etapas, modificadores/revisão e retomada do rascunho próprio |
| Resumos | três tamanhos mobile; largura total/piso inferior; altura ≤82dvh; Tab contido; Escape/botão/fundo fecham; body destravado e foco devolvido ao gatilho |
| Ficha NPC | cinco categorias; Civil sem Energia; listas longas/vazias; Habilidades/Conduta/Sanidade; edição/Cancelar; Cooperação; histórico lateral; leitura concedida |
| Ficha criatura | edição inline de Vida atual/máxima e registro; histórico/rodapé; upload por Enter cancelado sem salvar imagem |
| Campanha/acervo | nomes longos, reflow, filtros/acesso e oito ações alcançáveis pela rolagem da própria barra |
| Consumidores compartilhados | jogador nos seis tamanhos, sem overflow; piso inline mobile e composição desktop preservados |
| Acessibilidade visual | foco por teclado no tema claro/escuro; inputs/controles medidos; captura do estado estável, sem animação de entrada |

Comparação pessoal confirmou a mesma família visual: shell, densidade, hierarquia,
controles e iconografia dos análogos. Campos/ações usam primitivos com sua API; alvos
mobile têm 44px e não se sobrepõem. Foco/contraste observados nas bases clara/escura.
Sem overflow horizontal do documento nos cenários; conteúdo final acima das ações.
Edição do mestre/leitura do jogador continuam distintas; notas privadas não expostas.

Correções da inspeção: largura do StepInput; altura de linha excessiva nos parágrafos
de criatura; largura do Modal frente à scrollbar; alinhamento do separador de recursos
após ampliar alvos. Corrigidas e observadas novamente. Medições finais não encontraram
alvos insuficientes nos estados percorridos; arredondamento subpixel de 44px recebeu
tolerância de 0,01px no verificador, sem reduzir o piso CSS.

Evidência local ignorada em `.superpowers/`: `m4-10-assistentes-autorizado.log`,
`m4-10-fichas-autorizado.log`, `m4-10-complementos-final.log`,
`m4-10-inline-final.log`, matrizes JSON e capturas por estado/viewport. Relato do revisor
não substituiu a inspeção pessoal do principal.

## Fecho

**Nenhuma pendência obrigatória.** Cenário próprio conferido antes da limpeza: fichas
82–89, nomes M4-09/M4-10 e campanha 10, “Verificação M4-09”. Exclusão pela API canônica
usa soft delete; GETs posteriores 404 para oito fichas/campanha. Acesso temporário
revogado. Jogador usado como análogo só recebeu leitura; dados do autor preservados.

Spec em done; contexto, histórico, mapa e documentação do Modal atualizados.
Commit/envio próprios seguem pedido do autor, com coautoria Codex.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
