import { ArquetipoEnum, ClasseEnum, RolagemEfeitoAlvoEnum, RolagemEfeitoTipoEnum, TipoDanoEnum } from '../../enums';
import type { RolagemEfeitoDto } from '../rolagem';

/**
 * Catálogo de habilidades **do sistema** (`sistema-v4.1.0.md`), transcrito fielmente do documento
 * e desnormalizado. Fonte única consumida pelo seletor da ficha (`catalogoHabilidades`) — o
 * documento vence o código (proibições #26/#27). Cada entrada guarda só nome/custo/descrição; a
 * **categoria** e a **origem** (classe/arquétipo/subclasse) são atribuídas por `habilidades-catalogo.ts`
 * conforme a coleção em que a habilidade vive.
 *
 * Custo: número em Energia; `null` para custo variável (`[X E]` no documento).
 *
 * Fora do catálogo (só criadas, sem lista no sistema): Personalidade, Especialidade e Civil.
 */
export interface HabilidadeBaseDto {
  readonly nome: string;
  readonly custoEnergia: number | null;
  readonly descricao: string;
  /**
   * Efeitos mecânicos (m3-20) para presets de rolagem — herdados por `HabilidadeCatalogoItemDto` e
   * copiados para a ficha ao adicionar do catálogo. Só as habilidades com efeito estruturado hoje
   * (ex.: Força Bruta) têm o campo; as demais ficam só na descrição até serem modeladas.
   */
  readonly efeitos?: readonly RolagemEfeitoDto[];
}

/** Habilidades Gerais — disponíveis a qualquer agente (`sistema-v4.1.0.md` — "⬥ Habilidades Gerais"). */
export const HABILIDADES_GERAIS: readonly HabilidadeBaseDto[] = [
  { nome: '6º Sentido', custoEnergia: 0, descricao: 'Permite-lhe reagir a ataques surpresa, sem penalidade de redução de Defesa e adicionando um terço de sua Destreza.' },
  { nome: 'Analisar Cenário', custoEnergia: 2, descricao: 'Refaz um teste em um local já explorado ou investigado.' },
  { nome: 'Arrepio', custoEnergia: 2, descricao: 'Pode refazer um teste de Sentidos fracassado.' },
  { nome: 'Ataque Duplo', custoEnergia: 3, descricao: 'Dá um segundo ataque no mesmo turno.' },
  { nome: 'Atirador Calculista', custoEnergia: 3, descricao: 'Ao ficar 1 turno completo mirando no alvo, soma sua Pontaria ao teste de ataque.' },
  { nome: 'Bater e Reposicionar', custoEnergia: 4, descricao: 'Inibe um ser de Esquivar ou Bloquear um golpe corpo a corpo.' },
  { nome: 'Cautela Extra', custoEnergia: 3, descricao: 'Ao realizar um teste de Destreza (DT 20) e obtiver sucesso, reduz a área de detecção de um ser para te localizar para Sentidos × 4 por 1D4+1 turnos.' },
  { nome: 'Chance Crítica', custoEnergia: 6, descricao: 'Reduz a margem de crítico de um teste em 1.' },
  { nome: 'Charlatão', custoEnergia: 3, descricao: 'Recebe +2 dados em um teste de Social.' },
  { nome: 'Charme', custoEnergia: 2, descricao: 'Ao falhar em um teste de Social contra uma pessoa, pode força-lo com +1 dado. Falhar irá reduzir o Nível de Cooperação em 2 ao invés de 1.' },
  { nome: 'Combater com Duas Armas', custoEnergia: 0, descricao: 'Ataca com duas armas de uma mão como um único ataque, com dois testes e dois danos, um por arma. Armas iguais (exemplo: duas Pistolas) causam +1 dado de dano em cada. Habilidades que beneficiam ambos os ataques custam +50% de Energia (mínimo +1 E). Ataques adicionais de outras habilidades usam apenas uma das armas.' },
  { nome: 'Contra-Ataque', custoEnergia: 2, descricao: '(Reação) Soma sua Luta ÷ 2 na sua Defesa ao reagir, caso o atacante não a ultrapasse, garante um ataque físico direto no ser, rolando apenas o dano da arma em mãos.' },
  { nome: 'Cuidados Básicos', custoEnergia: 3, descricao: 'Ao curar um ser, caso um dado de cura tenha tirado o valor mínimo, pode rodar um dado de cura igual extra.' },
  { nome: 'Dano Crítico', custoEnergia: 8, descricao: 'Ao acertar um crítico, ignora metade das resistências dos tipos de dano causados.' },
  { nome: 'Defesa Precisa', custoEnergia: 2, descricao: 'Recebe +1 de Defesa.' },
  { nome: 'Derrubar e Atacar', custoEnergia: 3, descricao: 'Após derrubar um alvo, pode dar um segundo ataque.' },
  { nome: 'Determinação Inabalável', custoEnergia: 6, descricao: 'Uma vez por missão, pode ignorar todos os efeitos negativos de uma condição na qual irá te afligir, ou uma que já esteja lhe afligindo, negando-a por Vigor turnos. Exceto Morrendo.' },
  { nome: 'Em Alerta', custoEnergia: 0, descricao: 'Ao chegar a menos da metade da vida máxima, recebe +1 em Defesa e +1 dado em testes de Destreza e Sentidos até o fim da cena ou recuperar sua vida completamente.' },
  { nome: 'Esforço Extra', custoEnergia: 4, descricao: 'Sacrifica uma quantidade de vida em troca de receber valor fixo no resultado do teste. Para cada 3 de Vida recebe +1 no teste (limitado para até +10 no teste).' },
  { nome: 'Especialista em Explosivos', custoEnergia: 4, descricao: 'Reduz o raio de explosão da granada em 1 metro e aumenta em 1 tipo os dados de dano.' },
  { nome: 'Espírito Inquebrável', custoEnergia: 5, descricao: 'Ao receber uma sequela, pode realizar um teste de Vontade (DT 15 + Quantidade de sequelas atual × 2), se passar, ignora a sequela adquirida até o fim dessa cena.' },
  { nome: 'Espólios de Guerra', custoEnergia: 3, descricao: 'Ao investigar o corpo de um ser abatido, recebe +5 no teste.' },
  { nome: 'Evasão', custoEnergia: 4, descricao: 'Caso seja alvo de um ataque, mesmo que ele o acerte, reduz o dano do atacante em 1 tipo e, caso já sejam D4, causa -1 de dano por dado.' },
  { nome: 'Fintar', custoEnergia: 2, descricao: 'Reduz a Defesa do alvo em -3 contra um ataque corpo a corpo.' },
  { nome: 'Fortificação', custoEnergia: 4, descricao: 'Aumenta suas resistências em Vigor pontos por 1 turno.' },
  { nome: 'Golpe de Oportunidade', custoEnergia: 3, descricao: '(Reação) Caso um inimigo tente sair de corpo a corpo, pode realizar um ataque padrão como reação.' },
  { nome: 'Golpes Rápidos', custoEnergia: 2, descricao: 'Muda o atributo de uma arma corpo a corpo de Luta para Destreza reduzindo 1 dado de dano de todos os tipos.' },
  { nome: 'Imobilizar', custoEnergia: 4, descricao: 'Após agarrar um ser, pode realizar um teste de Força (contra a Força do agarrado) com 1 dado à mais para imobilizá-lo, se conseguir, inibe-o de realizar a reação de Esquivar.' },
  { nome: 'Imprudente', custoEnergia: 2, descricao: 'Reduz um estágio da durabilidade do item mas aumenta os dados de dano em 50% (mínimo +2 dados).' },
  { nome: 'Investida Brutal', custoEnergia: 3, descricao: 'Se estiver à meio deslocamento do alvo, ao se mover até ele e desferir um ataque físico, recebe +2 dados no teste.' },
  { nome: 'Intuição Aguçada', custoEnergia: 0, descricao: 'Sempre que entrar em uma nova cena, pode realizar um teste de Sentidos para detectar perigos ocultos, como armadilhas ou criaturas furtivas.' },
  { nome: 'Linguagem Corporal', custoEnergia: 3, descricao: 'Após falhar em um teste de interação social, recebe +3 no resultado de seu próximo teste no mesmo alvo.' },
  { nome: 'Matrix', custoEnergia: 4, descricao: 'Recebe +2 ao Esquivar.' },
  { nome: 'Mestre da Camuflagem', custoEnergia: 4, descricao: 'Uma vez por cena, ao ser notado, pode refazer o teste de furtividade para tentar se manter escondido.' },
  { nome: 'Mimado', custoEnergia: 2, descricao: 'Caso não goste do resultado de um dado antes de dizer seu valor, pode rodá-lo novamente.' },
  { nome: 'Mira Relâmpago', custoEnergia: 2, descricao: 'Troca a ação de mirar para ação de movimento.' },
  { nome: 'Mochileiro', custoEnergia: 0, descricao: 'Muda o atributo de cálculo do inventário de Força para Intelecto - 1.' },
  { nome: 'Muralha', custoEnergia: 4, descricao: 'Recebe +2 ao Bloquear.' },
  { nome: 'Observador Astuto', custoEnergia: 3, descricao: 'Uma vez por ser, ao observá-lo por 1 turno completo, recebe +1 dado ou +3 no próximo teste contra o ser.' },
  { nome: 'Passo Firme', custoEnergia: 2, descricao: 'Aumenta seu deslocamento em Destreza ÷ 2 metros.' },
  { nome: 'Passos Furtivos', custoEnergia: 3, descricao: 'Em testes de Destreza para furtividade, recebe +1 dado.' },
  { nome: 'Percepção Repentina', custoEnergia: 4, descricao: 'Pode realizar um teste de Sentidos (DT Intelecto do alvo) para prever sua próxima ação, recebendo +3 no teste/reação.' },
  { nome: 'Persistência', custoEnergia: 4, descricao: 'Caso tenha errado o último ataque, recebe +1 dado no próximo ataque.' },
  { nome: 'Planejamento Tático', custoEnergia: 4, descricao: 'Antes de uma cena de combate, você e seus aliados reajustam suas estratégias e se preparam para ocasionais combates, concedendo +1 dado ou +2 em uma ação a escolha (Limite de até +3 dados e +6 no teste).' },
  { nome: 'Queima-Roupa', custoEnergia: 0, descricao: 'Recebe +2 dados de dano ao estar adjacente ao seu alvo durante um disparo.' },
  { nome: 'Raciocínio Dedutivo', custoEnergia: 3, descricao: 'Ao realizar um teste de Intelecto para análise de pistas ou informações, recebe +1 dado.' },
  { nome: 'Reação Aprimorada', custoEnergia: 6, descricao: 'Uma vez por turno, após sua Esquiva ou Bloqueio falhar, aumenta a Defesa em 1D4 pontos para tentar evitar o golpe recebido.' },
  { nome: 'Reação Rápida', custoEnergia: 2, descricao: 'Se passar em um teste de Esquiva, ganha um extra de metade do seu deslocamento após o ataque.' },
  { nome: 'Reflexos Rápidos', custoEnergia: 4, descricao: 'Recebe +1 ao Esquivar, em caso de sucesso, pode se deslocar 25% de seu deslocamento.' },
  { nome: 'Resistir à Dor', custoEnergia: 5, descricao: 'Realiza um teste de Vigor (DT 17 + Sequelas atuais × 2), se passar, aumenta sua resistência a dano em 2D4 por Vigor turnos.' },
  { nome: 'Resiliência', custoEnergia: 5, descricao: 'Após falhar em um teste de Vigor por até 5 pontos ao estar Morrendo, poderá refazê-lo.' },
  { nome: 'Retirada Estratégica', custoEnergia: 3, descricao: 'Ao acertar um ataque, pode se mover Destreza ÷ 2 metros como ação livre.' },
  { nome: 'Saque Rápido', custoEnergia: 1, descricao: 'Pode sacar um item como ação livre.' },
  { nome: 'Sutura', custoEnergia: 2, descricao: 'Adiciona sua Medicina a cura do item medicinal.' },
  { nome: 'Tática de Grupo', custoEnergia: 4, descricao: 'Durante o turno, pode gastar sua ação de movimento para conceder +1 dado em um teste de ataque ou +2 na Defesa de um aliado dentro de metade do seu deslocamento.' },
  { nome: 'Tático Urbano', custoEnergia: 2, descricao: 'Com um teste de Sentidos, permite-lhe identificar coberturas, recebendo a ação de "Tomar Cobertura" na qual lhe garante +2 na Defesa e 3 de resistência à dano.' },
  { nome: 'Tenacidade', custoEnergia: 4, descricao: 'Caso esteja com 10% ou menos de vida, recebe +1 dado em testes de Vigor, Força, Destreza e Vontade e +2 em Defesa por 2D4 turnos ou até sua vida aumentar de 10%.' },
  { nome: 'Tiro de Reação', custoEnergia: 3, descricao: '(Reação) Caso esteja mirando em um ser, e o mesmo realize uma ação, pode realizar um disparo padrão contra o mesmo (que pode ser reagido).' },
  { nome: 'Tomar Iniciativa', custoEnergia: 5, descricao: 'Recebe uma ação padrão extra no primeiro turno.' },
  { nome: 'Tratamento Eficaz', custoEnergia: 0, descricao: 'Ao remover um aliado de Morrendo com um crítico, pode curá-lo 2D6 de Vida.' },
];

/**
 * Habilidades de Classe por classe-base (`sistema-v4.1.0.md` — tabelas de classe). Só as três
 * classes-base têm lista própria; Experimentos acessam a lista da classe-base correspondente
 * (resolvido em `habilidades-catalogo.ts`) e Civil não tem lista.
 * PLACEHOLDER — preenchido na fase de transcrição.
 */
export const HABILIDADES_CLASSE: Readonly<Record<ClasseEnum, readonly HabilidadeBaseDto[]>> = {
  [ClasseEnum.COMBATENTE]: [
    { nome: 'Abrir Cabeças', custoEnergia: 2, descricao: 'Adiciona o valor máximo do maior dado de dano da sua arma ao somatório de dano de um ataque (+3E para adicionar o valor máximo +1x limitado ao seu Nível / 2).' },
    { nome: 'Aparar', custoEnergia: 3, descricao: '(Reação) Se um ataque falhar contra sua reação por 5 ou mais, por 1 turno, seu ataque recebe +2 no teste.' },
    { nome: 'Artista Marcial', custoEnergia: 1, descricao: 'Muda o atributo somatório do dano de uma arma corpo a corpo de Força para Destreza.' },
    { nome: 'Berserk', custoEnergia: 3, descricao: 'Ao estar portando uma arma de duas mãos, adiciona seu atributo de teste ao dano.' },
    { nome: 'Cai Dentro', custoEnergia: 0, descricao: '(Reação) Caso um alvo esteja corpo a corpo contigo e se afaste de você, poderá realizar um ataque padrão.' },
    { nome: 'Companheiro', custoEnergia: 3, descricao: '(Reação) Escolha um aliado em até alcance médio. Caso ele obtenha um crítico durante um ataque, você pode realizar um ataque padrão como se estiver disponível para isso. Após esse ataque a habilidade finaliza.' },
    { nome: 'Duplamente Letal', custoEnergia: 0, descricao: 'Estar portando duas armas iguais aumenta seus testes com elas em +1 dado.' },
    { nome: 'Destroçar', custoEnergia: 4, descricao: 'Se obtiver um crítico, reduz os testes do oponente ou sua defesa em -3 por 1 turno.' },
    { nome: 'Dupla Dinâmica', custoEnergia: 4, descricao: 'Durante 1D3+1 turnos, ter qualquer aliado atacando o mesmo ser que você é considerado flanqueado para ambos.' },
    { nome: 'Explosão de Adrenalina', custoEnergia: 5, descricao: 'Aumenta +2 dados no teste em um ataque, mas fica Cansado no próximo turno.' },
    { nome: 'Guerreiro de Rua', custoEnergia: 4, descricao: 'Para cada turno decorrido no combate, recebe +1 nos testes de Atributos Físicos, com limite em Vigor + Destreza divididos por 2 para estes aumentos.' },
    { nome: 'Mano a Mano', custoEnergia: 6, descricao: 'Escolha um ser na cena e, até o fim dela ou a morte do mesmo, recebe +3 em todos os testes de Atributos Físicos contra ele, mas, -2 em testes não relacionados à ele. Desfocar do alvo necessita de um teste de Vontade DT 15 + 2 por turno focado.' },
    { nome: 'Manejo', custoEnergia: 0, descricao: 'Ao escolher no início de uma missão uma categoria de arma (Corpo a corpo, De fogo, Exótica ou Explosivos), recebe +1 dado de dano ao usá-la.' },
    { nome: 'Mira de Combate', custoEnergia: 1, descricao: 'Aumenta o tempo de espera para perder a mira em +1 turno (uma vez por ação de mirar).' },
    { nome: 'Na Base do Ódio', custoEnergia: 2, descricao: 'Em um teste de Atributo Físico, recebe +1 dado.' },
    { nome: 'Porradeiro', custoEnergia: 3, descricao: 'Para cada 15 de vida a menos, recebe +1 no teste ou dano de um ataque (limite Vigor × 2 de somatório).' },
    { nome: 'Pugilista', custoEnergia: 0, descricao: 'Usando armas que ampliam seu dano de corpo, aumenta os dados de dano de corpo em 1 tipo.' },
    { nome: 'Ruptura', custoEnergia: 4, descricao: 'Reduz a resistência do alvo ao tipo de dano de sua arma em Atributo do Teste × 2 pontos por 2 turnos. A resistência não pode ser reduzida abaixo de 0.' },
    { nome: 'Segundo Fôlego', custoEnergia: 0, descricao: 'Ao realizar um descanso, aumenta seus dados de recuperação de energia em Vigor ÷ 2.' },
    { nome: 'Técnica Aplicada', custoEnergia: 1, descricao: 'Estar flanqueando um alvo te concede +1 dado de dano.' },
    { nome: 'Vem pra Cima!', custoEnergia: 3, descricao: 'Escolha um ser. Obriga-o a fazer um teste de Vontade (DT Vigor). Caso ele falhe, para todos na cena (exceto você) o ser estará Vulnerável até que você fique Inconsciente ou a cena finalize.' },
  ],
  [ClasseEnum.ESPECIALISTA]: [
    { nome: 'Ajudante', custoEnergia: 2, descricao: 'Auxiliar um aliado soma +1 a cada 4 pontos ao invés de a cada 5 pontos.' },
    { nome: 'Análise de Campo', custoEnergia: 3, descricao: 'Durante uma cena na qual você e seus aliados estejam sob um terreno ou ambiente difícil (como dentro de uma grande poça de lodo, terreno íngreme, ventos fortes, etc), pode encontrar algum benefício no mesmo, reduzindo a penalidade pela metade.' },
    { nome: 'Arsenal Compartilhado', custoEnergia: 0, descricao: 'Pode usar itens do inventário de aliados adjacentes sem que o aliado precise realizar nenhuma ação para entregar o item.' },
    { nome: 'Bacharel em Agressão', custoEnergia: 2, descricao: 'Muda (caso não haja, adiciona) o atributo de soma do dano de uma arma para Intelecto.' },
    { nome: 'Camuflagem Rápida', custoEnergia: 4, descricao: 'Para entrar em furtivo, recebe +3 no teste. Em cenas furtivas, pode usar esta habilidade para se esconder novamente caso alguém tenha lhe encontrado.' },
    { nome: 'Conhecimento Técnico', custoEnergia: 1, descricao: 'Uma vez por cena, pode analisar uma arma durante seu turno, e com isso, receber +1 dado em testes com ela até o fim da cena.' },
    { nome: 'Destreza Técnico', custoEnergia: 1, descricao: 'Uma vez por cena, antes de realizar um teste de manipulação técnica manual não-combativa (abrir fechaduras, desativar armadilhas, consertar equipamentos, burlar sistemas físicos), reduz a DT do teste em Intelecto - 1 pontos (Redução mínima 1; DT mínima 5).' },
    { nome: 'Eclético', custoEnergia: 2, descricao: 'Recebe +1 dado em um teste de Atributo Mental.' },
    { nome: 'Espião', custoEnergia: 2, descricao: 'Ao utilizar uma arma silenciada, remove a penalidade completamente de um disparo furtivo.' },
    { nome: 'Estudo Rápido', custoEnergia: 3, descricao: 'Uma vez por criatura, pode descobrir uma fraqueza, ponto forte ou status da mesma. Ela pode realizar um teste de Intelecto DT Sentidos para anular o efeito.' },
    { nome: 'Hacker', custoEnergia: 0, descricao: 'Em testes para acessar equipamentos tecnológicos recebe +1 dado.' },
    { nome: 'Interferência Calculada', custoEnergia: 3, descricao: '(Reação) Quando um aliado em curto alcance for alvo de um ataque, realiza um teste de Sentidos contra DT 10 + metade do resultado do ataque recebido. Em caso de sucesso, o aliado recebe +3 na Defesa contra aquele ataque.' },
    { nome: 'Investigador Nato', custoEnergia: 2, descricao: 'Durante uma cena de investigação, recebe +1 dado em um teste para investigar uma área ou ser.' },
    { nome: 'Olhos de Águia', custoEnergia: 2, descricao: 'Amplia seus sentidos instintivos, aumentado sua área de percepção de seres furtivos de ×5 para ×6, além de fazer testes de Sentidos terem +3 em seu resultado.' },
    { nome: 'Prodígio Forense', custoEnergia: 3, descricao: 'Quando Examinando uma pista, recebe +5 no resultado do teste.' },
    { nome: 'Segunda Chance', custoEnergia: 2, descricao: 'Ao falhar em um teste (exceto ataques) por 5 ou menos, pode rodar 1D20 extra com os mesmos bônus do teste realizado (não é considerado um teste).' },
    { nome: 'Técnico de Combate', custoEnergia: 4, descricao: 'Uma vez por turno, muda o teste de ataque de uma arma para Intelecto.' },
  ],
  [ClasseEnum.SUPORTE]: [
    { nome: 'Anjo da Guarda', custoEnergia: 6, descricao: 'Uma vez por cena, se um aliado em alcance médio falhar em um teste de Vigor estando Morrendo, pode incentivá-lo a viver, mantendo-o vivo por mais 1 turno.' },
    { nome: 'Aura de Liderança', custoEnergia: 5, descricao: 'Uma vez por cena, impõe sua perseverança e confiança no time, concedendo +1 dado em todos os testes por Intelecto turnos.' },
    { nome: 'Auto Socorros', custoEnergia: 3, descricao: 'Pode ajudar alguém a te remover da condição de Morrendo caso não esteja Inconsciente.' },
    { nome: 'Barreira Mental', custoEnergia: 0, descricao: 'Para testes relacionados a Sanidade (sequelas, traumas, etc…) recebe +3.' },
    { nome: 'Competente', custoEnergia: 1, descricao: 'Adiciona +1 dado de efetividade em um item medicinal (limite +5 dados).' },
    { nome: 'De Última Hora', custoEnergia: 8, descricao: 'Pode mentir para um aliado em estado de morrendo (Social DT Intelecto dele). Sua mentira fará com que, nos próximos 2 testes, a DT do teste de Vigor dele não aumente.' },
    { nome: 'Discurso Motivacional', custoEnergia: 6, descricao: 'Uma vez por missão, você motiva sua equipe, removendo temporáriamente a última sequela obtida até o final da cena.' },
    { nome: 'Eloquência Persuasiva', custoEnergia: 3, descricao: 'Desconsidera uma falha que tenha obtido enquanto conversa com um NPC.' },
    { nome: 'Estímulo', custoEnergia: 2, descricao: 'Uma vez por turno, quando você usa um item medicinal ou habilidade de cura em um aliado, ele também recupera Medicina de Energia.' },
    { nome: 'Formação Tática', custoEnergia: 3, descricao: 'Uma vez por cena, concede uma ação de movimento extra para todos os seus aliados que estejam em seu campo de visão.' },
    { nome: 'Incentivo', custoEnergia: null, descricao: 'Uma vez por cena, recupera Energia de aliados em alcance médio. A quantidade recuperada é o resultado de um teste de Social e o gasto é igual a metade do teste obtido.' },
    { nome: 'Inspirador Nato', custoEnergia: 4, descricao: 'Concede +2 em testes de Social e Vontade para aliados em até alcance médio.' },
    { nome: 'Marcar Alvo', custoEnergia: 3, descricao: 'Como ação de movimento, marque um alvo visível em alcance médio. Aliados em alcance curto do alvo recebem +1 dado nos testes de ataque contra ele por Intelecto ÷ 2 turnos (mínimo 1). Apenas um alvo pode estar marcado por vez. Reutilizar a habilidade remove a marcação anterior.' },
    { nome: 'Mente Blindada', custoEnergia: 0, descricao: 'Pode refazer um teste de Vontade no qual você falhou.' },
    { nome: 'Motivação', custoEnergia: 4, descricao: '(Reação) Uma vez por aliado, pode motivá-lo a perseverar em seu objetivo, permitindo-o refazer um teste.' },
    { nome: 'Provisão Partilhada', custoEnergia: 0, descricao: 'Uma vez por cena, ao usar um item Medicinal ou Operacional em um aliado, pode escolher um aliado adjacente ao primeiro para receber metade do efeito do mesmo item, sem gastar um item adicional. Esse uso adicional exige o mesmo teste de Medicina.' },
    { nome: 'Rede de Conexões', custoEnergia: 0, descricao: 'Uma vez por missão, pode solicitar uma ajuda de um conhecido, recebendo um pequeno favor.' },
    { nome: 'Sempre Preparado', custoEnergia: 5, descricao: 'Gastando o peso do item × 2 em Energia adicional para sacar um item medicinal/operacional temporário. O item dura apenas nesta cena e não pode ter peso maior que Intelecto. Só pode puxar até Intelecto ÷ 2 itens por cena.' },
  ],
  [ClasseEnum.EXPERIMENTO_BESTIAL]: [],
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]: [],
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: [],
  [ClasseEnum.CIVIL]: [],
};

/**
 * Habilidades de Arquétipo (inclui a Habilidade Inicial de arquétipo). PLACEHOLDER.
 */
export const HABILIDADES_ARQUETIPO: Readonly<Record<ArquetipoEnum, readonly HabilidadeBaseDto[]>> = {
  [ArquetipoEnum.LUTADOR]: [
    {
      nome: 'Força Bruta',
      custoEnergia: 4,
      descricao: 'Soma sua Força × 3 no dano de ataques físicos.',
      efeitos: [
        {
          tipo: RolagemEfeitoTipoEnum.DANO_ATRIBUTO,
          atributo: 'forca',
          multiplicador: 3,
          tipoDano: TipoDanoEnum.FISICO,
          alvo: RolagemEfeitoAlvoEnum.DANO,
        },
      ],
    },
    { nome: 'Golpe Devastador', custoEnergia: 3, descricao: 'Em um ataque físico, após rodar o dano, pode selecionar dados que obtiveram seu valor máximo e rodá-los novamente.' },
    { nome: 'Golpe Frenético', custoEnergia: 4, descricao: 'Ao acertar um ataque físico corpo a corpo, desfere um segundo ataque físico imediato contra o mesmo alvo. Caso este segundo ataque acerte, adiciona Luta × 2 ao dano.' },
    { nome: 'Peso Pesado', custoEnergia: 3, descricao: 'Em armas corpo a corpo, adiciona o peso da sua arma ao dano causado.' },
    { nome: 'Postura de Ataque', custoEnergia: 2, descricao: 'Para cada turno seguido atacando o mesmo ser, mesmo que falhando em seus testes, recebe +2 no dano (Limite Luta turnos para acumulação).' },
    { nome: 'Reforço Adrenalizado', custoEnergia: 0, descricao: 'Ao entrar na condição Machucado, recebe +3 em testes de Força e Luta e +1 dado de dano em armas de dano físico até o fim da cena.' },
    { nome: 'Vingativo', custoEnergia: 5, descricao: 'Ao receber 25% ou mais de sua vida máxima em um único golpe, adiciona +2 dados de dano ao seu próximo ataque no mesmo ser.' },
  ],
  [ArquetipoEnum.MERCENARIO]: [
    { nome: 'Munição Eficiente', custoEnergia: 0, descricao: 'Uma vez por pacote de munição, ao utilizá-lo quando cheio, a primeira cena não é gasta.' },
    { nome: 'Linha de Frente', custoEnergia: 3, descricao: 'Utilizando uma arma de fogo em alcance curto, recebe +1 dado no teste.' },
    { nome: 'Mira de Elite', custoEnergia: 1, descricao: 'Ao mirar, aumenta +1 dado no teste do ataque.' },
    { nome: 'Pistoleiro', custoEnergia: 4, descricao: 'Soma sua Destreza × 3 no dano de ataques à distância.' },
    { nome: 'Ricochete', custoEnergia: 3, descricao: 'Atira de forma inesperada para acertar um alvo, reduzindo seu teste em 2 dados e a reação do alvo em 5.' },
    { nome: 'Sobrecarga', custoEnergia: null, descricao: 'Para cada oponente na cena gasta 3 E para receber +1 no teste ou +2 no dano de seus ataques até o fim da cena. A diminuição do número de oponentes reduz os efeitos da habilidade.' },
    { nome: 'Treinamento Avançado', custoEnergia: 2, descricao: 'Não recebe penalidade por ter aliados adjacentes a um alvo ao realizar um disparo e em ataques em área, concede +Pontaria no teste dos aliados.' },
  ],
  [ArquetipoEnum.VANGUARDA]: [
    { nome: 'Tanque', custoEnergia: 0, descricao: 'Aumenta as resistências de todas as proteções em +3 e recebe +1 de Vida por progressão.' },
    { nome: 'Golpe Pesado', custoEnergia: 2, descricao: 'Soma também seu Vigor ao dano de armas de dano físico.' },
    { nome: 'Investida Implacável', custoEnergia: 5, descricao: 'Reduz a defesa do alvo em Vigor ÷ 2 pontos, e caso obtenha um crítico no ataque, reduz a defesa em Vigor pontos.' },
    { nome: 'Jogo de Corpo', custoEnergia: 2, descricao: 'Muda o atributo de ataque de uma arma corpo a corpo de Luta para Vigor.' },
    { nome: 'Postura Defensiva', custoEnergia: 3, descricao: 'Quando um aliado em até Destreza metros for receber um golpe, pode se colocar no lugar dele, recebendo o dano direto.' },
    { nome: 'Resiliente', custoEnergia: 3, descricao: 'Soma seu Vigor em sua resistência Física.' },
    { nome: 'Vai e Volta', custoEnergia: 3, descricao: 'Se o ataque do atacante for inferior em ao menos 5 pontos da sua defesa, te garante um contra-ataque no alvo.' },
  ],
  [ArquetipoEnum.ENGENHEIRO]: [
    { nome: 'Modificação Improvisada', custoEnergia: 0, descricao: 'Uma vez por cena e por item, utilizando sua ação de movimento, adiciona uma modificação (ou empilhamento) à um equipamento seu ou de um aliado adjacente até o fim da cena. Não segue a regra de Bloqueio ou Limite de Empilhamentos da modificação. Requer um teste de Intelecto DT 15. Em caso de falha, dura apenas 2 turnos.' },
    { nome: 'Aprimoramento', custoEnergia: 3, descricao: 'Usando sua ação de movimento, você otimiza um equipamento seu ou de um aliado adjacente por uma cena. Escolha um efeito: +1 dado em testes/uso ; +3 no resultado de testes/uso ; +2 de dano fixo ; +1 dado de dano ; +3 de resistência de um tipo à escolha (apenas proteções). Cada item só pode receber essa otimização uma vez por cena. Requer um teste de Intelecto DT 15. Em caso de falha, dura apenas 2 turnos.' },
    { nome: 'Carga Dirigida', custoEnergia: 3, descricao: 'Ao lançar uma granada ou ativar um explosivo em área, você redireciona a explosão em um cone de 90° à sua frente. O alcance da área reduz em 1 m (mínimo 1m). Alvos dentro da área sofrem -1 dado nas reações contra a explosão.' },
    { nome: 'Demolidor', custoEnergia: 3, descricao: 'Após realizar o dano de uma Granada ou Escopeta, pode utilizar esta habilidade para adicionar +1 dado de dano para cada dado de valor máximo obtido.' },
    { nome: 'KABOOM', custoEnergia: 2, descricao: 'Pode arremessar duas granadas simultaneamente.' },
    { nome: 'Protocolo de Missão', custoEnergia: 0, descricao: 'No início da missão, o Engenheiro pode escolher até Intelecto ÷ 2 equipamentos para calibrar. Durante a primeira cena de seu uso, o item recebe +2 nos testes.' },
    { nome: 'Sobrecarregar', custoEnergia: 4, descricao: 'Triplica os bônus de um item atualmente afetado por "Aprimoramento" ou "Protocolo de Missão" por Intelecto ÷ 2 turnos. Ao fim da duração reduz um estágio de durabilidade. Não pode ser utilizado em equipamentos já Danificados.' },
  ],
  [ArquetipoEnum.ASSASSINO]: [
    { nome: 'Ceifador', custoEnergia: 6, descricao: 'Muda o dano furtivo de 1D6 para 1D8 e dobra o valor fixo (Ex: 2D6+2 se torna 2D8+4).' },
    { nome: 'Atacante Furtivo', custoEnergia: 0, descricao: 'Adiciona Destreza × 2 ao seu dano furtivo.' },
    { nome: 'Gatuno', custoEnergia: 3, descricao: 'Entrar em furtivo consta como uma ação de movimento.' },
    { nome: 'Lâmina Letal', custoEnergia: 5, descricao: 'Em caso de ataques críticos, aumenta seus dados de dano furtivo em 1 tipo.' },
    { nome: 'Predador Invisível', custoEnergia: 3, descricao: 'Ao acertar um ataque furtivo, causa a condição Abalado. Em ataques críticos causa Vulnerável por 2 turnos.' },
    { nome: 'Pressentimento', custoEnergia: 2, descricao: 'Pode descobrir com certeza se está furtivo ou não.' },
    { nome: 'Sombra', custoEnergia: 1, descricao: 'Ao utilizar armas corpo a corpo leves, pistolas ou rifles de precisão, recebe +2 em seus testes.' },
  ],
  [ArquetipoEnum.ACADEMICO]: [
    { nome: 'Sabichão', custoEnergia: 0, descricao: 'Críticos em testes onde o efeito não é dano constam como +3 no resultado e críticos em testes de ataque concedem +1 no resultado.' },
    { nome: 'Classificação de Campo', custoEnergia: 3, descricao: 'Ao analisar uma criatura por 1 turno, realiza um teste de Intelecto DT 10 para ameaças Nulas e +5 por Nível de Ameaça. Obter sucesso aplica um dos efeitos: -2 Esquiva, -2 Bloqueio, -2 Defesa, -3 resistência a um tipo de dano, +2 em ataques contra ela, +1 dado de dano em ataques contra ela, -2 nos ataques da criatura, +Intelecto de uma fraqueza já existente ou +2 para reações de habilidades dela. Usos múltiplos na cena acumulam efeitos e dobram o custo de forma acumulada.' },
    { nome: 'Controle de Variáveis', custoEnergia: 3, descricao: 'Ao falhar em um teste de Intelecto, Medicina ou Sentidos, pode refazê-lo com -2 dados.' },
    { nome: 'Dedução em Cascata', custoEnergia: 1, descricao: 'Uma vez por turno, ao obter um sucesso em qualquer ação de investigação, pode realizar uma segunda ação de investigação diferente como ação livre.' },
    { nome: 'Enciclopédia Viva', custoEnergia: 2, descricao: 'Realiza um teste de Intelecto para acessar conhecimento armazenado sobre uma criatura, anomalia ou situação sem precisar observá-la diretamente. A DT inicia em 10 para ameaças Nulas e aumenta em +5 por Nível de Ameaça.' },
    { nome: 'Micro Detalhes', custoEnergia: 3, descricao: 'Pode estender uma ação de investigação por quantos turnos precisar, recebendo +3 no teste para cada turno aguardado. Ser interrompido cancela o teste e todos os bônus acumulados.' },
    { nome: 'Perito', custoEnergia: 2, descricao: 'Durante cenas de investigação, recebe +1 dado em qualquer teste de Destreza, Intelecto, Sentidos, Social ou Medicina.' },
  ],
  [ArquetipoEnum.PARAMEDICO]: [
    { nome: 'Feito para Isso', custoEnergia: 0, descricao: 'Ao se aproximar de um aliado que esteja Machucado, ou Morrendo ou com menos da metade da vida, recebe um terço a mais de deslocamento.' },
    { nome: 'Curandeiro', custoEnergia: 3, descricao: 'Aumenta a efetividade dos dados de um item medicinal em 1 tipo.' },
    { nome: 'Necromante', custoEnergia: null, descricao: 'Uma vez por aliado, pode reiniciar a DT de Morrendo ao custo de metade do valor da DT em Energia.' },
    { nome: 'Restauração Prolongada', custoEnergia: 4, descricao: 'Ao curar um aliado, no turno seguinte, recupera a mesma quantidade de dados utilizados na cura anterior em dados D4.' },
    { nome: 'Socorrista', custoEnergia: 3, descricao: 'Recebe +2 em testes de Medicina e permite curar aliados que estejam Morrendo (recuperando metade do valor curado).' },
    { nome: 'Técnico de Emergência', custoEnergia: 2, descricao: 'Curar aliados que estejam com menos da metade da vida máxima aumenta a efetividade da cura em 1 tipo (limite D12).' },
    { nome: 'Tratamento Rápido', custoEnergia: 2, descricao: 'Aplicar um item medicinal em um aliado se torna ação de movimento.' },
  ],
  [ArquetipoEnum.DIPLOMATA]: [
    { nome: 'Tom Certo', custoEnergia: 2, descricao: 'Antes de declarar sua abordagem social pode realizar um teste de Social (DT 15) como ação de movimento. Em caso de sucesso, descobre a abordagem ideal para o momento. Caso mude para a abordagem revelada, recebe +1 dado no teste.' },
    { nome: 'Acesso Privilegiado', custoEnergia: 2, descricao: 'Ao interagir com um NPC que seja Colaborativo ou Amigável, recebe +2 dados no teste. Caso tenha sucesso, o NPC irá compartilhar voluntariamente algo que consideraria sigiloso com qualquer outro interlocutor.' },
    { nome: 'Avaliação Instintiva', custoEnergia: 0, descricao: 'Consegue identificar o Nível de Cooperação de um ser após 3 turnos interagindo com ele.' },
    { nome: 'Carta na Mesa', custoEnergia: 3, descricao: 'Antes de iniciar uma interação social, pode declarar ter uma informação, objeto ou vantagem como moeda de troca (real ou inventada). O NPC automaticamente se torna Neutro, independente do estado inicial. Qualquer Barganha feita com ele nesta cena recebe +2 dados. Se a moeda de troca for falsa e o NPC descobrir (Intelecto DT Social), ele se torna imediatamente Hostil. Pode ser usada uma vez por NPC.' },
    { nome: 'Intervenção', custoEnergia: 6, descricao: 'Uma vez por cena, quando um aliado em alcance curto falha em um teste de Vontade relacionado à Sanidade, realiza um teste de Social (DT 15 + diferença entre a DT e o resultado do aliado). Se suceder, a sequela se torna apenas –1 em testes de Vontade até o fim da cena. Não pode ser usado contra traumas já estabelecidos.' },
    { nome: 'Terapia Improvisada', custoEnergia: 4, descricao: 'Uma vez por cena, pode remover temporariamente uma sequela à escolha de um aliado por Social ÷ 2 cenas.' },
    { nome: 'Tratamento Psicológico', custoEnergia: 6, descricao: 'Durante uma missão, uma vez por pessoa, durante um descanso médio, pode remover uma sequela do mesmo. Essa habilidade pode ser usada novamente na mesma pessoa caso ela adquira uma nova sequela.' },
  ],
  [ArquetipoEnum.COMANDANTE]: [
    { nome: 'Extrair Potencial', custoEnergia: 0, descricao: 'Para cada aliado presente, uma vez por cena, ao escolhê-lo, aumenta os testes de um atributo dele à sua escolha em +Intelecto por Intelecto turnos. Não pode ser usado em si mesmo ou enquanto já estiver ativo.' },
    { nome: 'Análise Tática', custoEnergia: 3, descricao: 'Uma vez por cena, acha uma vantagem contra o oponente atual no cenário, garantindo +Intelecto nos testes para você, e todos os seus aliados por 1D4+1 turnos (+7 E para mudar para 2D4+2).' },
    { nome: 'Assalto Estratégico', custoEnergia: 5, descricao: 'Escolha até três aliados (podendo ser si mesmo). No próximo ataque, eles recebem +1 dado e +3 no resultado do teste. Aliados já escolhidos no último turno não podem ser escolhidos.' },
    { nome: 'Comando', custoEnergia: 3, descricao: 'Escolha dois aliados em seu campo de visão. Você poderá coordená-los em ação, concedendo um ataque simples à eles neste turno. Aliados só podem ser comandados uma vez por turno (+5 E para adicionar o uso de 1 (uma) habilidade e +2 E para adicionar mais um uso de habilidade por gasto).' },
    { nome: 'Levantar Guarda', custoEnergia: 3, descricao: 'Obriga o alvo a fazer um teste de Intelecto (DT Sentidos), se o alvo falhar, ele expõe suas intenções claramente, te permitindo alertar aliados em alcance curto, aumentado a defesa deles e a sua própria em Intelecto ÷ 2 pontos por 2 turnos. Se o alvo passar, reduz para apenas 1 turno (Para cada uso desta habilidade em cena, a DT necessária reduz em 3 pontos).' },
    { nome: 'Ordem Direta', custoEnergia: 5, descricao: 'Todos os aliados em alcance médio recebem +1 dado em seu próximo ataque, e caso estejam com menos da metade de sua vida máxima, recebem também +3 no resultado.' },
    { nome: 'Ponto Vital', custoEnergia: 3, descricao: 'Obriga o alvo a fazer um teste de Intelecto (DT Sentidos), se o alvo falhar você acha uma vulnerabilidade exposta, inibindo-o de Bloquear um ataque e recebendo +3 no teste do mesmo, mas se ele passar, apenas adiciona +1 dado no teste. Declarar isso para sua equipe concede o bônus à eles e retira de você.' },
  ],
};

/**
 * Gerais Melhoradas por arquétipo — versão buffada de uma Geral, exclusiva daquele arquétipo
 * (`sistema-v4.1.0.md`). Só aparecem para o próprio arquétipo da ficha. PLACEHOLDER.
 */
export const HABILIDADES_GERAIS_MELHORADAS: Readonly<
  Record<ArquetipoEnum, readonly HabilidadeBaseDto[]>
> = {
  [ArquetipoEnum.LUTADOR]: [
    { nome: 'Contra-Ataque', custoEnergia: 2, descricao: '(Reação) Soma sua Luta na sua Defesa ao reagir, caso o atacante não à ultrapasse, garante um ataque físico direto no ser, rolando apenas o dano da arma em mãos.' },
    { nome: 'Persistência', custoEnergia: 4, descricao: 'Caso tenha errado o último ataque, recebe +1 dado e +2 no resultado do próximo ataque.' },
  ],
  [ArquetipoEnum.MERCENARIO]: [
    { nome: 'Queima-Roupa', custoEnergia: 0, descricao: 'Recebe +2 dados de dano ao estar adjacente ao seu alvo durante um disparo e reduz a defesa em -2.' },
    { nome: 'Atirador Calculista', custoEnergia: 3, descricao: 'Ao mirar em um alvo, soma sua Pontaria ao teste de ataque.' },
  ],
  [ArquetipoEnum.VANGUARDA]: [
    { nome: 'Contra-Ataque', custoEnergia: 2, descricao: '(Reação) Soma sua Luta ÷ 2 ou Vigor ÷ 2 na sua Defesa ao reagir, caso o atacante não à ultrapasse, garante um ataque físico direto no ser, rolando apenas o dano da arma em mãos.' },
    { nome: 'Defesa Precisa', custoEnergia: 2, descricao: 'Recebe +2 de Defesa.' },
  ],
  [ArquetipoEnum.ENGENHEIRO]: [
    { nome: 'Especialista em Explosivos', custoEnergia: 4, descricao: 'Reduz o raio de explosão da granada em 1 metro e aumenta em 1 tipo os dados de dano e adiciona +1 dado ao dano.' },
    { nome: 'Mochileiro', custoEnergia: 0, descricao: 'Muda o atributo de cálculo do inventário de Força para Intelecto.' },
  ],
  [ArquetipoEnum.ASSASSINO]: [
    { nome: '6º Sentido', custoEnergia: 0, descricao: 'Permite-lhe reagir a ataques surpresa, sem penalidade de redução de Defesa e adicionando metade de sua Destreza.' },
    { nome: 'Passos Furtivos', custoEnergia: 3, descricao: 'Em testes de Destreza para furtividade, recebe +1 dado e +2 no teste.' },
  ],
  [ArquetipoEnum.ACADEMICO]: [
    { nome: 'Analisar Cenário', custoEnergia: 2, descricao: 'Refaz um teste em um local já explorado ou investigado, recebendo +3 no resultado ou +1 dado no teste.' },
    { nome: 'Raciocínio Dedutivo', custoEnergia: 3, descricao: 'Ao realizar um teste de Intelecto para análise de pistas ou informações, recebe +1 dado e +3 no teste.' },
  ],
  [ArquetipoEnum.PARAMEDICO]: [
    { nome: 'Cuidados Básicos', custoEnergia: 3, descricao: 'Ao curar um ser, caso um dado de cura tenha tirado um valor inferior à metade de sua Medicina, pode rodar um dado de cura igual extra.' },
    { nome: 'Tratamento Eficaz', custoEnergia: 0, descricao: 'Ao remover um aliado de Morrendo com um crítico, pode curá-lo metade do valor de cura do item.' },
  ],
  [ArquetipoEnum.DIPLOMATA]: [
    { nome: 'Charlatão', custoEnergia: 3, descricao: 'Recebe +2 dados e +2 no resultado em um teste de Social.' },
    { nome: 'Charme', custoEnergia: 2, descricao: 'Ao falhar em um teste de Social contra uma pessoa, pode força-lo com +1 dado. Falhar irá reduzir o Nível de Cooperação 1.' },
  ],
  [ArquetipoEnum.COMANDANTE]: [
    { nome: 'Observador Astuto', custoEnergia: 3, descricao: 'Uma vez por ser, ao observá-lo por 1 turno completo, recebe +2 dados ou +5 no próximo teste contra o ser.' },
    { nome: 'Planejamento Tático', custoEnergia: 4, descricao: 'Antes de uma cena de combate, você e seus aliados reajustam suas estratégias e se preparam para ocasionais combates, concedendo +1 dado ou +2 em uma ação a escolha (Limite de até +4 dados e +8 no teste).' },
  ],
};

/**
 * Habilidades de Subclasse (Experimentos) — inclui a Habilidade Inicial como primeiro item. Só
 * aparecem para a própria subclasse da ficha. PLACEHOLDER.
 */
export const HABILIDADES_SUBCLASSE: Partial<
  Record<ClasseEnum, readonly HabilidadeBaseDto[]>
> = {
  [ClasseEnum.EXPERIMENTO_BESTIAL]: [
    { nome: 'Musculatura de Impacto', custoEnergia: 0, descricao: 'Cada vez que acertar um ataque corpo a corpo, ganha +1 ponto de Reforço com um máximo de Vigor pontos de reforço. Para cada ponto de reforço, pode aumentar +1 dado de dano ou +3 de resistência de um tipo à escolha. Ao atingir 4 ou mais pontos de reforço, pode realizar um ataque extra com +2 dados no teste ou +3 em defesa, reiniciando os pontos. Os pontos também reiniciam ao fim da cena.' },
    { nome: 'Adaptabilidade', custoEnergia: 4, descricao: 'Após receber 8 - Vigor golpes de um ser específico, recebe +3 em sua Defesa e +1 dado em testes de reação contra quaisquer ataques daquele ser até o fim da cena.' },
    { nome: 'Carapaça Excessiva', custoEnergia: 0, descricao: 'Pode exceder seu limite padrão de vida ao ser curado de forma externa, podendo passar desse limite em até Vigor × 10.' },
    { nome: 'Casca Grossa', custoEnergia: 6, descricao: '(Reação) Escolhendo esta habilidade juntamente do Bloquear, recebe resistência a Dano Geral igual a (1D4 + 2) × Vigor nesta rodada, mas anula sua resistência Físico/Balístico no próximo turno.' },
    { nome: 'Cicatrização Acelerada', custoEnergia: 5, descricao: 'Utilizando sua ação de movimento, até Vigor vezes por cena, recupera Vigor dados de quatro faces (D4) de Vida (+5 E para mudar para dados de seis faces (D6) de cura).' },
    { nome: 'Fúria Controlada', custoEnergia: 6, descricao: 'Ao obter um crítico em um ataque corpo a corpo, pode ativar esta habilidade. Adiciona Força ÷ 2 dados do maior tipo da arma usada ao dano (não é afetado por críticos).' },
    { nome: 'Musculatura Bestial', custoEnergia: null, descricao: 'Ao gastar 17 - Força de Energia, durante uma cena, armas corpo a corpo de duas mãos são consideradas de uma mão para você.' },
    { nome: 'Reação Anômala', custoEnergia: null, descricao: 'Uma vez por turno, pode adicionar o valor do atributo ao resultado de um teste de resistência ou reação, sendo este valor o custo da habilidade.' },
    { nome: 'Seu Oponente sou EU!', custoEnergia: 4, descricao: 'Escolha um ser visível em alcance médio. Ele realiza um teste de Vontade (DT Vigor). Se falhar, recebe a condição Provocado por você, até você ficar Morrendo, Inconsciente ou a cena terminar. Enquanto o alvo estiver Provocado, você ganha +Destreza ÷ 2 em Defesa contra ataques originados dele.' },
    { nome: 'Vampirismo', custoEnergia: 1, descricao: 'Ao acertar um ataque, pode recuperar 1D3 × (Nível ÷ 4) (mínimo 1).' },
    { nome: 'Peculiaridade', custoEnergia: 0, descricao: 'Ao criar seu agente, escolha uma característica anômala, ela lhe concederá um bônus e uma penalidade desconhecida substituindo seus bônus originais de Origem.' },
  ],
  [ClasseEnum.EXPERIMENTO_ARTIFICIAL]: [
    { nome: 'Acúmulo de Conhecimento', custoEnergia: 0, descricao: 'Para cada teste bem sucedido seu nesta cena, recebe +1 em testes com Atributos Mentais, sendo limitado ao seu Intelecto. Falhar em qualquer teste de qualquer atributo zera esse acúmulo.' },
    { nome: 'Anomalia', custoEnergia: 0, descricao: 'Fragmentos custam o dobro de Energia em seu uso, mas têm todos os seus efeitos dobrados.' },
    { nome: 'Varredura Cognitiva', custoEnergia: 7, descricao: 'Ao observar um ser por 1 turno obtém uma informação à escolha: vida atual aproximada, maior Atributo, menor Atributo ou próxima habilidade já declarada. Em caso de crítico revela duas informações.' },
    { nome: 'Sobrecarga Sensorial', custoEnergia: 5, descricao: 'Escolha um alvo em médio alcance. O alvo recebe -1 dado em testes de Atributos Físicos e Mentais (exceto Vigor e Vontade) e tem sua Iniciativa reduzida em 2D4 por 1 + ( Intelecto ÷ 2 ) turnos.' },
    { nome: 'Convergência Lógica', custoEnergia: null, descricao: 'Para cada 2 E gastos, declare um modo antes de gastar: Amplificado: recebe +1 em qualquer teste. Em ataques, a cada +3 acumulados via esta habilidade, ganha +1 dado de dano. Interferência: um alvo visível em alcance médio recebe -1 em todos os testes por 1 turno. Limitado a Intelecto × 2 E. Modos não se combinam na mesma ativação.' },
    { nome: 'Colapso', custoEnergia: 6, descricao: 'Realiza um teste de Intelecto (DT Vigor do alvo). Em caso de sucesso, aplica Fraqueza de valor Intelecto a um tipo de dano à escolha por 1D3+1 turnos. Em caso de crítico, a Fraqueza aumenta para Intelecto × 2 e a duração para 1D3+3 turnos.' },
    { nome: 'Descarga Elétrica', custoEnergia: 5, descricao: 'Reativa: Ao estar Agarrado ou Imobilizado: o ser que te mantém recebe -5 no teste de manutenção. Proativa: Escolha uma das formas ao ativar: [Raio 2m]: (Intelecto + 1) D4 de dano Químico. Destreza DT Destreza anula o dano. [Cone 3m]: (Intelecto + 1) D6 de dano Químico. -1 dado nas reações dos atingidos. [Linha 4m]: (Intelecto + 1) D8 de dano Químico. -2 dados nas reações dos atingidos.' },
    { nome: 'Interferência', custoEnergia: 6, descricao: 'Escolha um observador visível e até Intelecto ÷ 2 seres. O observador não consegue perceber esses seres por Intelecto ÷ 2 turnos. Qualquer teste de Sentidos para detectá-los falha automaticamente. O efeito cessa em um aliado caso ele ataque o observador ou realize uma ação barulhenta.' },
    { nome: 'Morfologia', custoEnergia: null, descricao: 'Uma vez por missão, recebe uma habilidade que será extremamente útil na missão de acordo com o mestre ao custo de 2 habilidades por turno.' },
    { nome: 'Telepatia', custoEnergia: null, descricao: 'Em alcance longo, consegue se comunicar com aliados à escolha durante uma cena, gastando a quantidade de aliados × 2 em Energia, podendo conectar novos aliados a “linha de comunicação” pelo custo de 3 E cada.' },
    { nome: 'Peculiaridade', custoEnergia: 0, descricao: 'Ao criar seu agente, escolha uma característica anômala, ela lhe concederá um bônus e uma penalidade desconhecida substituindo seus bônus originais de Origem.' },
  ],
  [ClasseEnum.EXPERIMENTO_HIBRIDO]: [
    { nome: 'Mutável', custoEnergia: 0, descricao: 'Escolha até 3 mutações no início da missão (mínimo uma mutação). Uma mutação consiste em dar +3 nos testes de um atributo e -5 no de outro à escolha (sem repetir).' },
    { nome: 'Absorver', custoEnergia: 4, descricao: 'Ao absorver um pedaço de uma criatura, recebe +Atributo no resultado de testes do atributo correspondente ao maior atributo da criatura até o fim da cena. Caso a criatura tenha a VD superior a 5× seu Nível, você perde 1D4 de Vida para cada 5 de VD acima. Utilizar a habilidade novamente, substitui o bônus recebido anteriormente.' },
    { nome: 'Exoesqueleto', custoEnergia: 4, descricao: 'Por Vigor ÷ 2 turnos, seu corpo gera uma proteção anômala, recebendo 2D6 de resistência a Dano Físico-Balístico OU +3 em Defesa. Ao fim da duração recebe -2 em todos os testes físicos por 1 turno.' },
    { nome: 'Conexão Bizarra', custoEnergia: 5, descricao: 'Ao marcar um aliado, pode aumentar a Defesa dele em Vigor ÷ 2 pontos, mas caso ele recebe qualquer quantia de dano, causa Vontade × 2 pontos de Dano Geral em você limitado à uma vez por rodada.' },
    { nome: 'Fluido Medicinal', custoEnergia: 3, descricao: 'Ao usar um item medicinal em um ser, despeja um fluido anômalo que melhora a cicatrização e efeitos, melhorando os dados em 1 tipo.' },
    { nome: 'Instabilidade Controlada', custoEnergia: 3, descricao: 'Ao realizar qualquer teste, role 1D6 separadamente e adicione o resultado ao maior valor obtido no teste. Usar mais de uma vez na cena aumenta o custo em +2 E cumulativos.' },
    { nome: 'Investida Aberrante', custoEnergia: 3, descricao: 'Pode se deslocar até o dobro do seu deslocamento em linha reta.' },
    { nome: 'Metabolismo Acelerado', custoEnergia: 0, descricao: 'Ao realizar um Descanso Médio ou Longo, adiciona Medicina dados D4 de Vida e Vontade dados D4 de Energia à recuperação normal, além dos dados base do descanso.' },
    { nome: 'Simbiose Ofensiva', custoEnergia: 4, descricao: 'Ao causar dano em um ser, até o início do seu próximo turno, o primeiro aliado a atacar esse mesmo ser recebe +1 dado ou +3 no resultado do teste de ataque.' },
    { nome: 'Superação Forçada', custoEnergia: 5, descricao: 'Ao receber uma sequela, pode "absorver" o dano mental para seu corpo, reduzindo sua vida máxima em metade do valor da DT necessária.' },
    { nome: 'Peculiaridade', custoEnergia: 0, descricao: 'Ao criar seu agente, escolha uma característica anômala, ela lhe concederá um bônus e uma penalidade desconhecida substituindo seus bônus originais de Origem.' },
  ],
};
