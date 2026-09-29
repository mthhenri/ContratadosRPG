# Jogador acessa somente a cena atual

## Decisão do autor

2026-09-29: jogador não pode ver cenas encerradas. Entra sempre na cena atual; sem cena ativa, vê “Nenhuma cena no momento”. Esta decisão substitui para JOGADOR o acesso a histórico previsto na m7-22. Specs em done/ permanecem históricas; corrigir documentação normativa afetada durante a implementação.

## Evidência atual

`CenaService.recuperarCena` bloqueia apenas PLANEJADA para não mestre; `listarPorCampanha` inclui ATIVA e ENCERRADA para jogador/espectador. A restrição precisa existir no backend e nos caminhos alternativos, não apenas esconder o histórico no hub.

## Entregáveis

- Centralizar autorização: JOGADOR lê somente a cena ATIVA da própria campanha. MESTRE mantém planejadas, atual e histórico.
- Entrada do jogador resolve a cena atual; sem ativa, estado vazio canônico. Links antigos, favoritos, F5 e URL direta para encerrada/planejada não exibem dados antigos; encaminhar à atual ou ao vazio sem ciclo de navegação.
- Lista/hub do jogador não retorna nem mostra histórico ou planejadas. Recuperação por id e endpoints de documentos da cena negam cena não ativa ao jogador.
- Auditar acesso ao encontro associado e seus logs/documentos por endpoints alternativos: proibir recuperar conteúdo de cena encerrada através do encontro legado. Não alterar a Biblioteca geral nem o histórico geral de rolagens por inferência; se essas fontes contiverem vazamento equivalente, registrar evidência e delimitar ajuste necessário.
- Ao encerrar/trocar cena, invalidar conteúdo, seleção, modais e cargas pendentes; resolver a nova ativa ou o vazio. Evento é sinal para refetch autorizado, inclusive reconexão; não renderizar payload de encerrada como histórico.
- Prévia do mestre aplica a identidade e permissões do jogador-alvo. Backend pode negar acesso antigo mesmo que cliente ainda tenha URL.
- A decisão explícita desta spec é para JOGADOR. Não ampliar automaticamente a política de histórico do ESPECTADOR; sua spec separada cobre navegação pela ativa e estado vazio.

## Aceite e testes futuros

1. Planejada, ativa e encerrada na mesma campanha: jogador lista/abre apenas ativa; mestre conserva gestão/histórico.
2. URL direta, recuperação REST, documentos e encontro legado da encerrada/planejada negados ao jogador; outra campanha também negada.
3. Encerrar sem substituta mostra vazio; abrir substituta acompanha ao vivo. Cobrir transição durante carga, F5 e reconexão após perder evento.
4. Conta real e prévia do mesmo jogador coincidem. Testes backend de permissão e frontend de resolução/transições; gates proporcionais.
5. Skill verify em 1920×1080 e 360×800. Análogos: hub/painel de cena atuais e estado vazio da iniciativa. Registrar evidências, sem declarar conclusão só por testes.

## Dependências e referências

SYSTEM.SPEC, CONVENTIONS, DESIGN; m7-22/m7-23/m7-24, rotas e projeção de encontro. Integrar com a visão de esquadrão e as specs de leitura de documentos, evitando regras de acesso divergentes.
