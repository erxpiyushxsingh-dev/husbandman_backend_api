export type TransferStatus = "in-transit" | "delivered" | "delayed";

export interface StockTransfer {
  id: string;
  transferNo: string;
  item: string;
  from: string;
  to: string;
  qty: string;
  status: TransferStatus;
}
