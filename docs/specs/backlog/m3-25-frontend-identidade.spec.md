# m3-25-frontend-identidade.spec.md

> Task 25 do milestone `m3-ficha-jogador.spec.md`. Terceira das três da **Identidade**
> (`m3-23` contrato+motor → `m3-24` backend → `m3-25` frontend).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> O protótipo `docs/design/examples/ficha-de-jogador.html` já ilustra a Identidade (Personalidade,
> Origem, Saber de Campo) — é o alvo de fidelidade.

> **Aguardando a `m3-11`.** Decisão do autor: a Identidade **não vai à tela agora**. O card mora na
> aba **Identidade** que a `m3-11` cria; implementar antes obrigaria a movê-lo depois. Esta spec
> existe para registrar o trabalho, não para ser puxada já.

## Objetivo

Exibir e editar a **Identidade** na ficha — Personalidade (a palavra) e Origem (rótulo, descrição,
Formação, Especialidade, Saber de Campo) —, aplicando o **delta de Formação** aos derivados no
momento em que a Origem é definida.

## Entregáveis

1. **Card Identidade** na aba Identidade (`m3-11`), no padrão de **edição no próprio lugar** da
   `m3-10` (lápis por trecho, confirmação otimista, persistência em lote via `alterarFicha`).

2. **Personalidade:** a palavra, com o texto do documento à mão (é o Mestre quem define a habilidade
   correspondente). A **habilidade** aparece na aba Habilidades (`m3-13`) com
   `categoria: PERSONALIDADE` — não é editada aqui, nem duplicada.

3. **Origem:** `nome`, `descricao`, `saberDeCampo` (textos), `especialidade` (frase do gatilho +
   `<select>` do efeito) e **Formação (exatamente 2)**:
   - `<select>` com as 21 linhas de `FORMACOES` (m3-23), agrupadas por Combate / Movimento /
     Perícia / Equipamento / Logística;
   - quando a linha exige parâmetro (`ATRIBUTO`, `CATEGORIA_ARMA`, `TIPO_DANO`,
     `ESQUIVA_OU_BLOQUEIO`, `CONDICAO`), aparece o controle do parâmetro;
   - opção **"Outro (autorizado pelo Mestre)"** libera texto livre e grava `bonus: null` — o escape
     que o documento autoriza.

4. **Delta de Formação nos derivados:** ao definir (ou o mestre trocar) a Origem, chamar
   `aplicarFormacaoAosDerivados` (m3-23) — **remove o delta da Origem anterior e soma o da nova**,
   exatamente como `ajustarClasse` já faz com o bônus de arquétipo. Nenhuma fórmula no componente
   (proibições #26/#27).

5. **Selo dos efeitos pendentes:** os efeitos que `listarEfeitosPendentes` devolve (16 das 21) são
   exibidos como registro, marcados como **ainda não aplicados** (não há campo: resistências,
   Sobrecarga, Iniciativa, DT de reparo, modificadores de rolagem). Não inventar campo para eles —
   quem os consome são tasks futuras.

6. **Trava de imutabilidade refletida** (o backend é o árbitro — `m3-24`; o front só apresenta): para
   o **dono**, Personalidade e Origem **já definidas** aparecem somente-leitura, com o motivo
   explicado. Para o **mestre**, tudo editável. Definir pela primeira vez é liberado a ambos.

7. Standalone, Signals, `.scss`/BEM só com tokens.

## Critérios de Aceite

- Mestre define e edita Personalidade e Origem; dono define uma vez e depois vê somente-leitura.
- Escolher `+1m de Deslocamento` na Formação sobe o Deslocamento **uma vez**; trocar a Origem por
  outra devolve o valor e aplica a nova.
- `+1 dado em testes de Vigor` é gravado e exibido, **sem** alterar número nenhum.
- "Outro (autorizado pelo Mestre)" grava `bonus: null` com `texto` preenchido.
- Nenhuma fórmula duplicada no front; nada de hex/fonte solto.

## Fora de Escopo

- Editor da habilidade de Personalidade e das Fortificações (níveis 7/14) — vive na `m3-13`
  (Habilidades), com `categoria: PERSONALIDADE`.
- Criar campos para os 16 efeitos pendentes.

## Dependências

- `m3-23` (contrato + `FORMACOES` + `aplicarFormacaoAosDerivados` + `listarEfeitosPendentes`).
- `m3-24` (validação e trava — o backend arbitra).
- `m3-11` (aba Identidade, onde o card mora). **Bloqueante:** não puxar antes.
