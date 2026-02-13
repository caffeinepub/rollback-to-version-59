import { TransactionType } from '../backend';

const LOCAL_USER_DEDUCTIONS_KEY = 'apj_user_deductions';

export type DerivedTransactionRow = {
  id: string;
  derivedType: '10% Savings' | 'Cheeti Deduction';
  amount: bigint;
  date: bigint;
};

export function isDerivedRow(row: any): row is DerivedTransactionRow {
  return row && typeof row === 'object' && 'derivedType' in row;
}

export function normalizeDateToStartOfDay(date: Date): bigint {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return BigInt(normalized.getTime() * 1_000_000);
}

function getLocalUserDeductions(): Record<string, bigint> {
  try {
    const stored = localStorage.getItem(LOCAL_USER_DEDUCTIONS_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    const result: Record<string, bigint> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[key] = BigInt(value as string);
    }
    return result;
  } catch (error) {
    console.error('Failed to load local user deductions:', error);
    return {};
  }
}

function getLocalTransactions() {
  try {
    const stored = localStorage.getItem('apj_transactions');
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load local transactions:', error);
    return [];
  }
}

export function getDerivedRowsForDate(date: Date): DerivedTransactionRow[] {
  const normalizedDate = normalizeDateToStartOfDay(date);
  const dateKey = normalizedDate.toString();
  const userDeductions = getLocalUserDeductions();
  const transactions = getLocalTransactions();

  const dateTransactions = transactions.filter((txn: any) => {
    const txnDate = new Date(Number(txn.date) / 1_000_000);
    txnDate.setHours(0, 0, 0, 0);
    const selected = new Date(date);
    selected.setHours(0, 0, 0, 0);
    return txnDate.getTime() === selected.getTime();
  });

  const cashIn = dateTransactions
    .filter((txn: any) => txn.transactionType === TransactionType.cashIn)
    .reduce((sum: bigint, txn: any) => sum + BigInt(txn.amount), 0n);

  const upiIn = dateTransactions
    .filter((txn: any) => txn.transactionType === TransactionType.upiIn)
    .reduce((sum: bigint, txn: any) => sum + BigInt(txn.amount), 0n);

  const combinedTotal = cashIn + upiIn;
  const tenPercent = (combinedTotal * 10n) / 100n;
  const remainder = tenPercent % 10n;
  const tenPercentDeduction = remainder >= 5n ? tenPercent + (10n - remainder) : tenPercent - remainder;
  const userDeduction = userDeductions[dateKey] || 0n;

  const rows: DerivedTransactionRow[] = [];

  if (tenPercentDeduction > 0n) {
    rows.push({
      id: `derived-10percent-${dateKey}`,
      derivedType: '10% Savings',
      amount: tenPercentDeduction,
      date: normalizedDate,
    });
  }

  if (userDeduction > 0n) {
    rows.push({
      id: `derived-cheeti-${dateKey}`,
      derivedType: 'Cheeti Deduction',
      amount: userDeduction,
      date: normalizedDate,
    });
  }

  return rows;
}

export function getDerivedRowsForDateRange(startDate: Date, endDate: Date): DerivedTransactionRow[] {
  const rows: DerivedTransactionRow[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dateRows = getDerivedRowsForDate(current);
    rows.push(...dateRows);
    current.setDate(current.getDate() + 1);
  }

  return rows;
}

export function getDerivedRowsForMonth(year: number, month: number): DerivedTransactionRow[] {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return getDerivedRowsForDateRange(startDate, endDate);
}

export function getDerivedRowsForYear(year: number): DerivedTransactionRow[] {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  return getDerivedRowsForDateRange(startDate, endDate);
}
