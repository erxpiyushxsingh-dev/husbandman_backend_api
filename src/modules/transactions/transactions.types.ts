export type TransactionType = "sale" | "purchase";
export type TransactionStatus = "paid" | "pending" | "overdue";
export type PaymentMethod = "cash" | "upi" | "credit";

export interface Transaction {
  id: string;
  invoiceNo: string;
  type: TransactionType;
  party: string;
  partyType: "farmer" | "supplier";
  location: string | null;
  items: string | null;
  branch: string | null;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  amount: number;
  date: string;
}
