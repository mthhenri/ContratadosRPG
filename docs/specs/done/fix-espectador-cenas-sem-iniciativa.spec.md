# Espectador acompanha cenas com e sem iniciativa

## Origem e classificação

Pedido de 2026-09-29: Investigação ativa não aparece para o espectador. Lacuna de integração que produz um defeito funcional frente à expectativa expressa do autor; não há evidência de uma regra que proíba Investigação para espectadores.

Análise estática: `PainelEncontroEspectador` usa `CampanhaPainelEspectadorDto.encontroAtivo` e a consulta de encontro ativo, sem resolução de cena. A navegação do painel espectador aponta para `espectador/iniciativa`. `PainelCenaShell` só bifurca mestre/jogador. O backend de cenas já admite leitura por não mestre de cenas ativas/encerradas, e `emitirCenaAlterada` encaminha esses eventos à sala do espectador; planejadas ficam exclusivas do mestre. A m8-05 cobriu encontros, enquanto a m7-25 descreve espectador com leitura equivalente ao jogador sem integrar a rota dedicada atual.

## Objetivo e entregáveis

- Resolver a cena ativa autorizada na projeção própria do espectador e oferecer acesso visível a ela no painel. Nenhuma cena ativa deve depender de existir encontro.
- Manter visão própria do espectador: com iniciativa, preservar ordem/rodada/turnos e recorte de combatentes; sem iniciativa, mostrar nome/tipo/estado da cena, agentes permitidos e rolagens públicas, sem inventar turnos ou combate.
- Derivar presença de iniciativa por `cenaTemIniciativa` em shared. Cobrir Investigação e Resistência, além de Combate/Furtiva/Perseguição.
- Não reutilizar `EncontroPainelDadosService` indiscriminadamente: não consultar membros/fichas/rotas exclusivas de mestre/jogador nem ampliar o payload do espectador.
- Consumir `cena:alterada` e reconexão com refetch autorizado; trocar cena, encerrar e voltar ao estado sem cena ativa sem F5. Garantir que encontro antigo não substitua a cena ativa.
- Conta espectadora real e prévia do mestre recebem o mesmo recorte. Planejadas, conteúdo privado, condução e edição permanecem inacessíveis por interface, REST e socket.
- Definir rota própria compatível com os links existentes; acesso direto deve obedecer às mesmas permissões. Histórico de cenas para espectador não é requisito desta tarefa.

## Aceite e verificação futura

- Abrir Investigação ativa sem encontro: espectador vê a cena. Trocar para Resistência, Combate e novamente Investigação: tela acompanha tipo e estado ao vivo.
- Cena planejada nunca aparece; encerrar remove o acesso de cena ativa e mostra estado vazio apropriado. Reconexão e acesso direto refazem projeção correta.
- Testar autorização e projeção backend, roteamento e eventos frontend; gates proporcionais.
- Skill verify com mestre e espectador real separados e prévia do mestre, 1920×1080 e 360×800. Análogos: PainelEncontroEspectador para identidade e PainelCenaSemIniciativaJogador para composição sem turnos; agentes continuam usando projeção espectadora. Registrar comparação visual e estados.

## Dependência

A leitura de documentos vinculados é especificada separadamente em `espectador-documentos-cena.spec.md`. Esta tarefa fornece a resolução de cena, sem ficar bloqueada pelo leitor.

## Fecho — 2026-09-29

Implementada com o leitor espectador, por autorização do autor. Cena ativa projetada sem encontro;
rota compatível e acesso "Cena atual" para espectador e prévia. Investigação/Resistência e retorno
à iniciativa, reconexão, isolamento de campanhas, respostas antigas e encerramento verificados.
Stack real observado em quatro viewports. Builds/lint e testes do recorte passaram; duas falhas
externas da suíte frontend ampla pertencem à navegação do jogador alterada em paralelo.
Evidências: `docs/reviews/espectador-documentos-cena/RELATORIO.md`.

Integrar com `jogador-acesso-somente-cena-atual.spec.md`: o acesso atual do backend a encerradas citado no diagnóstico é evidência do estado anterior, não autorização para preservar histórico do jogador. O autor restringiu JOGADOR à cena atual em 2026-09-29; esta spec não decide acesso histórico de ESPECTADOR. A projeção de agentes também passa pelo contrato de `auditoria-ficha-oculta-todos-consumidores.spec.md`.
