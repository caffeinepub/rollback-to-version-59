import { useState } from 'react';
import { useGetAllTransactions, useDeleteTransaction } from '../hooks/useQueries';
import { Transaction, TransactionType } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowUpCircle, ArrowDownCircle, History, Edit, Trash2, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import EditTransactionDialog from './EditTransactionDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { mergeWithDerivedRows, isRealTransaction, isDerivedRow, type DisplayTransaction } from '../utils/derivedTransactions';

export default function TransactionHistory() {
  const { data: transactions, isLoading, error } = useGetAllTransactions();
  const deleteTransaction = useDeleteTransaction();
  const [filter, setFilter] = useState<'all' | 'cash' | 'upi'>('all');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState<bigint | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const formatAmount = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case TransactionType.cashIn:
        return 'Cash In';
      case TransactionType.cashOut:
        return 'Cash Out';
      case TransactionType.upiIn:
        return 'UPI In';
      case TransactionType.upiOut:
        return 'UPI Out';
      case TransactionType.savingsOut:
        return 'Savings (10%) Out';
      case TransactionType.deductionsOut:
        return 'Deductions Out';
      default:
        return 'Unknown';
    }
  };

  const getTransactionTypeColor = (type: TransactionType) => {
    switch (type) {
      case TransactionType.cashIn:
        return 'bg-green-100 text-green-800 border-2 border-green-300';
      case TransactionType.cashOut:
        return 'bg-red-100 text-red-800 border-2 border-red-300';
      case TransactionType.upiIn:
        return 'bg-teal-100 text-teal-800 border-2 border-teal-300';
      case TransactionType.upiOut:
        return 'bg-orange-100 text-orange-800 border-2 border-orange-300';
      case TransactionType.savingsOut:
        return 'bg-purple-100 text-purple-800 border-2 border-purple-300';
      case TransactionType.deductionsOut:
        return 'bg-amber-100 text-amber-800 border-2 border-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 border-2 border-gray-300';
    }
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (transactionId: bigint) => {
    setDeletingTransactionId(transactionId);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingTransactionId !== null) {
      try {
        await deleteTransaction.mutateAsync(deletingTransactionId);
        setIsDeleteDialogOpen(false);
        setDeletingTransactionId(null);
      } catch (error) {
        console.error('Failed to delete transaction:', error);
      }
    }
  };

  // Merge real transactions with derived rows
  const displayTransactions = transactions ? mergeWithDerivedRows(transactions) : [];

  // Apply filter
  const filteredTransactions = displayTransactions.filter((row) => {
    if (filter === 'all') return true;
    
    // Derived rows are always shown in 'all' view only
    if (isDerivedRow(row)) return false;
    
    if (isRealTransaction(row)) {
      if (filter === 'cash') {
        return row.transactionType === TransactionType.cashIn || row.transactionType === TransactionType.cashOut;
      }
      if (filter === 'upi') {
        return row.transactionType === TransactionType.upiIn || row.transactionType === TransactionType.upiOut;
      }
    }
    return true;
  });

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Transaction History</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">View all your transactions</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 bg-gray-200" />
                  <Skeleton className="h-3 w-32 bg-gray-200" />
                </div>
                <Skeleton className="h-6 w-20 bg-gray-200" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Transaction History</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">View all your transactions</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="bg-red-50 border-red-200 shadow-md">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="font-bold text-red-900">Error</AlertTitle>
            <AlertDescription className="text-red-800">
              Failed to load transactions. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Transaction History</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">View all your transactions</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'cash' | 'upi')} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1.5 rounded-xl shadow-md border border-gray-200">
              <TabsTrigger 
                value="all" 
                className="rounded-lg text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold"
              >
                All
              </TabsTrigger>
              <TabsTrigger 
                value="cash"
                className="rounded-lg text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold"
              >
                Cash
              </TabsTrigger>
              <TabsTrigger 
                value="upi"
                className="rounded-lg text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 font-semibold"
              >
                UPI
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {!filteredTransactions || filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-gray-700">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 shadow-md">
                <History className="h-8 w-8 text-blue-600" />
              </div>
              <p className="font-bold text-gray-900">No transactions found</p>
              <p className="mt-2 text-sm font-medium text-gray-600">Add your first transaction to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((row, index) => {
                // Generate unique key
                const rowKey = isDerivedRow(row) 
                  ? `derived-${row.derivedType}-${row.date.toString()}`
                  : `txn-${(row as Transaction).id.toString()}`;

                // Render derived row
                if (isDerivedRow(row)) {
                  return (
                    <div
                      key={rowKey}
                      className="flex items-center justify-between border-b-2 border-gray-100 pb-4 last:border-b-0 transition-all duration-200 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-3 -mx-3 shadow-sm"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          <div className="rounded-full bg-amber-100 p-2.5 shadow-md">
                            <TrendingDown className="h-5 w-5 text-amber-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-100 text-amber-800 border-2 border-amber-300 font-bold shadow-sm">
                              {row.derivedType}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-900 font-semibold italic">
                            Auto-calculated deduction
                          </p>
                          <p className="mt-1 text-xs text-gray-600 font-medium">
                            {format(new Date(Number(row.date) / 1_000_000), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-amber-700">
                          {formatAmount(row.amount)}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Render real transaction
                const transaction = row as Transaction;
                return (
                  <div
                    key={rowKey}
                    className="flex items-center justify-between border-b-2 border-gray-100 pb-4 last:border-b-0 transition-all duration-200 hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50 rounded-xl p-3 -mx-3 shadow-sm hover:shadow-md"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-1">
                        {Number(transaction.amount) >= 0 ? (
                          <div className="rounded-full bg-green-100 p-2.5 shadow-md">
                            <ArrowUpCircle className="h-5 w-5 text-green-600" />
                          </div>
                        ) : (
                          <div className="rounded-full bg-red-100 p-2.5 shadow-md">
                            <ArrowDownCircle className="h-5 w-5 text-red-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getTransactionTypeColor(transaction.transactionType)} font-bold shadow-sm`}>
                            {getTransactionTypeLabel(transaction.transactionType)}
                          </Badge>
                        </div>
                        {transaction.description && (
                          <p className="mt-1 text-sm text-gray-900 font-semibold">{transaction.description}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-600 font-medium">
                          {format(new Date(Number(transaction.date) / 1_000_000), 'PPP')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-lg font-bold ${
                          Number(transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatAmount(transaction.amount)}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(transaction)}
                        className="h-9 px-3 border-2 border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 text-black font-bold rounded-lg shadow-sm transition-all duration-200 hover:text-black hover:font-extrabold"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(transaction.id)}
                        disabled={deleteTransaction.isPending}
                        className="h-9 px-3 border-2 border-red-300 bg-red-50 hover:bg-red-100 hover:border-red-400 text-black font-bold rounded-lg shadow-sm transition-all duration-200 hover:text-black hover:font-extrabold disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <EditTransactionDialog
        transaction={editingTransaction}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border-2 border-red-300 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-red-600" />
              Delete Transaction
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-semibold text-gray-700">
              Are you sure you want to delete this transaction? This action cannot be undone and will immediately update all balances and statistics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-black font-bold rounded-lg shadow-sm transition-all duration-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteTransaction.isPending}
              className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50"
            >
              {deleteTransaction.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
