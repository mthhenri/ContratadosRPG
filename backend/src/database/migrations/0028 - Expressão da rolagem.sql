-- Guarda a expressão de dados usada na rolagem (ex.: "2d6+3[Físico]"), ao lado do `resultado`
-- já persistido — histórico e feed passam a exibir a fórmula, não só o rótulo e os dados
-- rolados. Nula quando quem registra não a informa (ex.: teste de Atributo direto, cujo rótulo
-- já é o próprio nome do atributo — mostrar a fórmula ali seria redundante).

-- UP

ALTER TABLE rolagem
  ADD COLUMN formula VARCHAR;

-- DOWN

ALTER TABLE rolagem
  DROP COLUMN formula;
