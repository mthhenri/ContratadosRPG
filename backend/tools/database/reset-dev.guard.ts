export interface ConfiguracaoResetDev {
  readonly ambiente: 'development';
  readonly host: 'localhost' | '127.0.0.1';
  readonly porta: number;
  readonly nome: 'contratados_rpg';
  readonly usuario: 'postgres';
  readonly senha: string;
  readonly armazenamentoProvedor: 'local';
}

function obterVariavelObrigatoria(ambiente: NodeJS.ProcessEnv, chave: string): string {
  const valor = ambiente[chave];
  if (!valor) {
    throw new Error(`Reset recusado: variável ${chave} ausente.`);
  }
  return valor;
}

export function validarConfiguracaoResetDev(
  ambiente: NodeJS.ProcessEnv,
): ConfiguracaoResetDev {
  const appAmbiente = obterVariavelObrigatoria(ambiente, 'APP_AMBIENTE');
  const host = obterVariavelObrigatoria(ambiente, 'DB_HOST');
  const porta = Number(obterVariavelObrigatoria(ambiente, 'DB_PORT'));
  const nome = obterVariavelObrigatoria(ambiente, 'DB_NOME');
  const usuario = obterVariavelObrigatoria(ambiente, 'DB_USUARIO');
  const senha = obterVariavelObrigatoria(ambiente, 'DB_SENHA');
  const armazenamentoProvedor = obterVariavelObrigatoria(
    ambiente,
    'ARMAZENAMENTO_PROVEDOR',
  );

  if (appAmbiente !== 'development') {
    throw new Error('Reset recusado: APP_AMBIENTE deve ser development.');
  }
  if (host !== 'localhost' && host !== '127.0.0.1') {
    throw new Error('Reset recusado: DB_HOST deve apontar para a máquina local.');
  }
  if (!Number.isInteger(porta) || porta < 1 || porta > 65535) {
    throw new Error('Reset recusado: DB_PORT deve ser uma porta TCP válida.');
  }
  if (nome !== 'contratados_rpg') {
    throw new Error('Reset recusado: DB_NOME deve ser contratados_rpg.');
  }
  if (usuario !== 'postgres') {
    throw new Error('Reset recusado: DB_USUARIO deve ser postgres.');
  }
  if (armazenamentoProvedor !== 'local') {
    throw new Error('Reset recusado: ARMAZENAMENTO_PROVEDOR deve ser local.');
  }

  return {
    ambiente: appAmbiente,
    host,
    porta,
    nome,
    usuario,
    senha,
    armazenamentoProvedor,
  };
}
