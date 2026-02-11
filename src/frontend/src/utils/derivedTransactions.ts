// Utility for generating derived transaction rows (10% savings and cheeti deductions)
// These are UI-only display rows that are not persisted to storage

import type { Transaction } from '../backend';

// Local storage keys
const LOCAL_USER_DEDUCTIONS_KEY = 'apj_user_deductions';
const LOCAL_TEN_PERCENT_SAVINGS_KEY = 'apj_ten_percent_savings';

// Frontend-only type for display rows
export type DerivedRowType = '10% Savings' | 'Cheeti Deduction';

export interface DerivedTransactionRow {
  isDerived: true;
  derivedType: DerivedRowType;
  date: bigint;
  amount: bigint;
  dateDisplay: string;
}

export type DisplayTransaction = Transaction | DerivedTransactionRow;

// Type guard to check if a row is a real transaction
export function isRealTransaction(row: DisplayTransaction): row is Transaction {
  return !('isDerived' in row);
}

// Type guard to check if a row is a derived row
export function isDerivedRow(row: DisplayTransaction): row is DerivedTransactionRow {
  return 'isDerived' in row && row.isDerived === true;
}

// Get local storage data
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

function getLocalTenPercentSavings(): Record<string, bigint> {
  try {
    const stored = localStorage.getItem(LOCAL_TEN_PERCENT_SAVINGS_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    const result: Record<string, bigint> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[key] = BigInt(value as string);
    }
    return result;
  } catch (error) {
    console.error('Failed to load local ten percent savings:', error);
    return {};
  }
}

// Normalize date to start of day (in nanoseconds)
export function normalizeDateToStartOfDay(date: Date): bigint {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return BigInt(normalized.getTime() * 1_000_000);
}

// Get derived rows for a specific date
export function getDerivedRowsForDate(dateNs: bigint): DerivedTransactionRow[] {
  const dateKey = dateNs.toString();
  const tenPercentSavings = getLocalTenPercentSavings();
  const userDeductions = getLocalUserDeductions();
  
  const rows: DerivedTransactionRow[] = [];
  
  // Add 10% savings row if non-zero
  const savingsAmount = tenPercentSavings[dateKey];
  if (savingsAmount && savingsAmount > 0n) {
    rows.push({
      isDerived: true,
      derivedType: '10% Savings',
      date: dateNs,
      amount: -savingsAmount, // Negative because it's a deduction
      dateDisplay: new Date(Number(dateNs) / 1_000_000).toISOString(),
    });
  }
  
  // Add cheeti deduction row if non-zero
  const cheetiAmount = userDeductions[dateKey];
  if (cheetiAmount && cheetiAmount > 0n) {
    rows.push({
      isDerived: true,
      derivedType: 'Cheeti Deduction',
      date: dateNs,
      amount: -cheetiAmount, // Negative because it's a deduction
      dateDisplay: new Date(Number(dateNs) / 1_000_000).toISOString(),
    });
  }
  
  return rows;
}

// Merge derived rows into a transaction list
// Returns a sorted list with derived rows inserted under their respective dates
export function mergeWithDerivedRows(transactions: Transaction[]): DisplayTransaction[] {
  // Group transactions by date (normalized to start of day)
  const transactionsByDate = new Map<string, Transaction[]>();
  
  transactions.forEach((txn) => {
    const txnDateMs = Number(txn.date) / 1_000_000;
    const txnDate = new Date(txnDateMs);
    const dateKey = normalizeDateToStartOfDay(txnDate).toString();
    
    if (!transactionsByDate.has(dateKey)) {
      transactionsByDate.set(dateKey, []);
    }
    transactionsByDate.get(dateKey)!.push(txn);
  });
  
  // Build result with derived rows
  const result: DisplayTransaction[] = [];
  
  // Get all unique dates (from transactions and deductions)
  const allDates = new Set<string>();
  transactionsByDate.forEach((_, dateKey) => allDates.add(dateKey));
  
  // Also check for dates that only have deductions (no transactions)
  const tenPercentSavings = getLocalTenPercentSavings();
  const userDeductions = getLocalUserDeductions();
  Object.keys(tenPercentSavings).forEach(dateKey => allDates.add(dateKey));
  Object.keys(userDeductions).forEach(dateKey => allDates.add(dateKey));
  
  // Sort dates descending (most recent first)
  const sortedDates = Array.from(allDates).sort((a, b) => {
    const dateA = BigInt(a);
    const dateB = BigInt(b);
    return dateA > dateB ? -1 : dateA < dateB ? 1 : 0;
  });
  
  // For each date, add real transactions first, then derived rows
  sortedDates.forEach((dateKey) => {
    const dateNs = BigInt(dateKey);
    
    // Add real transactions for this date (sorted by time descending)
    const dayTransactions = transactionsByDate.get(dateKey) || [];
    dayTransactions.sort((a, b) => Number(b.date) - Number(a.date));
    result.push(...dayTransactions);
    
    // Add derived rows for this date
    const derivedRows = getDerivedRowsForDate(dateNs);
    result.push(...derivedRows);
  });
  
  return result;
}

// Get derived rows for a date range (for filter view)
export function getDerivedRowsForDateRange(startDate: Date, endDate: Date): DerivedTransactionRow[] {
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();
  
  const tenPercentSavings = getLocalTenPercentSavings();
  const userDeductions = getLocalUserDeductions();
  
  const rows: DerivedTransactionRow[] = [];
  
  // Get all unique dates from both sources
  const allDateKeys = new Set<string>();
  Object.keys(tenPercentSavings).forEach(key => allDateKeys.add(key));
  Object.keys(userDeductions).forEach(key => allDateKeys.add(key));
  
  // Filter by date range and create rows
  allDateKeys.forEach((dateKey) => {
    const dateNs = BigInt(dateKey);
    const dateMs = Number(dateNs) / 1_000_000;
    const date = new Date(dateMs);
    date.setHours(0, 0, 0, 0);
    const dateTimestamp = date.getTime();
    
    if (dateTimestamp >= startTimestamp && dateTimestamp <= endTimestamp) {
      const derivedRows = getDerivedRowsForDate(dateNs);
      rows.push(...derivedRows);
    }
  });
  
  return rows;
}

// Get derived rows for a specific month (for monthly view)
export function getDerivedRowsForMonth(year: number, month: number): DerivedTransactionRow[] {
  const tenPercentSavings = getLocalTenPercentSavings();
  const userDeductions = getLocalUserDeductions();
  
  const rows: DerivedTransactionRow[] = [];
  
  // Get all unique dates from both sources
  const allDateKeys = new Set<string>();
  Object.keys(tenPercentSavings).forEach(key => allDateKeys.add(key));
  Object.keys(userDeductions).forEach(key => allDateKeys.add(key));
  
  // Filter by month and create rows
  allDateKeys.forEach((dateKey) => {
    const dateNs = BigInt(dateKey);
    const dateMs = Number(dateNs) / 1_000_000;
    const date = new Date(dateMs);
    
    if (date.getFullYear() === year && date.getMonth() === month) {
      const derivedRows = getDerivedRowsForDate(dateNs);
      rows.push(...derivedRows);
    }
  });
  
  // Sort by date descending
  rows.sort((a, b) => Number(b.date) - Number(a.date));
  
  return rows;
}
