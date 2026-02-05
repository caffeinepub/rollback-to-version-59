import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Transaction {
    id: bigint;
    transactionType: TransactionType;
    date: bigint;
    description: string;
    amount: bigint;
}
export interface DaywiseTransactionStats {
    combinedTotal: bigint;
    cashOut: bigint;
    totalBalanceForDay: bigint;
    upiOut: bigint;
    upiIn: bigint;
    cashIn: bigint;
    transactions: Array<Transaction>;
}
export interface DailyTracking {
    totalDailyTransactionsWithDeduction: bigint;
    dailyTenPercentDeduction: bigint;
    totalDailyTransactions: bigint;
    userSpecifiedDailyDeduction: bigint;
}
export interface FilterDailyStats {
    date: bigint;
    userAmountDeduction: bigint;
    totalTransaction: bigint;
    upiIn: bigint;
    cashIn: bigint;
    tenPercentDeduction: bigint;
}
export interface Balance {
    savingsBalance: bigint;
    deductionsBalance: bigint;
    cashOut: bigint;
    upiOut: bigint;
    upiBalance: bigint;
    cashBalance: bigint;
    upiIn: bigint;
    cashIn: bigint;
    totalBalance: bigint;
    excludedTotalBalance: bigint;
}
export interface CumulativeStats {
    cumulativeUserSpecifiedDeductions: bigint;
    cumulativeTenPercentSavings: bigint;
}
export interface OpeningBalance {
    date: bigint;
    upiBalance: bigint;
    cashBalance: bigint;
    savings: bigint;
    userDeductions: bigint;
}
export interface UserProfile {
    name: string;
}
export interface MonthlyTransactionSummary {
    totalAmount: bigint;
    transactions: Array<Transaction>;
    transactionCount: bigint;
}
export enum TransactionType {
    savingsOut = "savingsOut",
    cashOut = "cashOut",
    upiOut = "upiOut",
    upiIn = "upiIn",
    cashIn = "cashIn",
    deductionsOut = "deductionsOut"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addOpeningBalance(cashBalance: bigint, upiBalance: bigint, savings: bigint, userDeductions: bigint, date: bigint): Promise<string>;
    addTransaction(transactionType: TransactionType, amount: bigint, description: string | null, date: bigint | null): Promise<string>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    clearTransactionData(): Promise<string>;
    deleteTransaction(id: bigint): Promise<string>;
    editTransaction(transactionId: bigint, transactionType: TransactionType, amount: bigint, description: string | null, date: bigint | null): Promise<string>;
    filterBalanceByDateRange(startDate: bigint, endDate: bigint): Promise<Array<FilterDailyStats>>;
    getAllOpeningBalances(): Promise<Array<OpeningBalance>>;
    getAllTransactions(): Promise<Array<Transaction>>;
    getBalances(): Promise<Balance>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCumulativeStats(): Promise<CumulativeStats>;
    getDailyTracking(date: bigint): Promise<DailyTracking>;
    getDaywiseTransactions(date: bigint): Promise<DaywiseTransactionStats>;
    getMonthlyTransactions(year: bigint, month: bigint, transactionType: TransactionType): Promise<MonthlyTransactionSummary>;
    getOpeningBalance(): Promise<OpeningBalance>;
    getTransactionsByType(transactionType: TransactionType): Promise<Array<Transaction>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSpecifiedDeduction(date: bigint): Promise<bigint>;
    initializeAccessControl(): Promise<void>;
    isAnonymous(): Promise<boolean>;
    isAuthenticated(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setUserSpecifiedDeduction(date: bigint, amount: bigint): Promise<void>;
    updateOpeningBalance(cashBalance: bigint, upiBalance: bigint, savings: bigint, userDeductions: bigint, date: bigint): Promise<string>;
}
