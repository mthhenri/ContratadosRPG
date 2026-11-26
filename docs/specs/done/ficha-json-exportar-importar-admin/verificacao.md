# Verificação — ficha-json-exportar-importar-admin

Data: 2026-11-26. Capturas e arquivos brutos em `.artifacts/ficha-json-exportar-importar-admin/` (local).

## Testes

- `shared`: build (`npm run build --workspace=shared`) limpo.
- Backend: `ficha.service.spec.ts` + `ficha-npc.service.spec.ts` — 253 testes verdes, incluindo os novos de
  `importarFicha` (criatura editada aceita onde a criação recusa; mestre não admin recusado; formato, versão,
  nome, tipo de agente e regra violada recusados; NPC importado solto sem evento de campanha). Suíte
  completa do backend: 1.365 testes verdes (100 pulados, os de sempre).
- Frontend: suíte completa com `NODE_OPTIONS=--no-experimental-webstorage` (contorno do P-138) — 303 arquivos
  verdes; sem o contorno, `app.routes.spec.ts` cai pelo mesmo P-138, alheio a esta tarefa.
- Contratos OpenAPI regenerados (`npm run openapi:gerar-contratos`), com a rota `/ficha/importar`.
- ESLint nos arquivos tocados: 0 erros; restam só os avisos de aspas/`max-len` que o acervo já tinha.

## Ao vivo

Stack do autor já em execução (frontend 4300, backend 3100 com `nest --watch`). Cenário por REST no banco
local: usuário de teste admin (`verif-json-32010`, promovido via SQL) mestre de uma campanha "Mesa Verif JSON";
usuário comum `verif-json-normal-*`. Playwright em `1920×1080` e `360×800`.

- Importar: JSON quebrado mostra "O texto não é um JSON válido." no próprio campo; o arquivo da criatura #11
  ("O Colecionador de Rostos", recusada pela criação) importa, a ficha abre em `/fichas/criatura/:id` com a
  notificação "Ficha importada" e os mesmos VD, Defesa, Vida, atributos, resistências e descrição.
- Pela API, as criaturas #10 e #11 (antes recusadas por `POST /ficha/criatura`) importam; usuário comum → 403.
- Exportar: "Baixar JSON" gera `criatura-colecionador-importado.json` com `dados` idênticos ao arquivo de
  entrada e só as chaves `formato, versao, tipo, exportacaoData, nome, cor, dados`; "Copiar JSON" põe na área
  de transferência o mesmo conteúdo e mostra "JSON copiado".
- Sem rolagem horizontal e sem erro de página nos dois viewports.

- Cabeçalho da ficha (`/fichas/criatura/:id` e `/fichas/npc/:id`, nos dois viewports): "Exportar ▾" no lado
  direito; "Baixar JSON" gera `criatura-…json`/`npc-…json` com o tipo certo e "Copiar JSON" copia o mesmo
  conteúdo. Sem rolagem horizontal nem erro de página.

## Comparação visual

Análogo: o menu ⋯ e os modais "Duplicar ficha"/"Atribuir a campanha" do próprio acervo.

- Menu: "Copiar JSON" e "Baixar JSON" usam o mesmo item (`acervo__menu-item`, ícone + texto), entre
  "Duplicar" e "Excluir"; só em criatura/NPC e só para admin. No `360×800` o menu, agora com 5 itens, abre
  para cima sem cortar (altura estimada passou a contar os dois itens).
- Topo: "Importar JSON" segue o mesmo botão de contorno de "Criar NPC"; no celular empilha em largura cheia.
- Cabeçalho da ficha: análogo é o "Publicar ▾" da Oficina (`app-menu-acoes`, variante secundária de
  contorno, tamanho pequeno). Fica dentro de `ficha-pagina__acoes`, depois da régua, como o estado de
  salvamento; no `360×800` o botão desce para a linha de baixo alinhado à direita e o menu abre ancorado à
  borda direita dele, sem cortar. A régua do cabeçalho continua (1px `--border`, medida 1.358px na criatura).
- Modal: `app-modal` com o aviso, `app-campo` + `textarea.campo__controle` monoespaçado, e ações
  Importar (primário) / Escolher arquivo / Cancelar com a receita `dialogo__acao` dos modais do acervo; no
  celular as ações ocupam a largura toda com alvo de toque.

## Limites

- Ficha de Agente fora de escopo. Imagem e enquadramento não viajam no arquivo.
- Seleção de arquivo pelo botão "Escolher arquivo" não foi exercitada ao vivo (o Playwright preencheu o campo
  de texto); a leitura do arquivo usa `File.text()` e cai no mesmo caminho.
- Dados de teste ficaram no banco local: os dois usuários de teste e as fichas importadas do admin de teste.
