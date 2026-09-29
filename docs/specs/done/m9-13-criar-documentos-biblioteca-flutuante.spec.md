# m9-13 — Criar documentos na Biblioteca flutuante

## Origem e estado

Pedido do autor em 2026-09-29. Somente especificação; nenhuma implementação nesta tarefa.
Amplia deliberadamente a m9-11, que restringiu criar/editar/upload à página. Não reescrever specs em done/.

## Objetivo

O mestre consegue criar um documento utilizável sem abandonar a cena, ficha ou campanha em que abriu a Biblioteca flutuante.

## Entregáveis

- Ação “Novo documento” exclusiva do mestre no painel, também quando a lista está vazia.
- Reutilizar `DocumentoCriarDialog`: título e tipo Texto/Imagem, validações e documento inicialmente oculto.
- Texto criado abre no painel com edição e salvamento de conteúdo; imagem criada permite escolher/enviar arquivo no próprio fluxo. Criar apenas um registro vazio e mandar o mestre para outra página não atende ao objetivo.
- Compartilhar a orquestração necessária com `BibliotecaMestre`, sem duplicar criação, upload, validação, conflito de versão ou regra de revelação. Avaliar extração proporcional antes de aumentar o componente flutuante.
- Atualizar lista e seleção após criar; manter campanha, rota e geometria do painel. Cancelar não cria documento; submissão dupla não duplica registros; falha permite tentar novamente.
- Preservar rascunho e confirmar descarte antes de trocar documento, fechar o painel ou sair da tela. Minimizar/maximizar não descarta edição. Aplicar proteção equivalente à da página, inclusive conflitos 409.
- Jogador e espectador continuam somente leitura; backend mantém autorização mestre-only.

## Referências e limite

Fontes: SYSTEM.SPEC, CONVENTIONS, DESIGN, specs m9-04/m9-08/m9-11.
Análogos: BibliotecaMestre para criação/editor/upload e BibliotecaFlutuante/CadernoFlutuante para casca, densidade, estados e responsividade. Consumir os primitivos completos de shared/ui; se faltar API, perguntar ao autor.
Não acrescentar gestão de ordem ou remoção por conveniência. Importação Markdown não é requisito novo desta tarefa.

## Aceite e verificação futura

- Criar texto com conteúdo e imagem válida, salvar, reabrir e revelar sem navegar para outra tela; imagem sem arquivo permanece não revelável.
- Exercitar cancelamento, título inválido, upload inválido/falho, duplo envio, rascunho ao fechar/trocar/navegar e conflito de versão.
- Mestre e jogador/espectador em sessões separadas: oculto não aparece; revelado aparece ao vivo; criação não interrompe leitura alheia.
- Testes focados de componente/service e autorização; gates de build/lint/testes proporcionais.
- Skill verify na aplicação real em 1920×1080 e 360×800: criação, edição, upload, minimização e maximização; comparar com os análogos, foco, alvos de toque e overflow. Registrar evidência no fecho; sem isso permanece aberta.

## Fecho

**Concluída em 2026-09-29.** Relato em `HISTORY.md` ("m9-13").

- **Extração:** a edição no próprio lugar saiu da `BibliotecaMestre` para `DocumentoEdicao`
  (página e painel); o painel ganhou só a orquestração (confirmar descarte, adotar versões) e a
  store, o estado `editando`. `BibliotecaFlutuante` cresceu de 292 para 409 linhas — a lógica de
  criação, upload, validação, conflito e revelação continua em um lugar só (dialog, `DocumentoEdicao`,
  `DocumentoRevelacaoService`).
- **Além do literal da spec:** "Editar" no painel (sem ele, um `IMAGEM` criado e cancelado não teria
  como receber o arquivo sem ir à página) e o "Importar Markdown", que vem junto do componente
  extraído, sem código novo.
- **Análogos:** `BibliotecaMestre` (criação, editor, upload, conflito) e a janela da `m9-11`/Caderno
  (casca, densidade, estados).
- **Viewports/estados:** `1920×1080` e `360×800` — lista, dialog com título inválido, cancelar,
  duplo envio, falha de criação e nova tentativa, edição, minimizar/restaurar, maximizar, rascunho
  ao trocar/fechar/sair da tela, salvar, 409 + "Recarregar", revelar ao vivo para o jogador em outra
  sessão (oculto nunca visto, leitura dele não interrompida), imagem inválida/falha/válida, imagem
  sem arquivo não revelável; alvos de 44px e sem overflow no celular.
- **Ajuste na verificação:** o rodapé Cancelar/Salvar nascia cortado na janela de 680px; o editor
  passou a esticar até ele no painel (`emPainel`).
- **Comandos:** `npm run test --workspace=frontend` → 176 arquivos / 2529 testes; `ng build` sem
  erro (aviso de budget do `P-004`); lint 0 erros, sem warning novo nos arquivos tocados; backend
  `src/modules/documento` 103/103 (autorização mestre-only inalterada).
- **Pendências:** `P-091` (preexistente, registrado): cancelar sem mexer pede confirmação quando o
  Markdown salvo não termina em quebra de linha.
