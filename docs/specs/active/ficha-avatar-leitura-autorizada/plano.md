# Leitura autorizada de avatar — plano de execução

## Contrato e responsabilidade

Fonte: spec ao lado, SYSTEM.SPEC §14, permissão na FichaService. A autorização de
avatar acompanha a identidade já apresentada pelo produto: carteirinha pública de
jogador visível; jogador oculto somente dono/mestre; criatura/NPC conforme revelação;
espectador somente o conjunto público de jogadores. Prévia usa o observador simulado,
depois de validar que o solicitante é mestre. Não liberar avatar com o privilégio
do mestre quando ele observa uma prévia.

1. Separar FICHAS de AGENTES (combatentes avulsos), DOCUMENTOS e PATCHNOTES.
   Persistir novos avatares como `/uploads/fichas/<uuid.ext>`, independente do provedor.
2. API autenticada consulta a FichaService antes e depois do I/O, garantindo vínculo
   atual entre ficha e arquivo. Resposta binária sem cache, sem ETag e com Vary:
   Authorization. O controller só encaminha; interceptor preserva StreamableFile.
3. Retirar exposição estática de agentes. Rota legada identifica ficha ativa e
   autoriza na sua service; arquivo desconhecido/órfão não é servido. Avulso ativo
   mantém leitura pública na service dona. Documentos/patchnotes mantêm seus caminhos.
4. Frontend busca blob autenticado por HttpClient; revoga URL temporária ao sair,
   mudar sessão/observador ou receber invalidação/reconexão. Durante revalidação ou
   negação, mostra o fallback existente. Nenhum JWT é enviado a domínio externo.
5. Provedor local admite raiz isolada; R2 exige bucket privado distinto para FICHAS.
   Um endereço assinado temporário não substitui a autorização a cada leitura.

## Impacto e referência visual

Mudança compartilhada: contrato de armazenamento, enum de pasta, tratamento binário
do interceptor e consumo de imagemUrl. Inventário por `npm run impacto -- --simbolo
imagemUrl`, busca de `AGENTES`, `useStaticAssets` e todos os `<img>` de avatares.

| Consumidor | Classificação | Decisão |
|---|---|---|
| Ficha: upload/substituição/exclusão, acervo e páginas completas | pedido | pasta privada e transporte autenticado |
| Membros/carteirinhas, Esquadrão e espectador | acompanha, coberto pela spec | mesma identidade pública/oculta, fallback atual |
| Encontro: trilha, seleção, cartão e resumo | acompanha, coberto pela spec | autenticar somente imagem de ficha |
| Prévia de jogador/espectador | pedido | contexto explícito validado pela API |
| Avatar ampliado e preview do acervo | pedido | mesma assinatura/cancelamento do transporte |
| Combatente avulso | distinto | preservar público, reemitindo URL no corte para fechar origens antigas |
| Documento e patchnote | distinto | preservar URL/provedor público |
| Faxina de arquivos | acompanha | avaliar pasta privada sem remover arquivo referenciado |

Análogos aprovados são os próprios componentes existentes antes da mudança: cartão
de ficha do acervo, carteirinha de campanha, identidade da ficha e cartão/trilha do
encontro. Não criar controle, layout, estilo ou variante visual. Comparar imagem,
fallback e ampliação nos quatro viewports 1920×1080, 1366×768, 960×1080 e 360×800.

## Transição de dados e origem pública

Ferramenta de manutenção simula por padrão, com inventário e aplicação explícita:
copiar o arquivo para pasta/bucket privado, verificar bytes por SHA-256 e só depois
alterar a referência ativa, usando comparação da referência anterior. Conflito aborta
sem apagar a origem. Arquivo legado compartilhado com avulso deve ser detectado e
tratado antes do corte: avulso público não pode manter pública a mesma cópia da ficha.
Registrar o destino privado para retomada em caso de interrupção. Nenhuma entidade
é apagada fisicamente.

Antes do corte, reemitir avatares de todos os avulsos ativos em URLs públicas novas,
com cópia e hash registrados no diário. Não supor que uma URL de avulso nunca
pertenceu também a uma ficha já excluída. Colisão com ficha ativa bloqueia antes de
escrever e exige separação explícita. Somente os novos destinos públicos comprovados
pelo diário podem permanecer públicos. Depois, inventariar todos os objetos antigos
em `agentes/`, incluindo subpastas, órfãos e arquivos de fichas excluídas: todas essas
origens precisam sair da exposição pública. Preservar cópia privada de quarentena antes
de remover cada objeto público. Para CDN, purgar todas as URLs/aliases previamente
emitidos e testar novas leituras sem autenticação, condicionais e sem cache.
Se a lista completa de aliases não for conhecida, fazer purge de todo o cache da
zona dedicada ou manter o corte bloqueado. Não encerrar apenas por trocar DTOs.

Produção tem gate próprio: revisar inventário/banco/buckets/aliases, backup e
credenciais com escopo; garantir bucket privado sem r2.dev e sem domínio público;
executar janela de corte com escrita suspensa, migração, remoção e purge; validar
origem antiga e nova antes de reabrir. Não religar exposição pública como rollback;
em falha conservar manutenção e restaurar referências/cópias privadas.

R2 é privado por padrão, mas r2.dev e domínio customizado podem torná-lo público.
O domínio customizado também pode servir cache. Fontes oficiais:
[bucket público](https://developers.cloudflare.com/r2/buckets/public-buckets/),
[interação com cache](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/),
[purge](https://developers.cloudflare.com/api/resources/cache/methods/purge/).

## Gates

TDD focado de permissão/storage/transporte, matriz dono/mestre/terceiro/espectador,
prévia e resposta atrasada; migração simulada e aplicada em armazenamento/banco
isolados. Teste real de upload, leitura, ocultação/exibição, revogação, substituição,
exclusão e reconexão. Preservar documentos, patchnotes e avulsos. Revisão independente
do diff de segurança; builds, testes, lint e repo:verificar. Evidências brutas em
`.artifacts/ficha-avatar-leitura-autorizada/`.

**Pendente externo:** teste controlado real R2/CDN da configuração a implantar. O
ambiente atual só disponibiliza local. Pergunta ao autor enviada; execução local
prossegue. Sem esse teste a entrega correspondente permanece aberta e a spec não
vai para done.
