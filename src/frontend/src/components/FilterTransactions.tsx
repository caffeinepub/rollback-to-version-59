import { useState, useMemo } from 'react';
import { useGetAllTransactions } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, Calendar as CalendarIconLucide } from 'lucide-react';
import { format } from 'date-fns';
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
import { normalizeDateToStartOfDay, getDerivedRowsForDateRange, isDerivedRow } from '../utils/derivedTransactions';
import type { DerivedTransactionRow } from '../utils/derivedTransactions';
import { getDerivedRowAmountColor } from '../utils/transactionDirection';
import { TransactionType } from '../backend';

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

export default function FilterTransactions() {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

  const { data: transactions, isLoading, error } = useGetAllTransactions();

  const formatAmount = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  // Filter transactions and calculate stats
  const filterData = useMemo(() => {
    if (!transactions || !startDate || !endDate) return null;

    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    // Group transactions by date
    const transactionsByDate = new Map<string, { cashIn: bigint; upiIn: bigint; totalTransaction: bigint }>();

    transactions.forEach((txn) => {
      const txnDateMs = Number(txn.date) / 1_000_000;
      if (txnDateMs >= startTimestamp && txnDateMs <= endTimestamp) {
        const txnDate = new Date(txnDateMs);
        txnDate.setHours(0, 0, 0, 0);
        const dateKey = BigInt(txnDate.getTime() * 1_000_000).toString();

        if (!transactionsByDate.has(dateKey)) {
          transactionsByDate.set(dateKey, { cashIn: 0n, upiIn: 0n, totalTransaction: 0n });
        }

        const stats = transactionsByDate.get(dateKey)!;
        if (txn.transactionType === TransactionType.cashIn) {
          stats.cashIn += txn.amount;
          stats.totalTransaction += txn.amount;
        } else if (txn.transactionType === TransactionType.upiIn) {
          stats.upiIn += txn.amount;
          stats.totalTransaction += txn.amount;
        }
      }
    });

    // Get user deductions
    const userDeductions = getLocalUserDeductions();

    // Convert to array with calculated deductions
    const result = Array.from(transactionsByDate.entries()).map(([dateKey, stats]) => {
      const totalTransaction = stats.totalTransaction;
      const tenPercent = (totalTransaction * 10n) / 100n;
      const remainder = tenPercent % 10n;
      const tenPercentDeduction = remainder >= 5n ? tenPercent + (10n - remainder) : tenPercent - remainder;
      const userAmountDeduction = userDeductions[dateKey] || 0n;

      return {
        date: BigInt(dateKey),
        cashIn: stats.cashIn,
        upiIn: stats.upiIn,
        totalTransaction,
        tenPercentDeduction,
        userAmountDeduction,
      };
    });

    return result.sort((a, b) => Number(b.date) - Number(a.date));
  }, [transactions, startDate, endDate]);

  // Merge filter data with derived rows
  const mergedData = useMemo(() => {
    if (!filterData || !startDate || !endDate) return [];

    const derivedRows = getDerivedRowsForDateRange(startDate, endDate);

    // Create a combined array with both filter data and derived rows
    type MergedRow =
      | { type: 'filter'; data: (typeof filterData)[0] }
      | { type: 'derived'; data: DerivedTransactionRow };

    const combined: MergedRow[] = [
      ...filterData.map((item) => ({ type: 'filter' as const, data: item })),
      ...derivedRows.map((item) => ({ type: 'derived' as const, data: item })),
    ];

    // Sort by date descending
    combined.sort((a, b) => {
      const dateA = a.type === 'filter' ? a.data.date : a.data.date;
      const dateB = b.type === 'filter' ? b.data.date : b.data.date;
      return Number(dateB) - Number(dateA);
    });

    return combined;
  }, [filterData, startDate, endDate]);

  const totalStats = useMemo(() => {
    if (!filterData) return { totalCashIn: 0n, totalUpiIn: 0n, totalTransactions: 0n, totalDeductions: 0n };

    return filterData.reduce(
      (acc, item) => ({
        totalCashIn: acc.totalCashIn + item.cashIn,
        totalUpiIn: acc.totalUpiIn + item.upiIn,
        totalTransactions: acc.totalTransactions + item.totalTransaction,
        totalDeductions: acc.totalDeductions + item.tenPercentDeduction + item.userAmountDeduction,
      }),
      { totalCashIn: 0n, totalUpiIn: 0n, totalTransactions: 0n, totalDeductions: 0n }
    );
  }, [filterData]);

  const shouldFetch = startDate !== undefined && endDate !== undefined;

  if (isLoading && shouldFetch) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Filter Transactions</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            Filter transactions by date range
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full bg-gray-200" />
            <Skeleton className="h-10 w-full bg-gray-200" />
            <Skeleton className="h-64 w-full bg-gray-200" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && shouldFetch) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Filter Transactions</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            Filter transactions by date range
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              Failed to load filtered transactions. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-white" />
          <CardTitle className="text-white font-bold">Filter Transactions</CardTitle>
        </div>
        <CardDescription className="text-white font-semibold">
          Filter transactions by date range
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-gray-900 font-bold">
              Start Date
            </Label>
            <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant="outline"
                  className="w-full justify-start text-left font-semibold border-2 border-gray-300 bg-white hover:bg-gray-50 text-black rounded-lg shadow-sm"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-2 border-gray-300 shadow-xl" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => {
                    setStartDate(date);
                    setIsStartCalendarOpen(false);
                  }}
                  initialFocus
                  className="modern-calendar"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-gray-900 font-bold">
              End Date
            </Label>
            <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  variant="outline"
                  className="w-full justify-start text-left font-semibold border-2 border-gray-300 bg-white hover:bg-gray-50 text-black rounded-lg shadow-sm"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-2 border-gray-300 shadow-xl" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => {
                    setEndDate(date);
                    setIsEndCalendarOpen(false);
                  }}
                  initialFocus
                  className="modern-calendar"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {shouldFetch && mergedData.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Total Cash In</h3>
                <p className="text-xl font-black text-green-600">{formatAmount(totalStats.totalCashIn)}</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Total UPI In</h3>
                <p className="text-xl font-black text-green-600">{formatAmount(totalStats.totalUpiIn)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Total Transactions</h3>
                <p className="text-xl font-black text-green-600">{formatAmount(totalStats.totalTransactions)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-4 shadow-md">
                <h3 className="text-sm font-bold text-gray-700 mb-2">Total Deductions</h3>
                <p className="text-xl font-black text-red-600">{formatAmount(totalStats.totalDeductions)}</p>
              </div>
            </div>

            <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-md">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10">
                    <TableRow className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-500 hover:to-blue-500">
                      <TableHead className="text-white font-bold">Date</TableHead>
                      <TableHead className="text-white font-bold">Type</TableHead>
                      <TableHead className="text-right text-white font-bold">Cash In</TableHead>
                      <TableHead className="text-right text-white font-bold">UPI In</TableHead>
                      <TableHead className="text-right text-white font-bold">Total</TableHead>
                      <TableHead className="text-right text-white font-bold">10% Deduction</TableHead>
                      <TableHead className="text-right text-white font-bold">User Deduction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mergedData.map((row, index) => {
                      if (row.type === 'derived') {
                        const derivedRow = row.data;
                        const rowKey = `derived-${derivedRow.derivedType}-${derivedRow.date.toString()}`;
                        return (
                          <TableRow key={rowKey} className="bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100">
                            <TableCell className="font-semibold text-gray-900">
                              {format(new Date(Number(derivedRow.date) / 1_000_000), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="font-bold text-amber-700">{derivedRow.derivedType}</TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className="text-right">-</TableCell>
                            <TableCell className={`text-right font-bold ${getDerivedRowAmountColor()}`}>
                              {derivedRow.derivedType === '10% Savings' ? formatAmount(derivedRow.amount) : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${getDerivedRowAmountColor()}`}>
                              {derivedRow.derivedType === 'Cheeti Deduction' ? formatAmount(derivedRow.amount) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        const filterRow = row.data;
                        const rowKey = `filter-${filterRow.date.toString()}`;
                        return (
                          <TableRow key={rowKey} className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50">
                            <TableCell className="font-semibold text-gray-900">
                              {format(new Date(Number(filterRow.date) / 1_000_000), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="font-semibold text-gray-900">Daily Summary</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatAmount(filterRow.cashIn)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatAmount(filterRow.upiIn)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatAmount(filterRow.totalTransaction)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {formatAmount(filterRow.tenPercentDeduction)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {formatAmount(filterRow.userAmountDeduction)}
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {shouldFetch && mergedData.length === 0 && (
          <div className="text-center py-12 text-gray-700">
            <CalendarIconLucide className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="font-bold text-gray-900">No transactions found</p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              Try selecting a different date range
            </p>
          </div>
        )}

        {!shouldFetch && (
          <div className="text-center py-12 text-gray-700">
            <Filter className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="font-bold text-gray-900">Select a date range</p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              Choose start and end dates to filter transactions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
