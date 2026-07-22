import { ApiError } from "../../common/utils/ApiError";
import { inventoryRepository } from "./inventory.repository";
import type { InventoryItem } from "./inventory.types";

export const inventoryService = {
  async list(tenantId: string | null, pagination: { page: number; limit: number }) {
    return inventoryRepository.list(tenantId, pagination);
  },

  async getById(id: string, tenantId: string | null): Promise<InventoryItem> {
    const item = await inventoryRepository.findById(id, tenantId);
    if (!item) throw ApiError.notFound("Inventory item not found");
    return item;
  },

  async create(data: Record<string, unknown>, tenantId: string | null): Promise<InventoryItem> {
    const existing = await inventoryRepository.findBySku(data.sku as string, tenantId);
    if (existing) {
      throw ApiError.conflict("An inventory item with this SKU already exists");
    }
    return inventoryRepository.create(data, tenantId);
  },

  async update(id: string, data: Record<string, unknown>, tenantId: string | null): Promise<InventoryItem> {
    const updated = await inventoryRepository.update(id, data, tenantId);
    if (!updated) throw ApiError.notFound("Inventory item not found");
    return updated;
  },

  async remove(id: string, tenantId: string | null): Promise<void> {
    const deleted = await inventoryRepository.remove(id, tenantId);
    if (!deleted) throw ApiError.notFound("Inventory item not found");
  },

  async adjustStock(id: string, tenantId: string | null, delta: number): Promise<InventoryItem> {
    return inventoryRepository.adjustStock(id, tenantId, delta);
  },
};
