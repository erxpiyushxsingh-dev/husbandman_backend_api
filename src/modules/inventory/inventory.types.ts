export type StockStatus = "healthy" | "medium" | "low" | "out";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  supplierId: string | null;
  stock: number;
  unit: string;
  unitPrice: number;
  stockStatus: StockStatus;
}
