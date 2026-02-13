import { useState, useMemo } from 'react';
import { useGetAllTransactions, useDeleteTransaction } from '../hooks/useQueries';
import { Transaction, TransactionType } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Edit, History } from 'lucide-react';
import { format } from 'date-fns';
import EditTransactionDialog from './EditTransactionDialog';
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
import { getSessionParameter, clearSessionParameter } from '../utils/urlParams';

export default function TransactionHistory() {
  const { data: transactions, isLoading, error } = useGetAllTransactions();
  const deleteTransaction = useDeleteTransaction();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Check for archive month filter from Overview
  const archiveYear = getSessionParameter('overviewArchiveYear');
  const archiveMonth = getSessionParameter('overviewArchiveMonth');
  const hasArchiveFilter = archiveYear && archiveMonth;

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

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    if (hasArchiveFilter) {
      const year = parseInt(archiveYear!);
      const month = parseInt(archiveMonth!);
      
      return transactions.filter((txn) => {
        const txnDate = new Date(Number(txn.date) / 1_000_000);
        return txnDate.getFullYear() === year && txnDate.getMonth() + 1 === month;
      });
    }
    
    // Default: current month only
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    return transactions.filter((txn) => {
      const txnDate = new Date(Number(txn.date) / 1_000_000);
      return txnDate.getFullYear() === currentYear && txnDate.getMonth() + 1 === currentMonth;
    });
  }, [transactions, hasArchiveFilter, archiveYear, archiveMonth]);

  const derivedRows = useMemo(() => {
    if (hasArchiveFilter) {
      const year = parseInt(archiveYear!);
      const month = parseInt(archiveMonth!);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      return getDerivedRowsForDateRange(startDate, endDate);
    }
    
    // Default: current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return getDerivedRowsForDateRange(startDate, endDate);
  }, [hasArchiveFilter, archiveYear, archiveMonth]);

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

  const handleClearArchiveFilter = () => {
    clearSessionParameter('overviewArchiveYear');
    clearSessionParameter('overviewArchiveMonth');
    window.location.reload();
  };

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
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Transaction History</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            {hasArchiveFilter
              ? `Viewing archive: ${format(new Date(parseInt(archiveYear!), parseInt(archiveMonth!) - 1), 'MMMM yyyy')}`
              : `Viewing current month: ${format(new Date(), 'MMMM yyyy')}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {hasArchiveFilter && (
            <div className="mb-4">
              <Button
                onClick={handleClearArchiveFilter}
                variant="outline"
                size="sm"
                className="bg-white hover:bg-gray-100 text-gray-900 font-bold border-2 border-gray-300"
              >
                Back to Current Month
              </Button>
            </div>
          )}
          {mergedTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-700">
              <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="font-bold text-gray-900">No transactions yet</p>
              <p className="mt-2 text-sm font-medium text-gray-600">
                Start by adding your first transaction
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
                    {mergedTransactions.map((row) => {
                      if (row.type === 'derived') {
                        const derived = row.data;
                        const rowKey = `derived-${derived.derivedType}-${derived.date.toString()}`;
                        return (
                          <TableRow key={rowKey} className="bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100">
                            <TableCell className="font-semibold text-gray-900">
                              {format(new Date(Number(derived.date) / 1_000_000), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="font-bold text-amber-700">{derived.derivedType}</TableCell>
                            <TableCell className={`text-right font-bold ${getDerivedRowAmountColor()}`}>
                              {formatAmount(derived.amount)}
                            </TableCell>
                            <TableCell className="text-gray-600 italic">Auto-calculated</TableCell>
                            <TableCell className="text-center text-gray-400 text-sm">-</TableCell>
                          </TableRow>
                        );
                      } else {
                        const txn = row.data;
                        const rowKey = `real-${txn.id.toString()}`;
                        return (
                          <TableRow key={rowKey} className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50">
                            <TableCell className="font-semibold text-gray-900">
                              {format(new Date(Number(txn.date) / 1_000_000), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="font-semibold text-gray-900">{typeMap[txn.transactionType]}</TableCell>
                            <TableCell className={`text-right font-bold ${getAmountColorFromType(txn.transactionType)}`}>
                              {formatAmount(txn.amount)}
                            </TableCell>
                            <TableCell className="text-gray-700">{txn.description || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  onClick={() => handleEdit(txn)}
                                  variant="outline"
                                  size="sm"
                                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 font-bold"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDelete(txn.id)}
                                  variant="outline"
                                  size="sm"
                                  disabled={deleteTransaction.isPending}
                                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-300 font-bold"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
