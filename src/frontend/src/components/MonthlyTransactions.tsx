import { useState, useMemo } from 'react';
import { useGetAllTransactions } from '../hooks/useQueries';
import { Transaction, TransactionType } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
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
import { format } from 'date-fns';
import { getDerivedRowsForMonth, getDerivedRowsForYear } from '../utils/derivedTransactions';
import type { DerivedTransactionRow } from '../utils/derivedTransactions';
import { getAmountColorFromType, getDerivedRowAmountColor } from '../utils/transactionDirection';

type ViewMode = 'month' | 'year';

export default function MonthlyTransactions() {
  const currentDate = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data: transactions, isLoading, error } = useGetAllTransactions();

  const formatAmount = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: TransactionType.cashIn, label: 'Cash In' },
    { value: TransactionType.cashOut, label: 'Cash Out' },
    { value: TransactionType.upiIn, label: 'UPI In' },
    { value: TransactionType.upiOut, label: 'UPI Out' },
    { value: TransactionType.savingsOut, label: 'Savings (10%) Out' },
    { value: TransactionType.deductionsOut, label: 'Deductions Out' },
  ];

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = transactions.filter((txn) => {
      const txnDate = new Date(Number(txn.date) / 1_000_000);
      const txnYear = txnDate.getFullYear();
      const txnMonth = txnDate.getMonth() + 1;

      if (viewMode === 'month') {
        return txnYear === selectedYear && txnMonth === selectedMonth;
      } else {
        return txnYear === selectedYear;
      }
    });

    if (selectedType !== 'all') {
      filtered = filtered.filter((txn) => txn.transactionType === selectedType);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((txn) => {
        const description = String(txn.description || '').toLowerCase();
        const amount = String(txn.amount || '').toLowerCase();
        return description.includes(query) || amount.includes(query);
      });
    }

    return filtered.sort((a, b) => Number(b.date) - Number(a.date));
  }, [transactions, viewMode, selectedYear, selectedMonth, selectedType, searchQuery]);

  const derivedRows = useMemo(() => {
    if (viewMode === 'month') {
      return getDerivedRowsForMonth(selectedYear, selectedMonth);
    } else {
      return getDerivedRowsForYear(selectedYear);
    }
  }, [viewMode, selectedYear, selectedMonth]);

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

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, txn) => sum + txn.amount, 0n);
  }, [filteredTransactions]);

  const generatePDF = () => {
    const periodLabel = viewMode === 'month' 
      ? `${months.find((m) => m.value === selectedMonth)?.label} ${selectedYear}`
      : `Year ${selectedYear}`;
    
    let content = `Monthly Transactions Report\nPeriod: ${periodLabel}\n`;
    content += `Type: ${typeOptions.find((t) => t.value === selectedType)?.label}\n\n`;
    content += `Total Amount: ${formatAmount(totalAmount)}\n`;
    content += `Transaction Count: ${filteredTransactions.length}\n\n`;
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
        const dateStr = format(new Date(Number(txn.date) / 1_000_000), 'dd/MM/yyyy');
        content += `${dateStr} - ${typeMap[txn.transactionType]}: ${formatAmount(txn.amount)} - ${txn.description}\n`;
      } else {
        const derived = row.data;
        const dateStr = format(new Date(Number(derived.date) / 1_000_000), 'dd/MM/yyyy');
        content += `${dateStr} - ${derived.derivedType}: ${formatAmount(derived.amount)}\n`;
      }
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${selectedYear}-${viewMode === 'month' ? selectedMonth : 'full'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
          <CardTitle className="text-white font-bold">Monthly Transactions</CardTitle>
          <CardDescription className="text-white font-semibold">
            View transactions by month or year
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

  if (error) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-2xl border-b border-gray-200">
          <CardTitle className="text-white font-bold">Monthly Transactions</CardTitle>
          <CardDescription className="text-white font-semibold">
            View transactions by month or year
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              Failed to load monthly transactions. Please try again.
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
          <div>
            <CardTitle className="text-white font-bold">Monthly Transactions</CardTitle>
            <CardDescription className="text-white font-semibold">
              View transactions by month or year
            </CardDescription>
          </div>
          <Button
            onClick={generatePDF}
            variant="outline"
            size="sm"
            className="bg-white hover:bg-gray-100 text-gray-900 font-bold border-2 border-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="view-mode" className="text-gray-900 font-bold">
              View Mode
            </Label>
            <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <SelectTrigger
                id="view-mode"
                className="w-full border-2 border-gray-300 bg-white text-black font-bold rounded-lg shadow-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-300 shadow-xl">
                <SelectItem value="month" className="font-semibold text-gray-900">
                  Month View
                </SelectItem>
                <SelectItem value="year" className="font-semibold text-gray-900">
                  Year View
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="year-select" className="text-gray-900 font-bold">
              Year
            </Label>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger
                id="year-select"
                className="w-full border-2 border-gray-300 bg-white text-black font-bold rounded-lg shadow-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-300 shadow-xl">
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()} className="font-semibold text-gray-900">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {viewMode === 'month' && (
          <div className="space-y-2">
            <Label htmlFor="month-select" className="text-gray-900 font-bold">
              Month
            </Label>
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger
                id="month-select"
                className="w-full border-2 border-gray-300 bg-white text-black font-bold rounded-lg shadow-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-300 shadow-xl">
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()} className="font-semibold text-gray-900">
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type-select" className="text-gray-900 font-bold">
              Transaction Type
            </Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger
                id="type-select"
                className="monthly-transaction-type-trigger w-full border-2 border-gray-300 bg-white text-black font-bold rounded-lg shadow-sm"
              >
                <SelectValue className="monthly-transaction-type-value" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-300 shadow-xl">
                {typeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="monthly-type-item font-semibold text-gray-900"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search" className="text-gray-900 font-bold">
              Search
            </Label>
            <Input
              id="search"
              type="text"
              placeholder="Search by description or amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-2 border-gray-300 bg-white text-black font-semibold rounded-lg shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Total Amount</h3>
            <p className="text-2xl font-black text-blue-600">{formatAmount(totalAmount)}</p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-300 rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Transaction Count</h3>
            <p className="text-2xl font-black text-teal-600">{filteredTransactions.length}</p>
          </div>
        </div>

        {mergedTransactions.length > 0 && (
          <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-md">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-500 hover:to-blue-500">
                    <TableHead className="text-white font-bold">Date</TableHead>
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
                          <TableCell className="font-semibold text-gray-900">
                            {format(new Date(Number(derived.date) / 1_000_000), 'dd/MM/yyyy')}
                          </TableCell>
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
                          <TableCell className="font-semibold text-gray-900">
                            {format(new Date(Number(txn.date) / 1_000_000), 'dd/MM/yyyy')}
                          </TableCell>
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
            <p className="font-bold text-gray-900">No transactions found</p>
            <p className="mt-2 text-sm font-medium text-gray-600">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
