-- Task 01: fundação privada da V1 local. Não recebe WAV, credencial ou jobs cloud.
-- Identificadores UUID não são reutilizáveis; PKs seguem BaseEntity numérica.
-- UP

CREATE TABLE tipo_execucao_transcricao_estado (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  codigo VARCHAR NOT NULL,
  descricao VARCHAR NOT NULL,
  CONSTRAINT pk_tipo_execucao_transcricao_estado PRIMARY KEY (id)
);
CREATE TRIGGER trg_tipo_execucao_transcricao_estado_updated_date BEFORE UPDATE ON tipo_execucao_transcricao_estado
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE sessao_transcricao (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  identificador UUID NOT NULL,
  campanha_id INTEGER NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  arquivada BOOLEAN NOT NULL,
  CONSTRAINT pk_sessao_transcricao PRIMARY KEY (id),
  CONSTRAINT fk_sessao_transcricao_campanha FOREIGN KEY (campanha_id) REFERENCES campanha (id),
  CONSTRAINT uix_sessao_transcricao_identificador UNIQUE (identificador),
  CONSTRAINT chk_sessao_transcricao_titulo CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 120)
);
CREATE TRIGGER trg_sessao_transcricao_updated_date BEFORE UPDATE ON sessao_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE faixa_transcricao (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  identificador UUID NOT NULL,
  sessao_transcricao_id INTEGER NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  participante VARCHAR(255) NOT NULL,
  deslocamento_milissegundos BIGINT NOT NULL,
  execucao_selecionada_id INTEGER,
  CONSTRAINT pk_faixa_transcricao PRIMARY KEY (id),
  CONSTRAINT fk_faixa_transcricao_sessao FOREIGN KEY (sessao_transcricao_id) REFERENCES sessao_transcricao (id),
  CONSTRAINT uix_faixa_transcricao_identificador UNIQUE (identificador),
  CONSTRAINT chk_faixa_transcricao_nome CHECK (char_length(btrim(nome_arquivo)) BETWEEN 1 AND 255),
  CONSTRAINT chk_faixa_transcricao_participante CHECK (char_length(btrim(participante)) BETWEEN 1 AND 255),
  CONSTRAINT chk_faixa_transcricao_deslocamento CHECK (deslocamento_milissegundos BETWEEN -9007199254740991 AND 9007199254740991)
);
CREATE TRIGGER trg_faixa_transcricao_updated_date BEFORE UPDATE ON faixa_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE execucao_transcricao (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  identificador UUID NOT NULL,
  faixa_transcricao_id INTEGER NOT NULL,
  tipo_execucao_transcricao_estado_id INTEGER NOT NULL,
  motor VARCHAR NOT NULL,
  versao_motor VARCHAR NOT NULL,
  idioma VARCHAR NOT NULL,
  configuracao JSONB NOT NULL,
  CONSTRAINT pk_execucao_transcricao PRIMARY KEY (id),
  CONSTRAINT fk_execucao_transcricao_faixa FOREIGN KEY (faixa_transcricao_id) REFERENCES faixa_transcricao (id),
  CONSTRAINT fk_execucao_transcricao_estado FOREIGN KEY (tipo_execucao_transcricao_estado_id) REFERENCES tipo_execucao_transcricao_estado (id),
  CONSTRAINT uix_execucao_transcricao_identificador UNIQUE (identificador),
  CONSTRAINT uix_execucao_transcricao_faixa_id UNIQUE (faixa_transcricao_id, id),
  CONSTRAINT chk_execucao_transcricao_configuracao CHECK (jsonb_typeof(configuracao) = 'object')
);
CREATE TRIGGER trg_execucao_transcricao_updated_date BEFORE UPDATE ON execucao_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE segmento_transcricao (
  id SERIAL NOT NULL,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  identificador UUID NOT NULL,
  execucao_transcricao_id INTEGER NOT NULL,
  inicio_milissegundos BIGINT NOT NULL,
  fim_milissegundos BIGINT NOT NULL,
  texto_original TEXT NOT NULL,
  texto_corrigido TEXT,
  revisao INTEGER NOT NULL,
  CONSTRAINT pk_segmento_transcricao PRIMARY KEY (id),
  CONSTRAINT fk_segmento_transcricao_execucao FOREIGN KEY (execucao_transcricao_id) REFERENCES execucao_transcricao (id),
  CONSTRAINT uix_segmento_transcricao_execucao_identificador UNIQUE (execucao_transcricao_id, identificador),
  CONSTRAINT chk_segmento_transcricao_intervalo CHECK (inicio_milissegundos >= 0 AND fim_milissegundos >= inicio_milissegundos AND fim_milissegundos <= 9007199254740991),
  CONSTRAINT chk_segmento_transcricao_revisao CHECK (revisao >= 1)
);
CREATE TRIGGER trg_segmento_transcricao_updated_date BEFORE UPDATE ON segmento_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE UNIQUE INDEX uix_tipo_execucao_transcricao_estado_codigo_ativo
  ON tipo_execucao_transcricao_estado (codigo) WHERE is_deleted = false;
INSERT INTO tipo_execucao_transcricao_estado (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PENDENTE', 'Pendente', NOW(), NOW(), false
UNION ALL SELECT 'EM_PROCESSAMENTO', 'Em processamento', NOW(), NOW(), false
UNION ALL SELECT 'CONCLUIDA', 'Concluída', NOW(), NOW(), false
UNION ALL SELECT 'FALHA', 'Falha', NOW(), NOW(), false
UNION ALL SELECT 'CANCELADA', 'Cancelada', NOW(), NOW(), false;

ALTER TABLE faixa_transcricao ADD CONSTRAINT fk_faixa_transcricao_execucao_selecionada
  FOREIGN KEY (id, execucao_selecionada_id)
  REFERENCES execucao_transcricao (faixa_transcricao_id, id);
CREATE INDEX ix_sessao_transcricao_campanha ON sessao_transcricao (campanha_id, arquivada, id)
  WHERE is_deleted = false;
CREATE INDEX ix_faixa_transcricao_sessao ON faixa_transcricao (sessao_transcricao_id, id);
CREATE INDEX ix_execucao_transcricao_faixa ON execucao_transcricao (faixa_transcricao_id);
CREATE INDEX ix_execucao_transcricao_estado ON execucao_transcricao (tipo_execucao_transcricao_estado_id);
CREATE INDEX ix_segmento_transcricao_execucao_tempo
  ON segmento_transcricao (execucao_transcricao_id, inicio_milissegundos, identificador);

-- Resultado original/tempo não mudam em reenvio ou correção editorial.
CREATE FUNCTION fn_segmento_transcricao_preservar_original() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.identificador IS DISTINCT FROM OLD.identificador
     OR NEW.execucao_transcricao_id IS DISTINCT FROM OLD.execucao_transcricao_id
     OR NEW.inicio_milissegundos IS DISTINCT FROM OLD.inicio_milissegundos
     OR NEW.fim_milissegundos IS DISTINCT FROM OLD.fim_milissegundos
     OR NEW.texto_original IS DISTINCT FROM OLD.texto_original THEN
    RAISE EXCEPTION 'Original e identidade do segmento são imutáveis';
  END IF;
  IF NEW.texto_corrigido IS DISTINCT FROM OLD.texto_corrigido
     AND NEW.revisao <> OLD.revisao + 1 THEN
    RAISE EXCEPTION 'Correção exige próxima revisão';
  END IF;
  IF NEW.revisao < OLD.revisao OR NEW.revisao > OLD.revisao + 1 THEN
    RAISE EXCEPTION 'Revisão editorial inválida';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_segmento_transcricao_preservar_original BEFORE UPDATE ON segmento_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_segmento_transcricao_preservar_original();

CREATE FUNCTION fn_faixa_transcricao_validar_selecao() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.execucao_selecionada_id IS NOT NULL AND NEW.is_deleted = false AND NOT EXISTS (
    SELECT 1 FROM execucao_transcricao
    JOIN tipo_execucao_transcricao_estado ON tipo_execucao_transcricao_estado.id = execucao_transcricao.tipo_execucao_transcricao_estado_id
      AND tipo_execucao_transcricao_estado.is_deleted = false
    WHERE execucao_transcricao.id = NEW.execucao_selecionada_id
      AND execucao_transcricao.faixa_transcricao_id = NEW.id
      AND execucao_transcricao.is_deleted = false
      AND tipo_execucao_transcricao_estado.codigo = 'CONCLUIDA'
  ) THEN
    RAISE EXCEPTION 'Seleção exige execução concluída da própria faixa';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_faixa_transcricao_validar_selecao
  BEFORE INSERT OR UPDATE OF execucao_selecionada_id, is_deleted ON faixa_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_faixa_transcricao_validar_selecao();

-- Execução selecionada não pode ser invalidada sem trocar/remover a seleção.
CREATE FUNCTION fn_execucao_transcricao_preservar_selecao() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Faixa é o árbitro comum com seleção. UPDATE também produz versão nova e
  -- impede leitura antiga em REPEATABLE READ (gera falha de serialização).
  UPDATE faixa_transcricao SET updated_date = NOW()
    WHERE id = OLD.faixa_transcricao_id AND is_deleted = false;
  IF EXISTS (SELECT 1 FROM faixa_transcricao
      WHERE faixa_transcricao.execucao_selecionada_id = OLD.id AND faixa_transcricao.is_deleted = false)
     AND (NEW.is_deleted = true OR NEW.faixa_transcricao_id <> OLD.faixa_transcricao_id
       OR NOT EXISTS (SELECT 1 FROM tipo_execucao_transcricao_estado
          WHERE id = NEW.tipo_execucao_transcricao_estado_id AND codigo = 'CONCLUIDA' AND is_deleted = false)) THEN
    RAISE EXCEPTION 'Execução selecionada deve permanecer concluída e ativa';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_execucao_transcricao_preservar_selecao BEFORE UPDATE ON execucao_transcricao
  FOR EACH ROW EXECUTE FUNCTION fn_execucao_transcricao_preservar_selecao();

-- DOWN

ALTER TABLE faixa_transcricao DROP CONSTRAINT fk_faixa_transcricao_execucao_selecionada;
DROP TABLE segmento_transcricao;
DROP TABLE execucao_transcricao;
DROP TABLE faixa_transcricao;
DROP TABLE sessao_transcricao;
DROP TABLE tipo_execucao_transcricao_estado;
DROP FUNCTION fn_segmento_transcricao_preservar_original();
DROP FUNCTION fn_faixa_transcricao_validar_selecao();
DROP FUNCTION fn_execucao_transcricao_preservar_selecao();
