# Documentos da cena na visão do espectador

## Origem e estado

Pedido de 2026-09-29. Implementada junto ao pré-requisito autorizado
`fix-espectador-cenas-sem-iniciativa.spec.md`; cancelamento e seleção seguros integrados no leitor
espectador. A correção geral do leitor do mestre permanece na spec própria.

## Objetivo

Na visão da cena, o espectador consulta os documentos revelados vinculados à Investigação sem precisar sair para a Biblioteca. Biblioteca flutuante e coluna de documentos da cena são funções distintas.

## Evidências atuais

`CenaDocumentoService.listar` já recorta documentos revelados para não mestres e nega cena planejada. `CampanhaGateway.emitirCenaDocumentoAlterado` já inclui a sala espectadora. `PainelEncontroEspectador` não tem consumidor/lista/leitor de documentos da cena. A m9-12 adicionou Biblioteca flutuante ao painel da campanha do espectador, sem atender a este fluxo da cena.

## Entregáveis e comportamento

- Coluna/lista de documentos revelados anexados à Investigação atual, na ordem autorizada pelo backend. Não listar toda a Biblioteca no lugar dos vínculos da cena.
- Usar DocumentoCartao e LeitorDocumento; abertura voluntária em modal, equivalente ao jogador da m7-25. Apresentar/revelar acrescenta o item sem forçar abertura; foco do mestre não controla seleção do espectador.
- Fechar o modal ou trocar documento funciona durante carga, sem respostas antigas reaparecerem; tratar carregamento, vazio e falha.
- Escutar `cena:documento-alterado`, `documento:alterado` e reconexão com filtros de campanha/cena e refetch autorizado. Alteração atualiza conteúdo; ocultação/remoção/revogação/troca de cena encerra leitura indisponível.
- Backend garante permissão em lista e recuperação direta do documento. Prévia do mestre deve aplicar recorte espectador inclusive quando a sessão do mestre pode recuperar ocultos.
- Nenhuma ação de criar, focar para o mestre, apresentar, ocultar, anexar, reordenar ou remover aparece ou é autorizada ao espectador. Não expor presença de leitores de outros membros.

## Aceite e verificação futura

- Investigação com texto e imagem revelados e outro documento oculto: real e prévia veem somente os revelados e abrem ambos; oculto não vaza via lista, busca ou URL direta do espectador.
- Mestre apresenta, altera, oculta, remove e reordena; espectador recebe alterações sem F5. Fechamento durante carga e respostas fora de ordem não reabrem leitor.
- Reconexão após perder evento de ocultação elimina leitura antiga. Sem documentos revelados, estado vazio adequado; Resistência e cenas com iniciativa não ganham documentos por esta spec.
- Testes focados de autorização, recorte, eventos e leitor; build/lint/testes proporcionais. Skill verify, mestre e espectador em sessões separadas, 1920×1080 e 360×800.
- Fontes: SYSTEM.SPEC, CONVENTIONS, DESIGN, m7-25, m9-05/m9-12. Análogos: lista/modal do PainelCenaSemIniciativaJogador e casca espectadora. Conferir densidade, hierarquia, foco, contraste, toque e overflow. Sem observação real, tarefa permanece aberta.

## Fecho — 2026-09-29

Aceites verificados no stack real com contas separadas e prévia, incluindo quatro viewports,
permissões, respostas antigas, eventos, reconexão e revogação. Builds e lint passaram;
shared 772/772, backend 804/804 e recorte frontend final 72/72. Suíte frontend ampla teve duas
falhas de navegação do jogador na tarefa paralela, discriminadas no relatório.
Evidências: `docs/reviews/espectador-documentos-cena/RELATORIO.md`.
