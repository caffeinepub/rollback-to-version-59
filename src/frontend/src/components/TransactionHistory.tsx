import { useState, useMemo, useEffect } from 'react';
import { useGetAllTransactions, useDeleteTransaction } from '../hooks/useQueries';
import { Transaction, TransactionType } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Edit, History, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import EditTransactionDialog from './EditTransactionDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDerivedRowsForDateRange } from '../utils/derivedTransactions';
import type { DerivedTransactionRow } from '../utils/derivedTransactions';
import { getAmountColorFromType, getDerivedRowAmountColor } from '../utils/transactionDirection';
import { getSessionParameter, clearSessionParameter, storeSessionParameter } from '../utils/urlParams';

export default function TransactionHistory() {
  const { data: transactions, isLoading, error } = useGetAllTransactions();
  const deleteTransaction = useDeleteTransaction();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Initialize from session storage or default to current month
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    const archiveYear = getSessionParameter('overviewArchiveYear');
    const archiveMonth = getSessionParameter('overviewArchiveMonth');
    if (archiveYear && archiveMonth) {
      return new Date(parseInt(archiveYear), parseInt(archiveMonth) - 1);
    }
    return currentDate;
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const formatAmount = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const handleDelete = async (id: bigint) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      await deleteTransaction.mutateAsync(id);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleMonthSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedMonth(date);
      setIsCalendarOpen(false);
      // Update session storage
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      storeSessionParameter('overviewArchiveYear', year.toString());
      storeSessionParameter('overviewArchiveMonth', month.toString());
    }
  };

  const handleResetToCurrentMonth = () => {
    setSelectedMonth(currentDate);
    clearSessionParameter('overviewArchiveYear');
    clearSessionParameter('overviewArchiveMonth');
  };

  const isCurrentMonth = 
    selectedMonth.getFullYear() === currentDate.getFullYear() &&
    selectedMonth.getMonth() === currentDate.getMonth();

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    
    return transactions.filter((txn) => {
      const txnDate = new Date(Number(txn.date) / 1_000_000);
      return txnDate.getFullYear() === year && txnDate.getMonth() + 1 === month;
    });
  }, [transactions, selectedMonth]);

  const derivedRows = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth() + 1;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    return getDerivedRowsForDateRange(startDate, endDate);
  }, [selectedMonth]);

  type MergedRow = { type: 'real'; data: Transaction } | { type: 'derived'; data: DerivedTransactionRow };
  const mergedTransactions: MergedRow[] = useMemo(() => {
    const merged: MergedRow[] = [
      ...filteredTransactions.map((txn) => ({ type: 'real' as const, data: txn })),
      ...derivedRows.map((row) => ({ type: 'derived' as const, data: row })),
    ];

    merged.sort((a, b) => {
      const dateA = a.type === 'real' ? a.data.date : a.data.date;
      const dateB = b.type === 'real' ? b.data.date : b.data.date;
      return Number(dateB) - Number(dateA);
    });

    return merged;
  }, [filteredTransactions, derivedRows]);

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Transaction History</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            View and manage all transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-200" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Transaction History</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            View and manage all transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              Failed to load transaction history. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const typeMap: Record<TransactionType, string> = {
    [TransactionType.cashIn]: 'Cash In',
    [TransactionType.cashOut]: 'Cash Out',
    [TransactionType.upiIn]: 'UPI In',
    [TransactionType.upiOut]: 'UPI Out',
    [TransactionType.savingsOut]: 'Savings (10%) Out',
    [TransactionType.deductionsOut]: 'Deductions Out',
  };

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-white" />
                <CardTitle className="text-white font-bold">Transaction History</CardTitle>
              </div>
              <CardDescription className="text-white font-semibold mt-1">
                View and manage all transactions
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {/* Selected Month Tile */}
              <div className="px-4 py-2 bg-white text-teal-700 font-bold rounded-lg shadow-md border-2 border-white">
                {format(selectedMonth, 'MMMM yyyy')}
              </div>
              
              {/* Calendar Trigger */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-semibold border-2 border-white bg-white hover:bg-gray-50 text-teal-700 rounded-lg shadow-sm"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-2 border-gray-300 shadow-xl" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedMonth}
                    onSelect={handleMonthSelect}
                    initialFocus
                    className="modern-calendar"
                  />
                </PopoverContent>
              </Popover>

              {/* Reset Button */}
              {!isCurrentMonth && (
                <Button
                  onClick={handleResetToCurrentMonth}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50 text-teal-700 font-bold border-2 border-white"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {mergedTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-700">
              <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="font-bold text-gray-900">No transactions for {format(selectedMonth, 'MMMM yyyy')}</p>
              <p className="mt-2 text-sm font-medium text-gray-600">
                {isCurrentMonth ? 'Start by adding your first transaction' : 'No transactions found for this month'}
              </p>
            </div>
          ) : (
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-md">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-500 hover:to-blue-500">
                      <TableHead className="text-white font-bold">Date</TableHead>
                      <TableHead className="text-white font-bold">Type</TableHead>
                      <TableHead className="text-right text-white font-bold">Amount</TableHead>
                      <TableHead className="text-white font-bold">Description</TableHead>
                      <TableHead className="text-center text-white font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergedTransactions.map((row, index) => {
                      if (row.type === 'real') {
                        const transaction = row.data;
                        const amountColor = getAmountColorFromType(transaction.transactionType);
                        return (
                          <TableRow key={`real-${transaction.id}`} className="hover:bg-gray-50">
                            <TableCell className="font-semibold text-gray-900">
                              {format(new Date(Number(transaction.date) / 1_000_000), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="font-semibold text-gray-900">
                              {typeMap[transaction.transactionType]}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${amountColor}`}>
                              {formatAmount(transaction.amount)}
                            </TableCell>
                            <TableCell className="font-medium text-gray-700">
                              {transaction.description || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(transaction)}
                                  className="hover:bg-blue-50 text-blue-600 font-bold"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(transaction.id)}
                                  className="hover:bg-red-50 text-red-600 font-bold"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        const derivedRow = row.data;
                        const amountColor = getDerivedRowAmountColor();
                        return (
                          <TableRow key={`derived-${index}`} className="bg-amber-50 hover:bg-amber-100">
                            <TableCell className="font-semibold text-gray-900">
                              {format(new Date(Number(derivedRow.date) / 1_000_000), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell className="font-semibold text-gray-900">
                              {derivedRow.derivedType}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${amountColor}`}>
                              {formatAmount(derivedRow.amount)}
                            </TableCell>
                            <TableCell className="font-medium text-gray-700 italic">
                              Auto-calculated
                            </TableCell>
                            <TableCell className="text-center text-gray-500 text-sm font-medium">
                              -
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {editingTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
        />
      )}
    </>
  );
}
