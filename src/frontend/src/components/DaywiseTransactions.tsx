import { useState, useEffect } from 'react';
import { useGetAllTransactions } from '../hooks/useQueries';
import { Transaction, TransactionType } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { normalizeDateToStartOfDay, getDerivedRowsForDate } from '../utils/derivedTransactions';
import type { DerivedTransactionRow } from '../utils/derivedTransactions';
import { getAmountColorFromType, getDerivedRowAmountColor } from '../utils/transactionDirection';

const LOCAL_USER_DEDUCTIONS_KEY = 'apj_user_deductions';

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

function saveLocalUserDeduction(dateKey: string, amount: bigint): void {
  try {
    const deductions = getLocalUserDeductions();
    deductions[dateKey] = amount;
    const toStore: Record<string, string> = {};
    for (const [key, value] of Object.entries(deductions)) {
      toStore[key] = value.toString();
    }
    localStorage.setItem(LOCAL_USER_DEDUCTIONS_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error('Failed to save local user deduction:', error);
  }
}

export default function DaywiseTransactions() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [userDeduction, setUserDeduction] = useState<string>('0');

  const { data: transactions, isLoading, error } = useGetAllTransactions();

  // Load user deduction from localStorage when date changes
  useEffect(() => {
    if (selectedDate) {
      const normalizedDate = normalizeDateToStartOfDay(selectedDate);
      const dateKey = normalizedDate.toString();
      const deductions = getLocalUserDeductions();
      const savedDeduction = deductions[dateKey] || 0n;
      setUserDeduction(savedDeduction.toString());
    }
  }, [selectedDate]);

  const formatAmount = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const handleUserDeductionChange = (value: string) => {
    setUserDeduction(value);
    if (selectedDate) {
      const normalizedDate = normalizeDateToStartOfDay(selectedDate);
      const dateKey = normalizedDate.toString();
      const amount = value === '' ? 0n : BigInt(value);
      saveLocalUserDeduction(dateKey, amount);
    }
  };

  const filteredTransactions = selectedDate
    ? transactions?.filter((txn) => {
        const txnDate = new Date(Number(txn.date) / 1_000_000);
        txnDate.setHours(0, 0, 0, 0);
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);
        return txnDate.getTime() === selected.getTime();
      }) || []
    : [];

  const stats = filteredTransactions.reduce(
    (acc, txn) => {
      if (txn.transactionType === TransactionType.cashIn) {
        acc.cashIn += txn.amount;
      } else if (txn.transactionType === TransactionType.upiIn) {
        acc.upiIn += txn.amount;
      } else if (txn.transactionType === TransactionType.cashOut) {
        acc.cashOut += txn.amount;
      } else if (txn.transactionType === TransactionType.upiOut) {
        acc.upiOut += txn.amount;
      }
      return acc;
    },
    { cashIn: 0n, upiIn: 0n, cashOut: 0n, upiOut: 0n }
  );

  const combinedTotal = stats.cashIn + stats.upiIn;
  const tenPercent = (combinedTotal * 10n) / 100n;
  const remainder = tenPercent % 10n;
  const tenPercentDeduction = remainder >= 5n ? tenPercent + (10n - remainder) : tenPercent - remainder;
  const userDeductionAmount = userDeduction === '' ? 0n : BigInt(userDeduction);

  // Get derived rows for the selected date
  const derivedRows = selectedDate ? getDerivedRowsForDate(selectedDate) : [];

  // Merge real transactions with derived rows
  type MergedRow = { type: 'real'; data: Transaction } | { type: 'derived'; data: DerivedTransactionRow };
  const mergedTransactions: MergedRow[] = [
    ...filteredTransactions.map((txn) => ({ type: 'real' as const, data: txn })),
    ...derivedRows.map((row) => ({ type: 'derived' as const, data: row })),
  ];

  // Sort by date descending
  mergedTransactions.sort((a, b) => {
    const dateA = a.type === 'real' ? a.data.date : a.data.date;
    const dateB = b.type === 'real' ? b.data.date : b.data.date;
    return Number(dateB) - Number(dateA);
  });

  const generatePDF = () => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, 'dd/MM/yyyy');
    let content = `Day-wise Transactions Report\nDate: ${dateStr}\n\n`;
    content += `Cash In: ${formatAmount(stats.cashIn)}\n`;
    content += `UPI In: ${formatAmount(stats.upiIn)}\n`;
    content += `Combined Total: ${formatAmount(combinedTotal)}\n`;
    content += `10% Deduction: ${formatAmount(tenPercentDeduction)}\n`;
    content += `User Deduction: ${formatAmount(userDeductionAmount)}\n`;
    content += `Cash Out: ${formatAmount(stats.cashOut)}\n`;
    content += `UPI Out: ${formatAmount(stats.upiOut)}\n\n`;
    content += `Transactions:\n`;

    mergedTransactions.forEach((row) => {
      if (row.type === 'real') {
        const txn = row.data;
        const typeMap: Record<TransactionType, string> = {
          [TransactionType.cashIn]: 'Cash In',
          [TransactionType.cashOut]: 'Cash Out',
          [TransactionType.upiIn]: 'UPI In',
          [TransactionType.upiOut]: 'UPI Out',
          [TransactionType.savingsOut]: 'Savings (10%) Out',
          [TransactionType.deductionsOut]: 'Deductions Out',
        };
        content += `${typeMap[txn.transactionType]}: ${formatAmount(txn.amount)} - ${txn.description}\n`;
      } else {
        const derived = row.data;
        content += `${derived.derivedType}: ${formatAmount(derived.amount)}\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daywise-report-${format(selectedDate, 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Day-wise Transactions</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            View transactions for a specific date
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full bg-gray-200" />
            <Skeleton className="h-64 w-full bg-gray-200" />
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
            <CalendarIcon className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Day-wise Transactions</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            View transactions for a specific date
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              Failed to load day-wise transactions. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Day-wise Transactions</CardTitle>
          </div>
          {selectedDate && (
            <Button
              onClick={generatePDF}
              variant="outline"
              size="sm"
              className="bg-white hover:bg-gray-100 text-gray-900 font-bold border-2 border-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>
        <CardDescription className="text-white font-semibold">
          View transactions for a specific date
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="date-picker" className="text-gray-900 font-bold">
            Select Date
          </Label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                id="date-picker"
                variant="outline"
                className="w-full justify-start text-left font-semibold border-2 border-gray-300 bg-white hover:bg-gray-50 text-black rounded-lg shadow-sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white border-2 border-gray-300 shadow-xl" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setIsCalendarOpen(false);
                }}
                initialFocus
                className="modern-calendar"
              />
            </PopoverContent>
          </Popover>
        </div>

        {selectedDate && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Cash In</h3>
                <p className="text-xl font-black text-green-600">{formatAmount(stats.cashIn)}</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">UPI In</h3>
                <p className="text-xl font-black text-green-600">{formatAmount(stats.upiIn)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Cash Out</h3>
                <p className="text-xl font-black text-red-600">{formatAmount(stats.cashOut)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">UPI Out</h3>
                <p className="text-xl font-black text-red-600">{formatAmount(stats.upiOut)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Combined Total</h3>
                <p className="text-xl font-black text-green-600">{formatAmount(combinedTotal)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">10% Deduction</h3>
                <p className="text-xl font-black text-red-600">{formatAmount(tenPercentDeduction)}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">User Deduction</h3>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-700">₹</span>
                  <Input
                    type="number"
                    value={userDeduction}
                    onChange={(e) => handleUserDeductionChange(e.target.value)}
                    className="text-lg font-black text-red-600 border-2 border-amber-400 bg-white"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {mergedTransactions.length > 0 && (
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-md">
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-500 hover:to-blue-500">
                        <TableHead className="text-white font-bold">Type</TableHead>
                        <TableHead className="text-right text-white font-bold">Amount</TableHead>
                        <TableHead className="text-white font-bold">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mergedTransactions.map((row, index) => {
                        if (row.type === 'derived') {
                          const derived = row.data;
                          const rowKey = `derived-${derived.derivedType}-${derived.date.toString()}`;
                          return (
                            <TableRow key={rowKey} className="bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100">
                              <TableCell className="font-bold text-amber-700">{derived.derivedType}</TableCell>
                              <TableCell className={`text-right font-bold ${getDerivedRowAmountColor()}`}>
                                {formatAmount(derived.amount)}
                              </TableCell>
                              <TableCell className="text-gray-600 italic">Auto-calculated</TableCell>
                            </TableRow>
                          );
                        } else {
                          const txn = row.data;
                          const typeMap: Record<TransactionType, string> = {
                            [TransactionType.cashIn]: 'Cash In',
                            [TransactionType.cashOut]: 'Cash Out',
                            [TransactionType.upiIn]: 'UPI In',
                            [TransactionType.upiOut]: 'UPI Out',
                            [TransactionType.savingsOut]: 'Savings (10%) Out',
                            [TransactionType.deductionsOut]: 'Deductions Out',
                          };
                          const rowKey = `real-${txn.id.toString()}`;
                          return (
                            <TableRow key={rowKey} className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50">
                              <TableCell className="font-semibold text-gray-900">{typeMap[txn.transactionType]}</TableCell>
                              <TableCell className={`text-right font-bold ${getAmountColorFromType(txn.transactionType)}`}>
                                {formatAmount(txn.amount)}
                              </TableCell>
                              <TableCell className="text-gray-700">{txn.description || '-'}</TableCell>
                            </TableRow>
                          );
                        }
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {mergedTransactions.length === 0 && (
              <div className="text-center py-12 text-gray-700">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="font-bold text-gray-900">No transactions found</p>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  No transactions recorded for this date
                </p>
              </div>
            )}
          </>
        )}

        {!selectedDate && (
          <div className="text-center py-12 text-gray-700">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="font-bold text-gray-900">Select a date</p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              Choose a date to view day-wise transactions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
