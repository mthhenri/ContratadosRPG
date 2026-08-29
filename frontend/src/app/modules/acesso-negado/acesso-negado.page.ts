import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Icone } from '../../shared/icone/icone.component';
import { Marca } from '../../shared/marca/marca.component';
import { Botao } from '../../shared/ui/botao/botao.component';

export const MENSAGENS_ACESSO_NEGADO = [
  'O artefato requisitado foi removido do índice operacional. Toda referência correlata permanece retida sob protocolo de contenção administrativa.',
  'A credencial apresentada não corresponde ao nível de contenção exigido. Uma nova solicitação dependerá de autorização emitida pela direção regional.',
  'O setor consultado não consta no seu mapa de autorização. A localização de suas instalações foi omitida dos registros acessíveis a este terminal.',
  'A existência deste registro não pode ser confirmada nem negada. Quaisquer inferências produzidas durante a consulta devem ser tratadas como classificadas.',
  'O protocolo de consulta foi interrompido pela administração central. Os fragmentos recuperados foram recolhidos antes da abertura deste documento.',
  'A cadeia de custódia deste material permanece sob sigilo institucional. Nenhum responsável autorizado está disponível para validar sua procedência.',
  'Sua solicitação foi redirecionada para uma unidade não divulgada. O destino e o prazo de análise foram removidos deste comprovante operacional.',
  'O conteúdo associado encontra-se além da sua classificação vigente. A exposição parcial também foi bloqueada por determinação do arquivo central.',
  'Nenhum registro compatível foi localizado para esta credencial. Esta resposta não confirma a ausência de documentos em níveis superiores de acesso.',
  'A referência informada pertence a um arquivo deliberadamente incompleto. Segmentos essenciais foram expurgados antes da distribuição desta cópia.',
  'A autorização temporária vinculada a esta sessão expirou antes da consulta. O material recuperado foi descartado da memória transitória do terminal.',
  'O documento solicitado está sujeito a protocolo de negação plausível. Sua presença nos índices públicos não constitui confirmação de autenticidade.',
  'A localização física deste registro foi expurgada dos sistemas públicos. As rotas de transferência e unidades responsáveis permanecem protegidas.',
  'A leitura foi suspensa por ordem de uma autoridade não identificada. O código de autorização correspondente não está disponível nesta classificação.',
  'Este terminal não possui permissão para reproduzir a informação solicitada. Capturas, transcrições e encaminhamentos foram preventivamente desativados.',
  'A consulta foi encerrada antes da recuperação dos segmentos classificados. Os dados temporários remanescentes foram submetidos a expurgo automático.',
  'O número de protocolo apresentado foi reservado para uma operação inexistente. Registros associados permanecem inacessíveis por prazo indeterminado.',
  'A unidade responsável não reconhece esta solicitação como parte de suas atribuições. Nenhuma rota alternativa de consulta pode ser fornecida.',
  'O material requisitado está subordinado a uma investigação ainda não declarada. A identidade dos responsáveis foi removida desta notificação.',
  'Sua sessão foi classificada como incompatível com o conteúdo pretendido. A tentativa não concede conhecimento sobre a natureza do arquivo protegido.',
  'A consulta alcançou um segmento isolado da rede institucional. O acesso foi interrompido antes que metadados operacionais pudessem ser recuperados.',
  'O identificador informado foi substituído durante uma revisão de segurança. A correspondência atual permanece disponível apenas à administração central.',
  'Este documento exige validação simultânea de credenciais independentes. Nenhuma das autorizações complementares foi localizada para esta sessão.',
  'A classificação do material foi elevada após o último ciclo de auditoria. Permissões concedidas anteriormente não produzem acesso residual.',
  'O arquivo consultado integra um inventário de circulação restrita. Cópias locais e referências externas foram recolhidas por ordem administrativa.',
  'A origem desta requisição não atende aos requisitos de isolamento vigentes. O terminal foi impedido de recuperar até mesmo o resumo do conteúdo.',
  'A janela operacional para esta consulta foi encerrada sem divulgação. Novos períodos de acesso não serão anunciados nesta classificação.',
  'O conteúdo requisitado foi fragmentado entre unidades com autorizações distintas. Este terminal não pode localizar ou recompor as partes protegidas.',
  'A resposta disponível foi submetida a expurgo preventivo antes da transmissão. Nenhuma informação adicional pode ser deduzida de sua extensão.',
  'O responsável pelo arquivo revogou todas as permissões delegadas. A justificativa e a duração da medida permanecem sob classificação superior.',
  'Esta referência aponta para um protocolo substituído por razões operacionais. O histórico de alterações não está disponível fora do arquivo central.',
  'A recuperação foi abortada após uma divergência de credenciais. Todos os trechos obtidos durante a tentativa foram invalidados e novamente classificados.',
] as const;

export const MOLDES_REGISTRO_EXPURGADO = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae justo sed neque varius tempor; vestibulum ante ipsum primis in faucibus.',
  'Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec ullamcorper nulla non metus auctor fringilla, cras mattis consectetur purus sit amet.',
  'Curabitur blandit tempus porttitor. Maecenas faucibus mollis interdum; sed posuere consectetur est at lobortis, donec id elit non mi porta gravida.',
  'Vestibulum id ligula porta felis euismod semper. Aenean lacinia bibendum nulla sed consectetur, vivamus sagittis lacus vel augue laoreet rutrum faucibus.',
  'Nullam quis risus eget urna mollis ornare vel eu leo. Morbi leo risus, porta ac consectetur ac, vestibulum at eros; fusce dapibus tellus ac cursus.',
  'Etiam porta sem malesuada magna mollis euismod. Cras justo odio, dapibus ac facilisis in, egestas eget quam; aliquam erat volutpat sed posuere.',
  'Donec sed odio dui. Aenean eu leo quam, pellentesque ornare sem lacinia quam venenatis vestibulum; nulla vitae elit libero, a pharetra augue.',
  'Sed posuere consectetur est at lobortis. Lorem ipsum dolor sit amet, consectetur adipiscing elit; maecenas sed diam eget risus varius blandit sit amet.',
] as const;

export const FRAGMENTOS_MENSAGEM_EXPURGADOS = [
  'Unidade responsável: ███████████.',
  'Protocolo correlato: ████-████-██.',
  'Autoridade emissora: █████████ ███████.',
  'Localização registrada: setor ███, nível █████.',
  'Data operacional: ██/██/████.',
  'Identificador do artefato: ████████-██.',
  'Destino da transferência: █████████████.',
  'Agente responsável: █████ █████████.',
] as const;

/** Substitui somente letras, mantendo o espaçamento e a pontuação do documento de origem. */
export function expurgarTexto(texto: string): string {
  return texto.replace(/\p{L}/gu, '█');
}

function selecionarAleatorio<T>(itens: readonly T[]): T {
  return itens[Math.floor(Math.random() * itens.length)];
}

/** Destino genérico de uma tentativa autenticada sem a classificação exigida. */
@Component({
  selector: 'app-acesso-negado-page',
  imports: [RouterLink, Icone, Marca, Botao],
  templateUrl: './acesso-negado.page.html',
  styleUrl: './acesso-negado.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcessoNegadoPage {
  protected readonly mensagemSelecionada = `${selecionarAleatorio(MENSAGENS_ACESSO_NEGADO)} ${selecionarAleatorio(FRAGMENTOS_MENSAGEM_EXPURGADOS)}`;
  protected readonly registroExpurgadoSelecionado = expurgarTexto(
    selecionarAleatorio(MOLDES_REGISTRO_EXPURGADO),
  );
}
