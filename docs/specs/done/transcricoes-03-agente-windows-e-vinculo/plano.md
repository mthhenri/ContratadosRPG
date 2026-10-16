# Plano de implementação da task 03

Base: d7e6892e; branch local feat/transcricoes-03. Design aprovado pelo autor.

1. Contratos e migration 0038: solicitação de vínculo, dispositivo, intenção; hashes e datas, BaseEntity, sem áudio.
2. Backend: emissão pública limitada, confirmação JWT/Mestre, credencial restrita com guard próprio, revogação/tokenVersao/inatividade, intenção de uso único. Testes de expiração, concorrência, isolamento e acesso negado antes do código.
3. Site: confirmação e dispositivos, lista/criação de sessões e abertura contextual; fallback explícito sem inventar detecção de instalação. Primitivos existentes e testes de estado.
4. Desktop: cliente HTTPS, parsing fechado, DPAPI, namespaces por conta, recursos, Qt e instalador por usuário. Testes portáveis; build nativo Windows e DPI ficam gates pendentes se host indisponível.
5. Integração: testes focados/DB/API, builds/lint, visual web; revisão independente do diff; documentação de resultados e patch local.

Não publicar, fazer merge, executar migrations em banco existente nem implementar 02/04–09. Gates globais preexistentes da 01 permanecem documentados.

## Ledger

- 2026-10-14: autorização da 03 recebida. Design D02/D03 aprovado. Spec ativada; nenhum gate Windows executado.

- Revisão independente única: dois achados P2 no pedido pendente reproduzidos com testes RED, corrigidos e verificados GREEN. Não apagar segredo por 401; não substituir pedido/segredo antes da desconexão; cancelamento por prova de segredo serializado com confirmação. Windows/DPI/IPC/licenças não julgados pelo revisor permanecem gates abertos. Arquivamento preserva o contrato aprovado na 01 (distinto de exclusão), sem mudar sua semântica.

- Verificação web: 24 capturas + fallback/revogação/offline, ambos os temas/quatro viewports. Inspeção principal corrigiu campos seguindo Perfil. Teste offline reproduziu toast técnico (RED); contexto próprio das chamadas evita toast e preserva o fluxo global do 401, sem alterar interceptor existente.
- Gates globais conhecidos e prova Windows pendentes: manter active e entregar commit/patch local; nenhuma publicação.
