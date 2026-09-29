# Verificação — cena e documentos do espectador

Data: 2026-09-29. Escopo: `espectador-documentos-cena` e pré-requisito
`fix-espectador-cenas-sem-iniciativa`, autorizado pelo autor. Alterações da tarefa paralela
`jogador-acesso-somente-cena-atual` foram preservadas.

## Implementação e revisão

- Projeção própria resolve somente a cena ativa. `encontroAtivo` deriva dela; um encontro anterior
  não substitui a cena atual. Tipo com iniciativa usa `cenaTemIniciativa` de shared.
- Lista e leitura direta exigem espectador ou mestre em prévia, campanha correspondente,
  Investigação ativa, vínculo existente e documento revelado. Ocultos retornam 404; jogador e
  não membro são recusados. Prévia nunca recupera documento com privilégio de mestre.
- Componente de documentos extraído da página já extensa: lista, seleção, leitor e cancelamento
  vivem em `DocumentosCenaEspectador`. Página apenas resolve cena e compõe agentes/rolagens.
- DocumentoCartao, LeitorDocumento, Cartao, Modal, Botao, EstadoVazio e Esqueleto reutilizados;
  sem controles de escrita, foco imposto ou presença de outros leitores.
- Eventos são sinais para refetch autorizado, filtrados por campanha/cena; cancelamento e geração
  impedem respostas antigas. Revogação notifica somente sockets afetados, limpa conteúdo e cancela
  cargas de painel/rolagens em voo. DTO do evento contém apenas campanhaId.
- Revisão dos arquivos alterados contra specs, arquitetura e convenções; nenhum novo SQL,
  fórmula, primitivo ou regra de jogo. APIs de componentes existentes preservadas.

## Aplicação real e comparação visual

Stack local: Postgres, API 3100, Angular 4300. Contas separadas de mestre, jogador e espectador;
prévia do mestre em contexto separado. Cenário descartável registrado em `cenario.json` (sem
credenciais). Principal inspecionou pessoalmente as capturas e a composição renderizada.

Análogos: `PainelEncontroEspectador` para shell e iniciativa;
`PainelCenaSemIniciativaJogador` para lista/modal; `EspectadorFichaCard` para agentes.
Comparação confirmou identidade, densidade, hierarquia, ícones, tokens e controles canônicos.
Correções durante inspeção: índice do cartão recebeu ícone biblioteca; cartões de documentos
ocupam a coluna; grade de agentes tem largura suficiente para rótulos de recursos;
carregamento é anunciado no contêiner, respeitando Esqueleto decorativo.

Viewports: **1920×1080, 1366×768, 960×1080 e 360×800**. Sem overflow horizontal.
Texto e imagem legíveis em modal; fechar e expandir usam controles canônicos com alvo de toque;
foco de teclado visível; contraste segue os tokens aprovados. Capturas nesta pasta:
`cena-*.png`, `desktop-*.png`, `mobile-*.png`, `analogo-*.png`, `carregando.png`, `falha.png`, `vazio.png`.

Verificado com a aplicação real:

- Texto e imagem revelados abrem em real/prévia; oculto não aparece e URL direta recusa ambos.
  Recuperação geral oculta e ação de foco também recusadas ao espectador.
- Apresentar não abre modal; alterar atualiza conteúdo; ocultar/remover encerra leitura;
  reordenar reflete ordem; lista vazia usa estado próprio, tudo sem F5.
- Fechar durante resposta atrasada não reabre modal. Troca A→B e cena durante leitura cobertas
  também por testes de respostas antigas.
- Desconexão real do transporte, ocultação pelo mestre e reconexão eliminam leitura antiga.
- Remover espectador encerra modal imediatamente e a consulta posterior retorna 403.
- Lista em carregamento, erro HTTP controlado e tentar novamente renderizados e percorridos.
- Investigação → Resistência → Combate → Investigação → encerrar, sem F5. Documentos somente
  em Investigação; Combate preserva iniciativa; encerramento apresenta ausência de cena.
- **Zero erros JavaScript** nas páginas observadas.

## Gates automatizados

- `npm run test --workspace=shared`: **772 testes passaram**, 52 arquivos.
- `npm run test --workspace=backend`: **804 testes passaram**, 41 arquivos.
- `npm run test --workspace=frontend -- --watch=false`: **2542 passaram; 2 falharam**.
  As duas falhas pertencem à navegação do jogador modificada em paralelo:
  `encontro-painel-dados.service.spec.ts` espera voltar ao hub em 403 e
  `painel-jogador.page.spec.ts` espera "Voltar às cenas"; implementação paralela usa campanha.
  Nenhum desses arquivos foi corrigido/revertido nesta tarefa. Testes de espectador, documentos,
  tempo real e navegação espectadora passaram.
- Builds shared/backend e frontend passaram. Frontend mantém aviso de orçamento inicial:
  551,92 kB versus 450 kB (limitação conhecida P-004).
- `npm run lint`: **zero erros**, avisos legados de estilo permanecem.
- Recorte frontend final (painel, documentos, campanha espectadora e tempo real): **72/72**;
  build repetido após o último ajuste; lint dirigido sem erros. Busca mecânica no patch não
  encontrou hardcodes de cor/fonte/raio, estilo inline, formulário legado, process.env ou nomes
  atualizar. DTOs novos ficam em shared; controllers permanecem delegadores.
- OpenAPI regenerado antes da suíte backend; contratos validados pelos testes.

Aceites destas duas specs verificados. Pendência externa: atualizar os dois testes de navegação
na tarefa paralela. A correção geral do leitor do mestre na Investigação permanece na spec própria;
esta implementação integra cancelamento/seleção seguros no novo leitor espectador.

## Conferência do commit — 2026-09-29

Preparado somente o recorte desta tarefa, inclusive hunks separados de CenaService,
CenaDocumentoService e contexto. Exportado o index para uma cópia temporária, preservando o
working tree compartilhado. Nessa versão isolada, **backend 787/787**, **frontend 2541/2541** e
build backend passaram. As duas falhas da execução integrada anterior pertencem portanto às
mudanças paralelas que ficaram fora deste commit. `git diff --cached --check` passou.
