# P-102 — Referências dos documentos vigentes

Data: 2026-10-06. Execução autorizada pelo autor após o commit integrado de
P-101/01/02/03 (`767b47bf539123d51a991d376f0caf232b7c1f37`, coautoria conferida).
P-102 concluída documentalmente, sem commit próprio nesta execução.

## Escopo e correspondência

Inventariadas **299 ocorrências em 173 arquivos** de README, SCHEMA, design,
specs ativas/backlog e código corrente, incluindo 25 descrições geradas de OpenAPI.
Cada ocorrência teve uma decisão no [inventário](../../../../.artifacts/p-102/referencias.json); a aplicação
usou arquivo/linha inventariados, sem substituição global. CONTEXT e o apontamento
de Civil em PROBLEMS também foram alinhados como estado operacional.

Livros anteriores recuperados do Git em `11cd8dab^`, sem restaurá-los no workspace.
Comparação normalizada ignora imagens incorporadas, âncoras, ênfase, escapes e espaços.
No Sistema, todo o texto fora da seção de Crítico é idêntico após normalização.
Os três parágrafos alterados de Crítico foram tratados separadamente, sem atribuir
automaticamente ao livro novo as decisões legadas do motor.

| Recorte | Correspondência conferida / decisão |
|---|---|
| Jogador, progressão, Identidade, equipamentos, descanso, condições e lesões | Seções conservadas no Sistema v4.1.3; ponteiros correntes alinhados |
| Contas e Cenas | Arredondamentos 1353–1359 e Cenas 1468; índices anteriores 2027/2234 corrigidos |
| Civil | Atributos 851–852, Defesa 861–862, equipamento 865–866 e Treinamentos 921–923 conservados |
| Criatura: identidade, NA, saúde, defesa, resistências, regeneração, porte, deslocamento e dano de referência | Seções correspondentes do Guia v4.2.0 conferidas; nenhuma fórmula alterada |
| Criatura: realocação, modificadores/DT e Cadência | Correções mecânicas já concluídas na P-101; comentário de enum remove “Atributo Efetivo” e descrição de slot admite sobra no fim |
| Contra-Ataque | Comentário do cartão distingue o gatilho próprio do Guia das reações de agente; código do cartão preservado |
| NPC | SCHEMA, contrato visual e milestone registram explicitamente Competências/testes pendentes na m4-19 e investigação própria de Ataques/Equipamentos |
| Missões | Fonte do Sistema atual alinhada; roteiro continua no capítulo Guia de Criação de Missões do Guia atual |

README aponta os dois livros existentes. DESIGN mantém Sanidade como listas, sem
barra numérica. O exemplo estrutural de ataque no SCHEMA agora usa os campos **já
existentes** do DTO (`teste`, `dano`, `danoCritico`, tipo na fórmula), substituindo as
chaves documentais antigas `atributo`/`tipoDano`; não altera contrato nem migra fichas.
Seus snapshots livres não são apresentados como transcrição de “A Estátua”.

## Histórico e regras pendentes

Specs anteriores em `done/`, reviews datados e blocos antigos de HISTORY preservados.
A citação D4 do rótulo de regressão de contas permanece em Sistema v4.1.0, agora
identificada como histórica no comentário adjacente. O comentário do preset explica
que excluir Patente/Nível é decisão legada D4; no livro corrente a exclusão é
explícita em Medicinais. Revisão por contexto permanece em CONTEXT §7, sem alterar
motor, inferir dano/cura futuros ou executar a proposta descartada P-099.

Competências de NPC não foram adicionadas ao contrato/UI nesta tarefa. Dados de
Categoria não alteram atributo nem DT; as dependências da m4-19 continuam explícitas.
P-093 continua **ACEITO**; só seu índice documental antigo 2045 foi alinhado à linha 1363.
Versão interna, grafia de Porte e exemplos autorais continuam sob revisão do autor.
Nenhum livro em `docs/core/` foi alterado.

## Verificações

Resultados detalhados em [checagens](../../../../.artifacts/p-102/checagens.json).

- Comparação da emissão TypeScript sem comentários: **160 arquivos** funcionalmente
  idênticos a HEAD. A única exceção de literal é o nome documental de uma suíte;
  testes e assertivas permanecem idênticos.
- **Dois templates e dois SCSS** idênticos após retirar comentários e normalizar
  fins de linha: nenhum elemento, binding, estilo, token ou comportamento visual alterado.
- `npm run openapi:gerar-contratos --workspace=backend`: geração oficial, sem edição
  manual do arquivo gerado. **129 operações e 273 schemas anteriores** preservados
  fora de descrições. Quatro schemas novos são os DTOs já implementados na P-101:
  existiam na geração de controle anterior a qualquer alteração da P-102; nenhuma
  operação passou a usá-los nesta tarefa. Comparação com essa geração confirma
  alteração exclusiva de descrições por P-102.
- `npm run test --workspace=backend -- src/core/openapi/openapi.document.spec.ts`:
  **3 testes aprovados**. `npm run test --workspace=shared --
  src/regras/rolagem/rolagem.conta.spec.ts`: **77 testes aprovados**.
  Primeira tentativa bloqueada por EPERM do sandbox, sem executar testes;
  repetição autorizada fora da restrição passou. Nenhuma falha de produto encontrada.
- Pipeline de PDFs e catálogo do leitor já apontam v4.1.3/v4.2.0. `node
  frontend/scripts/verificar-documentos-publicados.mjs`: dois PDFs e worker não vazios.
  SHA-256 dos PDFs igual em `docs/core`, `frontend/public` e saída de build existente;
  tamanhos 3.487.144 e 1.230.172 bytes. Arquivos publicados não foram recopiados.
  Servidor local não estava ativo na tentativa HTTP; validação por arquivos/pipeline
  é o gate documental deste recorte, sem nova publicação.
- Links locais novos/alterados e índices de fonte conferidos; diff revisado contra
  spec/convenções; `git diff --check` sem erros. AGENTS/CLAUDE idênticos e intocados;
  skills não alteradas.

Sem novo build, lint amplo ou gate visual: a spec dispensa build/visual para este
recorte documental, e a comparação comprova que código emitido, templates e estilos
permanecem iguais. Testes focados cobrem a regeneração da API e a suíte cujo rótulo mudou.

## Fecho

P-102 retirada de PROBLEMS e movida para `done/`; CONTEXT, MEMORY e fila consolidada
atualizados. Não há pendência técnica desta task. Revisões de NPC/crítico e editorial
autoral conservam suas tasks/decisões próprias. Arquivos temporários de inventário,
comparação e scripts de conferência removidos após guardar estas evidências.
Proposta `docs/specs/backlog/m10-regras/m10-regras-exemplao.html` preservada para a conversa M10.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
