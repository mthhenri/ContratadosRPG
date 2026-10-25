# Revisão e verificação — seed dev, NPCs e completude

## Recorte e decisões

Pedido: resetar a base local, criar NPCs nas campanhas e revisar os exemplos padrão.
Foram revisados usuários, vínculos, briefings, oito agentes, três criaturas e os NPCs novos.
Contas e campanhas já tinham os campos necessários. Os agentes tinham atributos acima do
orçamento, escolhas de habilidades ausentes e nenhum preset de Iniciativa. As criaturas
não traziam o tipo de dano nas fórmulas. Campos opcionais sem conteúdo pertinente, como
lesões, traumas e combos, continuam vazios; não foram inventadas condições para preencher listas.

Os perfis de agentes agora partem de quatro pontos de criação, distribuem a progressão e
aplicam os bônus canônicos uma vez. Pacote de quatro Gerais e escolhas de Nível são
materializados do catálogo, sem duplicações. Vida recebe as habilidades antes do cálculo.
A construção foi extraída para `agentes-dev.ts`, evitando ampliar o cenário extenso.
O helper de itens foi extraído sem mudança de comportamento, para uso nos NPCs.

NPCs: Helena/Raul/Vera na campanha do Matheus; Caio/Lia/Otávio na campanha do Codex.
Cada campanha cobre Civil, Operativo e Elite; recursos e defesas usam `shared/regras/npc`.
Identidade, competências, equipamento, habilidades da biblioteca, patente quando aplicável,
sanidade e conduta estão presentes. A resistência escolhida de Condicionamento Extremo está
registrada nas anotações do Elite. Sem compartilhamento ou rolagem pública automática.

## Impacto e convenções

`npm run impacto -- --simbolo PRESET_INICIATIVA_PADRAO`: service e seu teste são os únicos
consumidores executáveis existentes; quatro ocorrências de frontend são comentários.
Extração para `ficha-presets-padrao.ts` conserva nome, fórmula e descrição. Service e teste
importam a mesma constante; o seed usa agora essa fonte leve. Nenhuma regra de shared foi alterada.
O SQL existente de ficha permanece agnóstico do documento; somente a união TypeScript foi
ampliada para NPC. Nenhum schema, DTO compartilhado, tema ou componente visual foi alterado.
Leitura manual do diff: sem regra duplicada, SQL interpolado, efeito em banco remoto ou
alteração em telas fora do pedido. `git diff --check` aprovado.

## Operação real e aplicação

Alvo conferido antes de apagar: `localhost:5432/contratados_rpg`, container
`contratados-rpg-postgres`, volume `contratadosrpg_postgres_data`. Reset oficial removeu esse
volume, executou 40 migrations e aplicou o seed. O outro banco local não foi alvo.
As publicações existentes (Sistema 4.1.4 e Guia 4.2.0) foram preservadas em pacote e restauradas
pela ferramenta oficial; comparação canônica integral confirmou igualdade de conteúdo e metadados.
Não foram gerados ou sobrescritos os Markdown dos livros.

Contagens após reset e nova execução do seed: 5 usuários, 2 campanhas, 10 vínculos,
8 jogadores, 3 criaturas e 6 NPCs. Total de fichas permaneceu 17; zero compartilhamentos e zero
rolagens de NPC semeadas. A API autenticada mostrou três NPCs ao Codex em sua campanha e nenhum
na campanha alheia; jogador stub não recebeu NPC em nenhuma das duas campanhas.

Skill `verify`: ficha da Cabo Lia Torres aberta na rota `/fichas/npc/:id`, inspecionada
pessoalmente em 1920×1080 e 360×800 com o conteúdo já carregado: identidade, saúde,
competências e conduta preenchidos. Não há mudança visual nesta tarefa; essa sessão valida o
consumo das fixtures pelo produto existente. Capturas iniciais que ainda mostravam o carregamento
foram substituídas por capturas da rota específica de NPC com conteúdo completo.

## Gates

- Backend completo: 82 arquivos aprovados, 1360 testes aprovados, 100 testes intencionalmente ignorados.
- Shared completo: 77 arquivos, 1340 testes aprovados.
- Fixtures após o último ajuste textual: 5 arquivos, 61 testes aprovados.
- `npx tsc --noEmit -p backend/tsconfig.json` e build NestJS aprovados.
- Lint dos três workspaces: zero erros; avisos existentes do repositório.
- Frontend: 89/89 testes dos normalizadores; suíte Angular com 289 arquivos aprovados e 3610 testes aprovados, um timeout de 5000 ms no teste de destino Admin em `layout.component.spec.ts`. Repetição isolada do arquivo: 18/18 aprovados, sem alteração no frontend. A execução ampla não foi integralmente verde; a falha transitória está explicitamente preservada neste relato.
- `npm run repo:verificar`: organização e espelhos aprovados.

A primeira tentativa de testes teve EPERM no diretório temporário do sandbox; resolvido usando
TEMP/TMP dentro dos artefatos. Quatro testes HTTP do backend inicialmente tiveram EACCES no
localhost; a suíte foi repetida com acesso ao localhost e passou integralmente nos testes habilitados.

Saídas locais: `.artifacts/seed-dev-npcs-e-completude/` contém reset, testes, lint, pacote preservado,
verificação idempotente, verificação REST e capturas. O pacote não contém credenciais de acesso.


## Resultado

Entregáveis e critérios específicos da tarefa atendidos, inclusive reset real e consumo pela API.
Nenhuma pendência funcional do seed. Ressalvas dos gates: 100 testes backend ignorados pela
configuração existente, avisos de lint e o timeout transitório na rodada ampla do frontend,
cujo arquivo passou na repetição isolada. Nenhuma falha foi ocultada ou corrigida fora do escopo.
