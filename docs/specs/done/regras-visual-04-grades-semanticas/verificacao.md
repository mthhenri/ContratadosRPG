# RV-04 — Verificação

## Referência escolhida antes da implementação

Saúde: `regras-saude` das classes/subclasses, com `Stat`, faixa semântica,
ícones de Vida/Energia, valor mono e progressão subordinada. Inspecionado no
código e no Combatente em 360×800. Cada recurso é uma unidade; duas colunas
passam a uma conforme a largura disponível, sem separar título e fórmula.

Afinidade e Alcances: cartões de módulos de `regras-grade`, com `Cartao`,
título/régua, conteúdo de leitura e espaçamento de 12px por tokens; duas
colunas passam a uma em contêiner estreito. O título do recorte fica acima
da coleção. Sem controles novos; links e busca seguem o leitor existente.
Deslocamento reutiliza `Cartao`, título de condição e valor mono destacado.

Reprodução: Saúde do Civil em 360×800 mostrou VIDA, ENERGIA e depois as duas
fórmulas. Afinidade em 1920×1080 mostrou sete células, contando o título,
e a ameaça Apocalíptica isolada na última linha. A fonte traz duas colunas
de Saúde e seis pares de Afinidade, com colunas vazias de alinhamento.

## Execução e resultados

**Concluída em 10/10/2026.** Implementação e diff completo revisados contra a
spec, convenções e fontes. Não há alteração de Markdown, regra de domínio,
shared/backend, tokens ou API dos primitivos.

O normalizador reconhece somente as três assinaturas conhecidas (Saúde do
Civil, Afinidade e Alcances), conservando cabeçalhos, linhas e células vazias
como fonte integral. Projeção explícita alimenta um componente separado:
Saúde usa `Stat` com faixa, tamanho compacto, ícone, fórmula e progressão;
Afinidade/Alcances usam `Cartao` com título e índice. “Nível de Criatura” fica
fora da coleção de seis pares. O fallback e os módulos existentes permanecem.
Deslocamento já era reconhecido como `faixas`; agora usa o mesmo `Cartao`.
Valores e textos conferidos literalmente: duas fórmulas/progressões, seis
faixas/ameaças, cinco tipos/descrições e três condições/metragens. Inclui
“superior à 30”, sem interpretar ou corrigir limites da fonte.

### Aplicação real — skill verify

SPA local em `http://localhost:4300/regras/sistema`, sem autenticação necessária.
Inspeção pessoal de todos os itens nos quatro recortes, bases escura e clara:

| Viewport | Página | Painel normal | Painel maximizado |
|---|---|---|---|
| 1920×1080 | duas bases | duas bases | duas bases |
| 1366×768 | duas bases | duas bases | duas bases |
| 960×1080 | duas bases | duas bases | duas bases |
| 360×800 | duas bases | duas bases | indisponível no mobile |

22 configurações, 88 recortes observados e capturados. Todos os itens cabem
horizontalmente, incluindo fórmulas, rótulos longos e ameaça Apocalíptica;
medições não encontraram overflow no componente nem nas unidades. Uma/duas
colunas de referências conferidas conforme largura disponível; Deslocamento
usa uma/duas/três. Rótulo e conteúdo permanecem no mesmo cartão ao quebrar.
Rolagem vertical permite observar a coleção inteira no mobile.

Comparação com Saúde do Combatente e módulos: mesma densidade de leitura,
hierarquia, caixas, índices, fontes, faixa semântica e ícones canônicos. Não
há controles novos; busca, sumário e links mantêm primitivos, foco e alvos
existentes. Na inspeção inicial, `Stat` para Deslocamento deixava a condição
discreta demais na base escura: substituído por `Cartao`. Os cartões também
receberam o índice projetado, corrigindo caixas de índice vazias antes da
matriz final. Contraste de título/conteúdo conferido nas duas bases.

Busca real no mobile: “Progressão: VIG” seleciona a nota da Vida; “superior à
30” seleciona a faixa na Afinidade dentro do painel; “8 Metros” encontra
Deslocamento e Curto Alcance na página. Próxima ocorrência leva de Deslocamento
a Alcances, anterior retorna e limpar remove todas as marcas. Destinos e
destaques selecionados conferidos pessoalmente. Teste do renderer confirma
que links internos continuam emitindo sua âncora. P-124, contraste preexistente
de marcas não selecionadas sobre fundos de ameaça, permanece fora desta task.

### Gates e revisão

- `node --test frontend/scripts/normalizar-regras.test.mjs`: 27 passaram.
- `npm run test --workspace=frontend -- --watch=false`, após os últimos ajustes:
  88 testes de normalização + 3.219 Angular, 244 arquivos, todos passaram.
  Dois avisos jsdom de navegação entre documentos, sem falha.
- `npm run build --workspace=frontend`, após os últimos ajustes: passou;
  JSONs publicados fiéis aos dois Markdown. Aviso preexistente do orçamento
  inicial: 594,01kB contra 450kB (144,01kB excedentes).
- `npm run lint`: zero erros nos três workspaces; avisos legados de shared
  (5.891), backend (4.479) e frontend (27.350). Passe final focado nos arquivos
  tocados: zero erros, somente linha 36 preexistente do modelo acima de 100 caracteres.
- Shared/backend não alterados; reutilizadas verificações anteriores da sequência
  RV (1.157 shared; 995 backend, um ignorado), sem repetir suítes idênticas.
- Revisão manual completa: reconhecimento contextual/conservador, extração
  proporcional do renderer, textos e limites preservados, sem cálculo de domínio.
  Testes cobrem associação, cabeçalhos/vazios, assinatura incompleta/extra,
  fallback desconhecido e encaminhamento de links. Busca mecânica sem cores,
  fontes/raios hardcoded, forms legados, DTO/enum local ou estilos inline.
- `git diff --check`, `npm run repo:verificar` e modo `--staged`: sem falhas.

Capturas, `medicoes.json` e logs locais em
`.artifacts/regras-visual-04-grades-semanticas/`, ignorados pelo Git.
`<base>-<largura>-<pagina|painel|max>-<recorte>.png` identifica a matriz;
`busca-*.png` registra os destinos selecionados; `build-final.log`,
`testes-final.log`, `lint.log` e `lint-final.log` registram gates.
Spec/anexo movidos juntos para `done`, P-117 removido e fila passa à RV-05.
Nenhum gate obrigatório desta task pendente. Preferência escura restaurada,
viewport temporário desfeito e aba de verificação encerrada.
