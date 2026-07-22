import { ApiError } from "../utils/ApiError";
import type { ListResult, PaginationParams } from "../repository/baseRepository";

interface CrudRepository<T> {
  list: (tenantId: string | null, pagination?: PaginationParams) => Promise<ListResult<T>>;
  findById: (id: string, tenantId: string | null) => Promise<T | null>;
  create: (data: Record<string, unknown>, tenantId: string | null) => Promise<T>;
  update: (id: string, data: Record<string, unknown>, tenantId: string | null) => Promise<T | null>;
  remove: (id: string, tenantId: string | null) => Promise<boolean>;
}

/**
 * Thin business-logic layer over a base repository: same CRUD operations,
 * but throws proper ApiErrors (404) instead of returning null/false. Kept
 * as its own layer (not merged into the controller) so a module can later
 * grow real business rules here without touching routes or SQL.
 */
export function createCrudService<T>(entityName: string, repository: CrudRepository<T>) {
  return {
    async list(tenantId: string | null, pagination: PaginationParams) {
      return repository.list(tenantId, pagination);
    },

    async getById(id: string, tenantId: string | null): Promise<T> {
      const item = await repository.findById(id, tenantId);
      if (!item) {
        throw ApiError.notFound(`${entityName} not found`);
      }
      return item;
    },

    async create(data: Record<string, unknown>, tenantId: string | null): Promise<T> {
      return repository.create(data, tenantId);
    },

    async update(id: string, data: Record<string, unknown>, tenantId: string | null): Promise<T> {
      const updated = await repository.update(id, data, tenantId);
      if (!updated) {
        throw ApiError.notFound(`${entityName} not found`);
      }
      return updated;
    },

    async remove(id: string, tenantId: string | null): Promise<void> {
      const deleted = await repository.remove(id, tenantId);
      if (!deleted) {
        throw ApiError.notFound(`${entityName} not found`);
      }
    },
  };
}
