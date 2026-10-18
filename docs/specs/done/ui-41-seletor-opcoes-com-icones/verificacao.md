# Seletor com ícones — verificação em 2026-10-17

## Entrega e autorização

O autor apontou que os ícones deveriam aparecer também nas opções abertas de
Nova cena. A versão anterior mostrava somente o valor selecionado num select
nativo. O autor aprovou expressamente criar um seletor reutilizável, conforme a
regra da biblioteca de componentes. A spec histórica da UI-41 foi preservada.

Criado `shared/ui/seletor`: seleção única com opções valor/rotulo/icone opcional,
placeholder e opções desabilitadas, integrado por ControlValueAccessor. O controle
usa Botao com variante secundario, estilo contorno e tamanho medio; exibe o valor
e o ícone selecionados. A lista é um popover nativo no top layer, mantendo a
relação com o modal nativo e escapando do overflow do dialog. Posiciona acima ou
abaixo conforme espaço, com largura do campo e rolagem quando necessário.

Teclado combobox/listbox: setas, Home/End, Enter/Espaço, Escape, Tab e localização
por letras (sem distinguir acentos). Escape cancela a navegação sem alterar o
valor ou fechar o modal. Foco permanece no gatilho; aria-activedescendant informa
a opção ativa. Clique fora/blur fecham; escolha marca touched e comunica o valor
pelo CVA. O formulário pode escrever/resetar o valor e habilitar/desabilitar o
controle. Não há escrita por socket nem novo contrato de domínio.

Nova cena usa as cinco opções do mapa aprovado, com ícones dentro da lista e no
controle fechado. Validação, DTOs e Planejar/Abrir agora preservados. Durante o
envio, o seletor fica desabilitado. Removido o toSignal usado só pelo select antigo.

## Análogos e impacto

Análogos escolhidos antes de editar: Campo da busca da Biblioteca (controle) e
MenuAcoes (painel ancorado, borda, raio e opção ativa). Inspecionados no código;
a inspeção pessoal da aplicação compara os mesmos tokens, densidade, espaçamento,
foco e hierarquia. Novo primitivo registrado no catálogo de DESIGN.md.

`npm run impacto -- frontend/src/app/shared/ui/seletor/seletor.component.ts`:
dois consumidores de produção (import e template de Nova cena) e um teste direto;
a integração é coberta também pelo teste do diálogo. Todos são pedido.

| Item compartilhado | Consumidores avaliados | Decisão |
|---|---|---|
| Seletor novo | Nova cena e seus testes | Única migração autorizada; nenhum outro select alterado |
| Botao | Gatilho do novo seletor | Reuso da API completa, sem alterar o primitivo ou seus outros consumidores |
| Icone/mapa de tipos | Cinco opções e valor selecionado | Reuso no mesmo sentido, geometrias e demais consumidores intactos |
| Regra global de asterisco obrigatório | Novo Seletor dentro de Campo | Acrescentado somente label:has(> app-seletor[data-obrigatorio="true"]); seletores anteriores intactos |
| Handoff _base.scss | docs/design/tema e runtime | Mesma adição nas duas fontes, sem alterar tokens |

O marcador público no botão é aria-required; data-obrigatorio no host serve
apenas ao seletor visual do label. Nenhuma ampliação de Campo foi necessária.
A lógica local do diálogo continua apenas montando opções de domínio; todo
comportamento genérico novo foi extraído para Seletor.

## Verificação automatizada

- Testes focados: 18 passaram em dois arquivos (Seletor e CenaCriarDialog).
  Cobrem CVA/valor externo/reset, disabled, touched, teclado, cancelamento,
  opção desabilitada, escolha por clique e todos os cinco DTOs de criação.
- `npm run test --workspace=frontend -- --watch=false`: **3.512 testes em 280
  arquivos**, mais **89 de regras de texto**, todos passaram.
- `npm run build --workspace=frontend`: passou. Aviso preexistente de orçamento
  inicial permanece (598,59 kB para limite de aviso de 450 kB).
- `npm run lint --workspace=frontend`: zero erros; 28.575 avisos de convenções no
  workspace, sem correção em massa fora do recorte.
- HTML/SCSS novos/tocados formatados. Passe `convencoes-check`: sem novo DTO/enum,
  ngModel, regra de domínio duplicada ou cor/fonte/raio literal. Estilos consomem
  os tokens existentes; controle usa a API completa de Botao.
- Revisão independente pelo subagente Codex (modelo herdado), somente leitura,
  sem achados concretos. O principal verificou pessoalmente a UI renderizada.
- `git diff --check` e `npm run repo:verificar`: aprovados na árvore local.

Shared e backend sem alterações; seus testes/builds não foram repetidos.

## Aplicação real, comparação e limites

Skill verify: PostgreSQL local, NestJS próprio em 3101, Angular em 4301 com
proxy/CORS correspondentes. Mestre e campanha temporários criados por REST;
Planejar confirmou cena Furtiva persistida em cada viewport. Campanha e conta
removidas pelos endpoints de soft delete; somente a API criada pelo roteiro foi
interrompida. Evidências locais ignoradas em
`.artifacts/ui-41-seletor-opcoes-com-icones/`.

Inspeção pessoal em **1920×1080**, **360×800**, **960×1080** e **1366×768**:
placeholder, cinco opções com SVGs, valor selecionado, destaque/foco por teclado,
fechamento por Escape sem fechar o modal, Tab, clique fora e criação da cena.
No celular foi usada sessão com isMobile/hasTouch e escolha por tap. Durante
uma requisição real atrasada no navegador, o controle ficou desabilitado e as
ações permaneceram bloqueadas; resposta concluída fechou o diálogo normalmente.

Comparação com análogos: mesma família de ícones, borda e superfícies, foco
visível, alinhamento entre ícone e rótulo, densidade de campo e opções de 44px.
Sem overflow horizontal ou lista recortada pelo modal/viewport. Placeholder e
opção ativa preservam as cores canônicas; nenhuma receita de formulário genérico.
O asterisco de Tipo continua visível e a seta aponta para baixo/para cima.

A inspeção inicial corrigiu a rotação da seta e quatro pixels de altura que
causavam rolagem desnecessária. Os testes também identificaram que o query do
botão precisava ler ElementRef explicitamente, pois Botao é um componente.
Reinspeção e testes finais passaram. O roteiro aguarda a atualização do DOM
após interações e não confunde uma recarga de desenvolvimento com defeito do produto.

Não houve auditoria com leitor de tela ou navegadores alternativos; a semântica
ARIA foi conferida por DOM e código. Nenhum outro seletor foi migrado.
