import { ApiError } from "../../common/utils/ApiError";
import { stockTransfersRepository } from "./stockTransfers.repository";
import type { StockTransfer } from "./stockTransfers.types";

export const stockTransfersService = {
  async list(tenantId: string | null, pagination: { page: number; limit: number }) {
    return stockTransfersRepository.list(tenantId, pagination);
  },

  async getById(id: string, tenantId: string | null): Promise<StockTransfer> {
    const item = await stockTransfersRepository.findById(id, tenantId);
    if (!item) throw ApiError.notFound("Stock transfer not found");
    return item;
  },

  async create(
    data: { transferNo: string; item: string; from: string; to: string; qty: string; status: string },
    tenantId: string | null
  ): Promise<StockTransfer> {
    const existing = await stockTransfersRepository.findByTransferNo(data.transferNo, tenantId);
    if (existing) {
      throw ApiError.conflict("A stock transfer with this transfer number already exists");
    }
    return stockTransfersRepository.create(data, tenantId);
  },

  async update(id: string, data: { status?: string; qty?: string }, tenantId: string | null): Promise<StockTransfer> {
    const updated = await stockTransfersRepository.update(id, data, tenantId);
    if (!updated) throw ApiError.notFound("Stock transfer not found");
    return updated;
  },

  async remove(id: string, tenantId: string | null): Promise<void> {
    const deleted = await stockTransfersRepository.remove(id, tenantId);
    if (!deleted) throw ApiError.notFound("Stock transfer not found");
  },
};
