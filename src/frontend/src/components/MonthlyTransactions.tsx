import { useState, useMemo } from 'react';
import { useGetAllTransactions } from '../hooks/useQueries';
import { TransactionType, Transaction } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Calendar as CalendarIconLucide, FileDown, Search } from 'lucide-react';
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
import { getDerivedRowsForMonth, isDerivedRow, isRealTransaction } from '../utils/derivedTransactions';
import type { DerivedTransactionRow, DisplayTransaction } from '../utils/derivedTransactions';
import { getAmountColorFromType, getDerivedRowAmountColor } from '../utils/transactionDirection';

// Extended type for the selector (backend types + derived types)
type MonthlyTransactionTypeSelector = TransactionType | 'cheetiDeduction' | 'savings10Percent';

export default function MonthlyTransactions() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<MonthlyTransactionTypeSelector | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isTypeSelectOpen, setIsTypeSelectOpen] = useState(false);

  const { data: transactions, isLoading, error } = useGetAllTransactions();

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

  // Filter and merge transactions with derived rows
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // Filter real transactions by month
    const monthTransactions = transactions.filter((txn) => {
      const txnDate = new Date(Number(txn.date) / 1_000_000);
      return txnDate.getFullYear() === year && txnDate.getMonth() === month;
    });

    // Get derived rows for the month
    const derivedRows = getDerivedRowsForMonth(year, month);

    // Merge real transactions and derived rows
    const allRows: DisplayTransaction[] = [...monthTransactions, ...derivedRows];

    // Apply type filter
    let typeFiltered = allRows;
    if (selectedType) {
      if (selectedType === 'cheetiDeduction') {
        typeFiltered = allRows.filter(
          (row) => isDerivedRow(row) && row.derivedType === 'Cheeti Deduction'
        );
      } else if (selectedType === 'savings10Percent') {
        typeFiltered = allRows.filter(
          (row) => isDerivedRow(row) && row.derivedType === '10% Savings'
        );
      } else {
        typeFiltered = allRows.filter(
          (row) => isRealTransaction(row) && row.transactionType === selectedType
        );
      }
    }

    // Apply search filter
    const searchFiltered = typeFiltered.filter((row) => {
      if (!searchQuery.trim()) return true;
      
      if (isRealTransaction(row)) {
        return row.description.toLowerCase().includes(searchQuery.toLowerCase());
      } else if (isDerivedRow(row)) {
        return row.derivedType.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return false;
    });

    // Sort by date descending
    return searchFiltered.sort((a, b) => Number(b.date) - Number(a.date));
  }, [transactions, selectedMonth, selectedType, searchQuery]);

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, row) => {
      return sum + Number(row.amount);
    }, 0);
  }, [filteredTransactions]);

  const handleGeneratePDF = () => {
    const monthName = format(selectedMonth, 'MMMM yyyy');
    const typeLabel = selectedType
      ? selectedType === 'cheetiDeduction'
        ? 'Cheeti Deduction'
        : selectedType === 'savings10Percent'
        ? '10% Savings'
        : getTransactionTypeLabel(selectedType as TransactionType)
      : 'All Types';

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Monthly Transactions - ${monthName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4F46E5;
          }
          .header h1 {
            color: #4F46E5;
            margin: 0;
            font-size: 28px;
          }
          .header h2 {
            color: #6B7280;
            margin: 10px 0 0 0;
            font-size: 18px;
            font-weight: normal;
          }
          .info {
            margin-bottom: 20px;
            padding: 15px;
            background-color: #F3F4F6;
            border-radius: 8px;
          }
          .info p {
            margin: 5px 0;
            font-size: 14px;
          }
          .info strong {
            color: #1F2937;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 14px;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 13px;
          }
          tr:nth-child(even) {
            background-color: #F9FAFB;
          }
          tr:hover {
            background-color: #F3F4F6;
          }
          .amount-incoming {
            color: #059669;
            font-weight: bold;
          }
          .amount-outgoing {
            color: #DC2626;
            font-weight: bold;
          }
          .derived-row {
            background-color: #FEF3C7;
            font-style: italic;
          }
          .total {
            margin-top: 20px;
            padding: 15px;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            border-radius: 8px;
            text-align: right;
            font-size: 18px;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #E5E7EB;
            text-align: center;
            color: #6B7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>APJ ENTERPRISES</h1>
          <h2>Monthly Transaction Report</h2>
        </div>
        <div class="info">
          <p><strong>Month:</strong> ${monthName}</p>
          <p><strong>Transaction Type:</strong> ${typeLabel}</p>
          ${searchQuery ? `<p><strong>Search Filter:</strong> "${searchQuery}"</p>` : ''}
          <p><strong>Total Transactions:</strong> ${filteredTransactions.length}</p>
          <p><strong>Generated:</strong> ${format(new Date(), 'PPP p')}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredTransactions.forEach((row) => {
      const dateStr = format(new Date(Number(row.date) / 1_000_000), 'dd/MM/yyyy');
      
      if (isDerivedRow(row)) {
        const amountStr = formatAmount(row.amount);
        htmlContent += `
          <tr class="derived-row">
            <td>${dateStr}</td>
            <td>${row.derivedType}</td>
            <td><em>Auto-calculated deduction</em></td>
            <td style="text-align: right;" class="amount-outgoing">${amountStr}</td>
          </tr>
        `;
      } else if (isRealTransaction(row)) {
        const typeLabel = getTransactionTypeLabel(row.transactionType);
        const description = row.description || '-';
        const amountStr = formatAmount(row.amount);
        const amountClass = getAmountColorFromType(row.transactionType) === 'text-green-600' 
          ? 'amount-incoming' 
          : 'amount-outgoing';
        
        htmlContent += `
          <tr>
            <td>${dateStr}</td>
            <td>${typeLabel}</td>
            <td>${description}</td>
            <td style="text-align: right;" class="${amountClass}">${amountStr}</td>
          </tr>
        `;
      }
    });

    htmlContent += `
          </tbody>
        </table>
        <div class="total">
          Total Amount: ${formatAmount(BigInt(totalAmount))}
        </div>
        <div class="footer">
          <p>This report was generated automatically by APJ ENTERPRISES Transaction Management System</p>
          <p>For any queries, please contact your administrator</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `monthly-transactions-${format(selectedMonth, 'yyyy-MM')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CalendarIconLucide className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Monthly Transactions</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            View transactions by month and type
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
        <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CalendarIconLucide className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Monthly Transactions</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            View transactions by month and type
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">
              Failed to load transactions. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-t-2xl border-b border-gray-200">
        <div className="flex items-center gap-2">
          <CalendarIconLucide className="h-5 w-5 text-white" />
          <CardTitle className="text-white font-bold">Monthly Transactions</CardTitle>
        </div>
        <CardDescription className="text-white font-semibold">
          View transactions by month and type
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="month-picker" className="text-gray-900 font-bold">
              Select Month
            </Label>
            <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="month-picker"
                  variant="outline"
                  className="w-full justify-start text-left font-semibold border-2 border-gray-300 bg-white hover:bg-gray-50 text-black rounded-lg shadow-sm"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  {format(selectedMonth, 'MMMM yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-2 border-gray-300 shadow-xl" align="start">
                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthDate = new Date(selectedMonth.getFullYear(), i, 1);
                      const isSelected = selectedMonth.getMonth() === i;
                      return (
                        <Button
                          key={i}
                          variant={isSelected ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setSelectedMonth(monthDate);
                            setIsMonthPickerOpen(false);
                          }}
                          className={
                            isSelected
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow-md'
                              : 'border-2 border-gray-300 bg-white hover:bg-gray-100 text-black font-semibold'
                          }
                        >
                          {format(monthDate, 'MMM')}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMonth(new Date(selectedMonth.getFullYear() - 1, selectedMonth.getMonth(), 1));
                      }}
                      className="flex-1 border-2 border-gray-300 bg-white hover:bg-gray-100 text-black font-semibold"
                    >
                      {selectedMonth.getFullYear() - 1}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMonth(new Date(selectedMonth.getFullYear() + 1, selectedMonth.getMonth(), 1));
                      }}
                      className="flex-1 border-2 border-gray-300 bg-white hover:bg-gray-100 text-black font-semibold"
                    >
                      {selectedMonth.getFullYear() + 1}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type-select" className="text-gray-900 font-bold">
              Transaction Type
            </Label>
            <Select
              value={selectedType}
              onValueChange={(value) => {
                setSelectedType(value as MonthlyTransactionTypeSelector | '');
                setIsTypeSelectOpen(false);
              }}
              open={isTypeSelectOpen}
              onOpenChange={setIsTypeSelectOpen}
            >
              <SelectTrigger
                id="type-select"
                className="w-full border-2 border-gray-300 bg-white hover:bg-gray-50 text-black font-semibold rounded-lg shadow-sm"
              >
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-300 shadow-xl">
                <SelectItem value="" className="font-semibold text-black hover:bg-gray-100">
                  All Types
                </SelectItem>
                <SelectItem value={TransactionType.cashIn} className="font-semibold text-black hover:bg-gray-100">
                  Cash In
                </SelectItem>
                <SelectItem value={TransactionType.cashOut} className="font-semibold text-black hover:bg-gray-100">
                  Cash Out
                </SelectItem>
                <SelectItem value={TransactionType.upiIn} className="font-semibold text-black hover:bg-gray-100">
                  UPI In
                </SelectItem>
                <SelectItem value={TransactionType.upiOut} className="font-semibold text-black hover:bg-gray-100">
                  UPI Out
                </SelectItem>
                <SelectItem value={TransactionType.savingsOut} className="font-semibold text-black hover:bg-gray-100">
                  Savings (10%) Out
                </SelectItem>
                <SelectItem value={TransactionType.deductionsOut} className="font-semibold text-black hover:bg-gray-100">
                  Deductions Out
                </SelectItem>
                <SelectItem value="cheetiDeduction" className="font-semibold text-black hover:bg-gray-100">
                  Cheeti Deduction
                </SelectItem>
                <SelectItem value="savings10Percent" className="font-semibold text-black hover:bg-gray-100">
                  Savings (10%)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="search" className="text-gray-900 font-bold">
            Search Description
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              id="search"
              type="text"
              placeholder="Search by description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-2 border-gray-300 bg-white text-black font-semibold rounded-lg shadow-sm"
            />
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700 font-semibold">
            Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
          </div>
          <Button
            onClick={handleGeneratePDF}
            disabled={filteredTransactions.length === 0}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg shadow-md transition-all duration-200 disabled:opacity-50"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-md">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-500 hover:to-indigo-500">
                  <TableHead className="text-white font-bold">Date</TableHead>
                  <TableHead className="text-white font-bold">Type</TableHead>
                  <TableHead className="text-white font-bold">Description</TableHead>
                  <TableHead className="text-right text-white font-bold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-700 font-semibold">
                      No transactions found for the selected criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((row, index) => {
                    const rowKey = isDerivedRow(row)
                      ? `derived-${row.derivedType}-${row.date.toString()}`
                      : `txn-${(row as Transaction).id.toString()}`;

                    if (isDerivedRow(row)) {
                      return (
                        <TableRow key={rowKey} className="bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100">
                          <TableCell className="font-semibold text-gray-900">
                            {format(new Date(Number(row.date) / 1_000_000), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-bold text-amber-700">{row.derivedType}</TableCell>
                          <TableCell className="italic text-gray-700 font-medium">Auto-calculated deduction</TableCell>
                          <TableCell className={`text-right font-bold ${getDerivedRowAmountColor()}`}>
                            {formatAmount(row.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const transaction = row as Transaction;
                    const amountColorClass = getAmountColorFromType(transaction.transactionType);

                    return (
                      <TableRow key={rowKey} className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50">
                        <TableCell className="font-semibold text-gray-900">
                          {format(new Date(Number(transaction.date) / 1_000_000), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-semibold text-gray-900">
                          {getTransactionTypeLabel(transaction.transactionType)}
                        </TableCell>
                        <TableCell className="font-medium text-gray-700">
                          {transaction.description || '-'}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${amountColorClass}`}>
                          {formatAmount(transaction.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-4 shadow-md">
          <div className="flex justify-between items-center text-white">
            <span className="font-bold text-lg">Total Amount:</span>
            <span className="font-black text-2xl">{formatAmount(BigInt(totalAmount))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
