/**
 * Campos obrigatórios em toda tabela do banco (SYSTEM.SPEC §10.1). Toda entidade de
 * negócio estende esta classe além dos seus campos próprios.
 */
export abstract class BaseEntity {
  id: number;
  createdDate: Date;
  updatedDate: Date;
  isDeleted: boolean;
  deletedDate?: Date;
}
