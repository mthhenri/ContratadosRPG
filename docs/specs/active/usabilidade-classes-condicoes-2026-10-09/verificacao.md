# Verificação e pendências — usabilidade e condições

**Estado: aberto.** O relatório público foi produzido e os tooltips estão implementados no
recorte descrito; a cobertura universal e os gates de interação ainda não estão comprovados.

## Fontes e arquitetura

Fonte: `docs/core/sistema-v4.1.4.md`, capítulo Condições (28 verbetes); o Guia aplica Morrendo
a NPCs como aos agentes. `regras-condicoes.mjs` extrai o texto completo da árvore normalizada.
`normalizar-regras.mjs` gera `src/app/shared/condicoes/condicoes.dados.ts` no preparo real das
Regras; chamadas de teste com destinos temporários não escrevem esse arquivo por padrão.
A consulta e a separação de termos são apresentação compartilhada do frontend, sem fórmula
nova, DTO, migração, mudança de estado/permissão ou regra de jogo duplicada.

Os templates extensos da ficha e inventário receberam apenas bindings e wrappers necessários
para o tooltip; não receberam responsabilidade de domínio. Extrair essa apresentação para
outro componente não era proporcional: os descritores e a consulta já são compartilhados,
e cada controle conserva sua ação, estado e receita de densidade existentes.

## Análogo e inspeção visual

Análogo registrado na spec antes da implementação: os tooltips canônicos de atributos e termos
existentes, implementados por `shared/tooltip/tooltip.directive.ts`. O código do análogo foi
inspecionado; os tooltips de condições usam diretamente a mesma diretiva, sem CSS ou controles
novos. Primitivos Botao/Chip e ícones existentes conservam suas variantes/classes de receita.

Inspeção pessoal nas Regras: condição no texto em 1920×1080; Morrendo no capítulo em
1366×768, 960×1080 e 360×800. Mesma casca, densidade e hierarquia da diretiva; descrição inteira
visível, foco presente e Escape fecha. Sem corte dos balões nem overflow horizontal da página
nos recortes públicos. A inspeção não certifica contraste medido nem tamanho de toque dos termos
inline; essa ergonomia segue pendente. Capturas e jornadas estão no [relatório](RELATORIO.md).

## Comandos e resultados

| Comando | Resultado |
|---|---|
| `node --test frontend/scripts/regras-condicoes.test.mjs` | 2 testes aprovados: fonte atual, efeitos/remoção e capítulo ausente |
| `npm run test --workspaces --if-present -- --watch=false` | shared: 1.157 aprovados; backend: 994 aprovados, 1 ignorado; normalizador: 70 aprovados; Angular: inicialmente 3.137 aprovados e 1 falha na expectativa antiga de Sobrecarregado! |
| `ng test --watch=false` com `--include` de inventário, RegrasInline, CartaoCombatente e Tooltip | 224 aprovados e 1 falha por espaço duplicado no texto narrativo; corrigido preservando o texto por separação compartilhada |
| `ng test --watch=false --include='src/app/modules/encontro/componentes/cartao-combatente/cartao-combatente.component.spec.ts'` | 25 aprovados após a correção |
| `CI=true NG_BUILD_MAX_WORKERS=2 npm run test --workspace=frontend -- --watch=false` | Final: 70 testes do normalizador e 3.140 Angular aprovados (234 arquivos); inclui descrições, leitura/link, gestos da diretiva e consumidores existentes |
| `npm run lint` | Três workspaces aprovados, zero erros; avisos de convenções existentes e dos arquivos alterados/gerados |
| `npm run lint --workspace=frontend` | Final: zero erros, 26.979 avisos; não atribuir todos ao legado, pois esta tarefa acrescenta arquivos |
| `CI=true NG_BUILD_MAX_WORKERS=2 npm run build --workspace=frontend` | Final aprovado; Sistema 4.1.4/Guia 4.2.0 fiéis ao Markdown; aviso de bundle inicial 589,54 kB sobre alvo 450 kB |
| Prettier sobre HTML alterados | Aplicado conforme configuração do frontend |
| `git diff --check` | Aprovado |
| `npm run repo:verificar` | Organização e espelhos aprovados |

O primeiro build restrito falhou ao buscar fontes públicas (`ENOTFOUND`); fora do sandbox,
o build habitual terminou com erro nativo `3221225477`, recorrência já registrada em P-111.
O contorno CI com dois workers passou, sem remover cache nem alterar a configuração do produto.
O primeiro teste restrito parou por EPERM no arquivo temporário; reexecução autorizada fora do
sandbox executou os testes. Os diagnósticos de navegação entre documentos do ambiente de teste
não derrubaram a suíte final.

## Gates abertos e como retomar

1. **Autorização de login local:** revisão automática rejeitou clicar Entrar com a conta de
   desenvolvimento por falta de autorização explícita. Pergunta enviada ao autor. Após resposta,
   percorrer criação/leitura de ficha, campanha, cena e encontro; comparar os tooltips pessoalmente
   nos quatro viewports, estados editável/somente leitura, condição ativa/inativa e texto longo.
2. **Ampliação do EditorMarkdown:** ainda não executada. A regra Biblioteca de componentes do
   AGENTS.md determina que ampliar um primitivo depende da decisão do autor. Pergunta enviada
   para cobrir condições dentro de descrições de habilidades/anotações, além dos labels/Regras.
3. **Mouse e toque reais:** o navegador nesta sessão oferece foco/clique, sem API documentada
   para hover ou touchscreen. Testes sintéticos da diretiva passam, mas não substituem observar
   hover, toque curto informativo e pressionar/segurar no botão. Confirmar que tocar o controle
   continua alternando a condição uma vez e que ler a dica não a altera.
4. **Acessibilidade de uso:** observar nomes e foco nos wrappers de controles desabilitados,
   leitura assistiva das descrições e ergonomia dos termos inline. Não há auditoria WCAG completa.

Commit do avanço parcial autorizado pelo autor em 09/10/2026. Sem push, publicação ou alteração
de dados de jogo. Spec e anexos permanecem em `active/`; a avaliação legada de setembro não foi encerrada.

## Passe de convenções para o commit

Revisão manual do diff e arquivos novos: descrições derivadas da fonte; helpers de apresentação
compartilhados; ações, permissões, fórmulas e contratos persistidos preservados. Recorte sem SQL,
DTOs novos, enums ou SCSS. Buscas mecânicas do patch preparado para commit conferem nomes
`alterar`, formulário standalone/reativo, ausência de `title` nativo e estilos inline novos.
Primitivos existentes continuam sendo consumidos. Os gates visuais abertos acima impedem
declarar a tarefa concluída, mas não impedem o commit parcial explicitamente autorizado.
