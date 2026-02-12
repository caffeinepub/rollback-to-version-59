// Utility for determining transaction direction (incoming vs outgoing)
// and providing consistent color classes for amount text

import { TransactionType } from '../backend';
import type { DerivedTransactionRow } from './derivedTransactions';

export type TransactionDirection = 'incoming' | 'outgoing';

/**
 * Determine if a transaction type is incoming or outgoing
 */
export function getTransactionDirection(transactionType: TransactionType): TransactionDirection {
  switch (transactionType) {
    case TransactionType.cashIn:
    case TransactionType.upiIn:
      return 'incoming';
    case TransactionType.cashOut:
    case TransactionType.upiOut:
    case TransactionType.savingsOut:
    case TransactionType.deductionsOut:
      return 'outgoing';
    default:
      return 'outgoing';
  }
}

/**
 * Get the color class for amount text based on transaction direction
 * Incoming = green, Outgoing = red
 */
export function getAmountColorClass(direction: TransactionDirection): string {
  return direction === 'incoming' ? 'text-green-600' : 'text-red-600';
}

/**
 * Get the color class for amount text from a transaction type
 */
export function getAmountColorFromType(transactionType: TransactionType): string {
  const direction = getTransactionDirection(transactionType);
  return getAmountColorClass(direction);
}

/**
 * Get the color class for derived rows (always outgoing/red)
 */
export function getDerivedRowAmountColor(): string {
  return 'text-red-600';
}

/**
 * Get icon background color based on direction
 */
export function getIconBgColor(direction: TransactionDirection): string {
  return direction === 'incoming' ? 'bg-green-100' : 'bg-red-100';
}

/**
 * Get icon color based on direction
 */
export function getIconColor(direction: TransactionDirection): string {
  return direction === 'incoming' ? 'text-green-600' : 'text-red-600';
}
