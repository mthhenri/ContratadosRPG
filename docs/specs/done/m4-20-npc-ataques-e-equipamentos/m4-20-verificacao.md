# M4-20 — ataques e equipamento do NPC

Data: 2026-10-06. Gates concluídos na aplicação real (Postgres, NestJS `3100`, Angular `4300`).
Spec executada: [M4-20](../m4-20-npc-ataques-e-equipamentos.spec.md).

## Fonte, arquitetura e revisão

- Guia v4.2.0, seção Patente Equivalente, e decisões da
  [investigação](../npc-ataques-e-equipamentos-guia-v4.2.0/npc-ataques-equipamentos-investigacao.md): mestre escolhe a patente dentro
  da Categoria; nenhuma opção é assumida. Civil não recebe patente/Proteções/Explosivos.
- `inventario?` reusa `CarrinhoItemDto[]`; `patenteEquivalente?` usa `PatenteEnum`.
  JSONB/SCHEMA/OpenAPI alinhados, sem migration. Legado sem os campos permanece válido.
- `shared/regras/npc/equipamento.ts` concentra faixa, veto, limite da tabela
  `LIMITES_MODIFICACAO`, catálogo/conflitos e composição defensiva. Stats, modificações,
  escudos, bônus e resistências consomem os motores existentes de compras/agente.
- Backend valida a estrutura antes da regra pura. Services calculam as defesas efetivas
  nas listagens/invalidações; encontro recebe defesas/resistências. SQL apenas projeta
  inventário de NPC como array; consultas preservam filtros de soft delete. NPC não recebe
  orçamento, peso máximo, sobrecarga, Maestria ou Formação do agente.
- UI apresenta os resultados e encaminha ações. Bloco de equipamento e etapa inicial em
  componentes próprios; formulário existente só mantém o rascunho/confirmação. CSS novo
  próprio para a composição, sem ampliar a responsabilidade da visualização extensa.
- `NpcRolagemService` reusa o teste de atributo da M4-19 para Luta/Pontaria e o motor
  `rolarFormula` para dano, com bandeja/registro privados. Não aplica Competência ao dano,
  não infere crítico de uma rolagem anterior nem cria fórmula alternativa de ataque.
- Revisão independente encontrou teto próprio de catálogo não validado; regressões e
  correção adicionadas. Teste de leitor passou a usar arma real para provar ausência de
  rolagens. Leitura do diff e passe de convenções: DTOs em shared, regras centralizadas,
  nomes com `alterar`, sem novas cores/fontes/raios hardcoded, SQL interpolado ou controller
  com regra. OpenAPI regenerado depois do DTO defensivo e nomenclatura final.

## Comandos e resultados

| Gate | Resultado |
|---|---|
| `npm run build --workspace=shared` | passou; pacote construído antes de verificar a API |
| `npm run build --workspace=backend` | passou |
| `npm run build --workspace=frontend` | passou; PDFs/worker publicados conferidos |
| `npm run test --workspaces --if-present -- --watch=false` | shared **1.152/68 arquivos**; backend **994/53 arquivos**, **1 skipped**; frontend **3.037/215 arquivos** |
| `npm run lint` | passou, zero erros; shared 5.887, backend 4.475, frontend 27.102 avisos |
| `npm run typecheck --workspace=shared` | passou |
| `npx tsc --noEmit -p frontend/tsconfig.app.json` e `frontend/tsconfig.spec.json` | passaram; backend também verificado pelo lint |
| `npm run openapi:gerar-contratos --workspace=backend` | contrato regenerado |
| `npm run test --workspace=backend -- --run src/core/openapi/openapi.document.spec.ts` | 3 testes passaram |
| Teste focado `npc-equipamento.component.spec.ts` após ajustes finais | 10 testes passaram; compilação Angular passou |
| `git diff --check HEAD` e formatação HTML/SCSS do recorte | passaram |

Avisos não impedem os gates: lint de estilo/formatação é conhecido no repositório;
bundle inicial de produção **557,18 kB**, acima do aviso de 450 kB. Testes de frontend
em jsdom também emitem mensagens de Canvas indisponível. Nenhuma falha de suíte ficou aberta.
Após as suítes completas, os ajustes finais foram tamanho mobile, nomenclatura, contrato
gerado e Cartao na caixa dos itens atribuídos. Repetidos build frontend, lint, suíte completa
frontend (3.037 testes) e verificações reais correspondentes nos quatro viewports.

## Gate real e comparação visual pessoal

Análogos escolhidos antes das edições: `FichaInventario`, `GuiaEquipamentoLoja` e seletor
`NpcCompetencias`. Código e aplicação real inspecionados pelo agente principal. Shell de
NPC preserva duas colunas no desktop e empilhamento com detalhes em abas no mobile;
catálogo, ícones, stats/chips, hierarquia e controles mantêm a família das fichas.

| Viewport | Criação | Edição/leitura | Leitor | Estados adicionais |
|---|---|---|---|---|
| 1920×1080 | cinco Categorias, seis etapas, POST salvo | cinco Categorias, catálogo e patentes | sem editar/rolar/equipar | foco, salvando, base clara, análogos |
| 360×800 | cinco Categorias, seis etapas, POST salvo | cinco Categorias, catálogo e patentes | sem editar/rolar/equipar | foco, salvando, base clara, análogos, alvos ≥44 px |
| 960×1080 | cinco Categorias, seis etapas, POST salvo | cinco Categorias, catálogo e patentes | sem editar/rolar/equipar | foco, salvando, base clara, análogos |
| 1366×768 | cinco Categorias, seis etapas, POST salvo | cinco Categorias, catálogo e patentes | sem editar/rolar/equipar | foco, salvando, base clara, análogos |

Sem overflow horizontal nas vinte combinações; catálogo tem rolagem própria e conteúdo
inferior permanece alcançável. Inspeção pessoal confirmou densidade/hierarquia, foco visível,
contraste nas duas bases, controles/estados canônicos e ausência de aparência de formulário
genérico. Capturas de elemento comprido podem incluir barras fixas no meio da imagem;
essas barras também foram observadas nas capturas normais do viewport e não impedem rolagem.

API efetivamente usada: Botao com tamanho/variante/estilo; BotaoIcone com tamanho e rótulo;
Campo compacto com Reactive Forms; Cartao com título e ícone `cartaoIndice`; Chip, Stat,
EstadoVazio, StepInput com tamanho/min/max/rótulo/travas; NpcBlocoAcoes para salvar/cancelar.
Nenhum primitivo novo foi criado ou ampliado.

Correções encontradas durante o gate: caixas dos itens atribuídos passaram a consumir
`app-cartao`, sem copiar a receita local da lista antiga; índice vazio dos cartões do catálogo recebeu ícone canônico;
patentes passaram a usar rótulos existentes com acentos; sem patente/Civil não oferecem
adicionar modificações; seletor é desabilitado durante gravação. Seletores de 42 px e botão
de equipar de 34,5 px no mobile receberam a receita de alvo de toque já usada no bloco NPC;
medição e inspeção repetidas confirmaram ≥44 px. Revisão do cadastro mostra a patente escolhida.

Evidências em [capturas](../../../../.artifacts/m4-20-capturas/resultados.json), incluindo
[cadastro Elite desktop](../../../../.artifacts/m4-20-capturas/cadastro-elite-1920.png),
[edição Elite em tela dividida](../../../../.artifacts/m4-20-capturas/elite-960-edicao.png),
[leitura notebook](../../../../.artifacts/m4-20-capturas/lendario-1366-leitura.png),
[mobile claro](../../../../.artifacts/m4-20-capturas/claro-360.png),
[envio mobile](../../../../.artifacts/m4-20-capturas/salvando-360.png),
[erro de gravação](../../../../.artifacts/m4-20-capturas/erro-salvar.png) e
[análogo inventário](../../../../.artifacts/m4-20-capturas/analogo-inventario-1920.png).

## Comportamento integrado, legado e limpeza

- Cadastro: vinte documentos preenchidos/salvos pela UI e conferidos na resposta POST;
  patente e inventário preservados, Civil sem campo de patente. Busca por Colete e catálogo
  Civil não oferecem Proteções/Explosivos. Sem orçamento nem limite de peso.
- REST: patente fora da faixa retorna 400; Civil com proteção retorna 400; leitor PUT retorna
  403. Elite aceita exatamente 12/18 empilhamentos nas patentes correspondentes, rejeita
  13/19; empilhamento acima do teto próprio de Alcance também retorna 400.
- Equipar/desequipar, adicionar/remover item, adicionar modificação e salvar funcionaram.
  Cancelar restaurou o documento salvo; falha de PUT preservou rascunho e ações de recuperação.
  Envio ocupado bloqueou controles, inclusive seletores reativos.
- Mediana `3D4+FOR [Físico]` apresentou resultado na bandeja e registro REST `PRIVADA`;
  dano não recebeu Competência. [Bandeja](../../../../.artifacts/m4-20-capturas/dano-privado.png).
- Dois clientes: mestre alterou equipamento, leitor autorizado recebeu o novo estado por
  WebSocket; sentinela `window.__sentinela = 420` preservada, provando atualização sem reload.
- Legado real sem Competências/inventário/patente: GET/PUT preservaram Vida 60,
  Bloquear 17 e ausência dos campos novos. Documento foi preparado só no fixture descartável;
  aplicação não migra ou apaga configuração existente.
- Bônus de proteção apareceram como Bloquear 18 (base manual 17 + 1), resistência Física 5
  e Balística 3; PUT manteve base 17. Motor compartilhado e testes cobrem listagens/encontro.
- Limpeza: API excluiu os fixtures principais; resíduos das tentativas de cadastro e análogo
  foram conferidos por nome/posse e removidos por soft delete, junto de concessões/vínculos.
  **6 usuários, 3 campanhas, 42 fichas; zero fichas ativas** dos usuários descartáveis.
  [IDs e conferência](../../../../.artifacts/m4-20-capturas/limpeza.json). Cenários anteriores de outra sessão preservados.

Fórmulas narrativas do catálogo, como `1D3~1D6+Corpo`, são apresentadas integralmente e
sinalizadas para escolha manual; o motor existente não interpreta faixa/Corpo sem definição
contextual. A UI não oferece botão de dano inerte para esses itens nem inventa dano do Corpo
para NPC. Amplificadores/fragmentos, orçamento e Dano Furtivo automático permanecem fora do escopo.
Nenhum gate obrigatório da M4-20 permanece aberto.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
