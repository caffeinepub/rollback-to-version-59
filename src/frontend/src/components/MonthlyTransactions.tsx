import { useState, useMemo } from 'react';
import { useGetAllTransactions } from '../hooks/useQueries';
import { TransactionType } from '../backend';
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
import { getDerivedRowsForMonth } from '../utils/derivedTransactions';
import type { DerivedTransactionRow } from '../utils/derivedTransactions';

// Extended type for the selector (backend types + derived types)
type MonthlyTransactionTypeSelector = TransactionType | 'cheetiDeduction' | 'savings10Percent';

export default function MonthlyTransactions() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<MonthlyTransactionTypeSelector | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const { data: transactions, isLoading, error } = useGetAllTransactions();

  // Filter transactions by selected month and type
  const filteredTransactions = useMemo(() => {
    if (!selectedType) return [];

    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthNum = selectedMonth.getMonth();

    // Handle derived types
    if (selectedType === 'cheetiDeduction' || selectedType === 'savings10Percent') {
      const derivedRows = getDerivedRowsForMonth(selectedYear, selectedMonthNum);
      
      // Filter by derived type
      return derivedRows.filter((row) => {
        if (selectedType === 'cheetiDeduction') {
          return row.derivedType === 'Cheeti Deduction';
        } else {
          return row.derivedType === '10% Savings';
        }
      });
    }

    // Handle real transaction types
    if (!transactions) return [];

    return transactions.filter((t) => {
      // Check transaction type
      if (t.transactionType !== selectedType) return false;

      // Check if transaction is in selected month
      const txnDateMs = Number(t.date) / 1_000_000;
      const txnDate = new Date(txnDateMs);
      return (
        txnDate.getFullYear() === selectedYear &&
        txnDate.getMonth() === selectedMonthNum
      );
    });
  }, [transactions, selectedMonth, selectedType]);

  // Apply description search filter
  const searchFilteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return filteredTransactions;

    const lowerQuery = searchQuery.toLowerCase();
    
    return filteredTransactions.filter((item) => {
      // For derived rows
      if ('isDerived' in item && item.isDerived) {
        const derivedRow = item as DerivedTransactionRow;
        // Derived rows have a derivedType that can be searched
        return derivedRow.derivedType.toLowerCase().includes(lowerQuery);
      }
      
      // For real transactions
      const description = (item as any).description || '';
      return description.toLowerCase().includes(lowerQuery);
    });
  }, [filteredTransactions, searchQuery]);

  // Calculate totals
  const totalAmount = useMemo(() => {
    return searchFilteredTransactions.reduce((sum, item) => {
      if ('isDerived' in item && item.isDerived) {
        const derivedRow = item as DerivedTransactionRow;
        // Derived amounts are negative, so we take absolute value
        return sum + (derivedRow.amount < 0n ? -derivedRow.amount : derivedRow.amount);
      }
      return sum + (item as any).amount;
    }, 0n);
  }, [searchFilteredTransactions]);

  const formatAmount = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatDate = (date: bigint) => {
    const dateMs = Number(date) / 1_000_000;
    return format(new Date(dateMs), 'dd MMM yyyy, hh:mm a');
  };

  const getTransactionTypeLabel = (type: MonthlyTransactionTypeSelector): string => {
    if (type === 'cheetiDeduction') return 'Cheeti Deduction';
    if (type === 'savings10Percent') return 'Savings (10%)';
    
    const labels: Record<TransactionType, string> = {
      [TransactionType.cashIn]: 'Cash In',
      [TransactionType.cashOut]: 'Cash Out',
      [TransactionType.upiIn]: 'UPI In',
      [TransactionType.upiOut]: 'UPI Out',
      [TransactionType.savingsOut]: 'Savings (10%) Out',
      [TransactionType.deductionsOut]: 'Deductions Out',
    };
    return labels[type as TransactionType] || 'Unknown';
  };

  const getTransactionTypeColor = (type: MonthlyTransactionTypeSelector): string => {
    if (type === 'cheetiDeduction') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (type === 'savings10Percent') return 'bg-purple-100 text-purple-800 border-purple-300';
    
    const colors: Record<TransactionType, string> = {
      [TransactionType.cashIn]: 'bg-green-100 text-green-800 border-green-300',
      [TransactionType.cashOut]: 'bg-red-100 text-red-800 border-red-300',
      [TransactionType.upiIn]: 'bg-teal-100 text-teal-800 border-teal-300',
      [TransactionType.upiOut]: 'bg-orange-100 text-orange-800 border-orange-300',
      [TransactionType.savingsOut]: 'bg-purple-100 text-purple-800 border-purple-300',
      [TransactionType.deductionsOut]: 'bg-amber-100 text-amber-800 border-amber-300',
    };
    return colors[type as TransactionType] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Generate month options for the past 12 months
  const monthOptions = useMemo(() => {
    const options: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push(date);
    }
    return options;
  }, []);

  const handleMonthSelect = (month: Date) => {
    setSelectedMonth(month);
    setIsMonthPickerOpen(false);
  };

  const handleTypeSelect = (value: string) => {
    setSelectedType(value as MonthlyTransactionTypeSelector);
    setIsTypeDropdownOpen(false);
    setSearchQuery(''); // Clear search when changing type
  };

  const generatePDF = () => {
    if (!selectedType || searchFilteredTransactions.length === 0) return;

    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Monthly Transaction Report - ${format(selectedMonth, 'MMMM yyyy')}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px solid #0ea5e9;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #0ea5e9;
      margin: 0;
      font-size: 28px;
    }
    .header h2 {
      color: #64748b;
      margin: 10px 0 0 0;
      font-size: 18px;
      font-weight: normal;
    }
    .summary {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      padding: 20px;
      border-radius: 12px;
      margin-bottom: 30px;
      border: 2px solid #0ea5e9;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .summary-item {
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-label {
      font-size: 14px;
      color: #64748b;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .summary-value {
      font-size: 24px;
      color: #0ea5e9;
      font-weight: bold;
    }
    .transaction-table {
      width: 100%;
      border-collapse: collapse;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .transaction-table th {
      background: linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%);
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      font-size: 14px;
    }
    .transaction-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
      word-wrap: break-word;
      max-width: 300px;
    }
    .transaction-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }
    .badge-cash-in {
      background-color: #d1fae5;
      color: #065f46;
    }
    .badge-cash-out {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .badge-upi-in {
      background-color: #dbeafe;
      color: #1e40af;
    }
    .badge-upi-out {
      background-color: #fed7aa;
      color: #9a3412;
    }
    .badge-savings-out {
      background-color: #e9d5ff;
      color: #6b21a8;
    }
    .badge-deductions-out {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-cheeti {
      background-color: #fef3c7;
      color: #92400e;
    }
    .badge-savings10 {
      background-color: #e9d5ff;
      color: #6b21a8;
    }
    .amount-positive {
      color: #059669;
      font-weight: bold;
    }
    .amount-negative {
      color: #dc2626;
      font-weight: bold;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #64748b;
      font-size: 12px;
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>APJ ENTERPRISES</h1>
    <h2>Monthly Transaction Report</h2>
    <h2>${format(selectedMonth, 'MMMM yyyy')} - ${getTransactionTypeLabel(selectedType as MonthlyTransactionTypeSelector)}</h2>
  </div>

  <div class="summary">
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Total Transactions</div>
        <div class="summary-value">${searchFilteredTransactions.length}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Total Amount</div>
        <div class="summary-value">${formatAmount(totalAmount)}</div>
      </div>
    </div>
  </div>

  <table class="transaction-table">
    <thead>
      <tr>
        <th>Date & Time</th>
        <th>Type</th>
        <th>Amount</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      ${searchFilteredTransactions
        .map((item) => {
          if ('isDerived' in item && item.isDerived) {
            const derivedRow = item as DerivedTransactionRow;
            const badgeClass = derivedRow.derivedType === 'Cheeti Deduction' ? 'badge-cheeti' : 'badge-savings10';
            const amount = derivedRow.amount < 0n ? -derivedRow.amount : derivedRow.amount;
            return `
      <tr>
        <td>${formatDate(derivedRow.date)}</td>
        <td>
          <span class="badge ${badgeClass}">
            ${derivedRow.derivedType}
          </span>
        </td>
        <td class="amount-negative">
          ${formatAmount(amount)}
        </td>
        <td>${derivedRow.derivedType}</td>
      </tr>
      `;
          } else {
            const t = item as any;
            return `
      <tr>
        <td>${formatDate(t.date)}</td>
        <td>
          <span class="badge badge-${t.transactionType.toLowerCase().replace('out', '-out')}">
            ${getTransactionTypeLabel(t.transactionType)}
          </span>
        </td>
        <td class="${t.transactionType.includes('In') ? 'amount-positive' : 'amount-negative'}">
          ${formatAmount(t.amount)}
        </td>
        <td>${t.description || '-'}</td>
      </tr>
      `;
          }
        })
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated on ${format(new Date(), 'PPP')} at ${format(new Date(), 'pp')}</p>
    <p>© 2026 APJ ENTERPRISES. All rights reserved.</p>
  </div>
</body>
</html>
    `;

    // Create a blob and download
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `APJ_Monthly_Report_${format(selectedMonth, 'yyyy-MM')}_${selectedType}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also try to open print dialog for PDF conversion
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <Card className="mx-auto max-w-6xl bg-white border border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl border-b border-gray-200">
        <div className="flex items-center gap-2">
          <CalendarIconLucide className="h-5 w-5 text-white" />
          <CardTitle className="text-white font-bold">Monthly Transactions</CardTitle>
        </div>
        <CardDescription className="text-white font-semibold">
          View all transactions by type for a specific month
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Month and Type Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Month Selector */}
            <div className="space-y-2">
              <Label className="text-gray-900 font-bold text-base">Select Month</Label>
              <Popover open={isMonthPickerOpen} onOpenChange={setIsMonthPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-semibold text-lg h-14 px-5 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-400 bg-white border-gray-300 shadow-sm text-black hover:text-black hover:font-bold"
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 text-blue-600" />
                    <span className="text-lg font-bold text-black">
                      {format(selectedMonth, 'MMMM yyyy')}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl" align="start">
                  <div className="space-y-2">
                    {monthOptions.map((month) => (
                      <Button
                        key={month.toISOString()}
                        variant={
                          selectedMonth.getMonth() === month.getMonth() &&
                          selectedMonth.getFullYear() === month.getFullYear()
                            ? 'default'
                            : 'outline'
                        }
                        className="w-full justify-start text-black font-semibold hover:text-black hover:font-bold"
                        onClick={() => handleMonthSelect(month)}
                      >
                        {format(month, 'MMMM yyyy')}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Transaction Type Selector with Enhanced Visibility */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-gray-900 font-bold text-base">
                Transaction Type
              </Label>
              <Select value={selectedType} onValueChange={handleTypeSelect} open={isTypeDropdownOpen} onOpenChange={setIsTypeDropdownOpen}>
                <SelectTrigger
                  id="type"
                  className="monthly-transaction-type-trigger bg-white border-2 border-gray-300 text-gray-900 h-14 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-semibold text-lg"
                >
                  <SelectValue placeholder="Select transaction type" className="monthly-transaction-type-value text-gray-900 font-semibold" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-gray-200 shadow-xl rounded-xl">
                  <SelectItem
                    value={TransactionType.cashIn}
                    className="monthly-type-item bg-green-50 text-gray-900 hover:bg-green-100 focus:bg-green-100 rounded-lg transition-all duration-200 font-semibold my-1"
                  >
                    Cash In
                  </SelectItem>
                  <SelectItem
                    value={TransactionType.cashOut}
                    className="monthly-type-item bg-red-50 text-gray-900 hover:bg-red-100 focus:bg-red-100 rounded-lg transition-all duration-200 font-semibold my-1"
                  >
                    Cash Out
                  </SelectItem>
                  <SelectItem
                    value={TransactionType.upiIn}
                    className="monthly-type-item bg-teal-50 text-gray-900 hover:bg-teal-100 focus:bg-teal-100 rounded-lg transition-all duration-200 font-semibold my-1"
                  >
                    UPI In
                  </SelectItem>
                  <SelectItem
                    value={TransactionType.upiOut}
                    className="monthly-type-item bg-orange-50 text-gray-900 hover:bg-orange-100 focus:bg-orange-100 rounded-lg transition-all duration-200 font-semibold my-1"
                  >
                    UPI Out
                  </SelectItem>
                  <SelectItem
                    value={TransactionType.savingsOut}
                    className="monthly-type-item bg-purple-50 text-gray-900 hover:bg-purple-100 focus:bg-purple-100 rounded-lg transition-all duration-200 font-semibold my-1"
                  >
                    Savings (10%) Out
                  </SelectItem>
                  <SelectItem
                    value={TransactionType.deductionsOut}
                    className="monthly-type-item bg-amber-50 text-gray-900 hover:bg-amber-100 focus:bg-amber-100 rounded-lg transition-all duration-200 font-semibold my-1"
                  >
                    Deductions Out
                  </SelectItem>
                  <SelectItem
                    value="cheetiDeduction"
                    className="monthly-type-item bg-amber-50 text-gray-900 hover:bg-amber-100 focus:bg-amber-100 rounded-lg transition-all duration-200 font-semibold my-1"
                  >
                    Cheeti Deduction
                  </SelectItem>
                  <SelectItem
                    value="savings10Percent"
                    className="monthly-type-item bg-purple-50 text-gray-900 hover:bg-purple-100 focus:bg-purple-100 rounded-lg transition-all duration-200 font-semibold my-1"
                  >
                    Savings (10%)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description Search Field */}
          {selectedType && (
            <div className="space-y-2">
              <Label htmlFor="search" className="text-gray-900 font-bold text-base">
                Search Description
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 rounded-xl border-2 border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 transition-all duration-200 text-gray-900 font-medium"
                />
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {selectedType && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-gray-900">Total Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {searchFilteredTransactions.length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-gray-900">Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {formatAmount(totalAmount)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Generate PDF Button */}
          {selectedType && searchFilteredTransactions.length > 0 && (
            <Button
              onClick={generatePDF}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-black font-bold shadow-lg transition-all duration-300 hover:shadow-xl h-12 text-base rounded-xl"
            >
              <FileDown className="mr-2 h-5 w-5" />
              Download Monthly Report as PDF
            </Button>
          )}

          {/* Transactions Table with Enhanced Vertical Scrolling */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full bg-gray-200" />
              <Skeleton className="h-12 w-full bg-gray-200" />
              <Skeleton className="h-12 w-full bg-gray-200" />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="bg-red-50 border-red-200 shadow-md">
              <AlertDescription className="text-red-800">
                Failed to load transactions. Please try again.
              </AlertDescription>
            </Alert>
          ) : !selectedType ? (
            <Alert className="bg-blue-50 border-blue-200 shadow-md">
              <AlertDescription className="text-blue-900 font-semibold">
                Please select a transaction type to view monthly transactions.
              </AlertDescription>
            </Alert>
          ) : searchFilteredTransactions.length === 0 ? (
            <Alert className="bg-yellow-50 border-yellow-200 shadow-md">
              <AlertDescription className="text-yellow-900 font-semibold">
                No transactions found for {getTransactionTypeLabel(selectedType as MonthlyTransactionTypeSelector)} in {format(selectedMonth, 'MMMM yyyy')}.
                {searchQuery && ' Try adjusting your search.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-lg">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-gradient-to-r from-teal-500 to-blue-500">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-white font-bold text-base">Date & Time</TableHead>
                      <TableHead className="text-white font-bold text-base">Type</TableHead>
                      <TableHead className="text-white font-bold text-base">Amount</TableHead>
                      <TableHead className="text-white font-bold text-base">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchFilteredTransactions.map((item, index) => {
                      // Handle derived rows
                      if ('isDerived' in item && item.isDerived) {
                        const derivedRow = item as DerivedTransactionRow;
                        const amount = derivedRow.amount < 0n ? -derivedRow.amount : derivedRow.amount;
                        return (
                          <TableRow
                            key={`derived-${derivedRow.derivedType}-${derivedRow.date}-${index}`}
                            className={`${
                              index % 2 === 0 ? 'bg-amber-50' : 'bg-white'
                            } hover:bg-amber-100 transition-colors duration-150`}
                          >
                            <TableCell className="font-medium text-gray-900">
                              {formatDate(derivedRow.date)}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                {derivedRow.derivedType}
                              </span>
                            </TableCell>
                            <TableCell className="font-bold text-red-600">
                              {formatAmount(amount)}
                            </TableCell>
                            <TableCell className="text-gray-700 font-medium">
                              {derivedRow.derivedType}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      // Handle real transactions
                      const t = item as any;
                      return (
                        <TableRow
                          key={`txn-${t.id}`}
                          className={`${
                            index % 2 === 0 ? 'bg-blue-50' : 'bg-white'
                          } hover:bg-blue-100 transition-colors duration-150`}
                        >
                          <TableCell className="font-medium text-gray-900">
                            {formatDate(t.date)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${getTransactionTypeColor(
                                t.transactionType
                              )}`}
                            >
                              {getTransactionTypeLabel(t.transactionType)}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`font-bold ${
                              t.transactionType.includes('In') ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {formatAmount(t.amount)}
                          </TableCell>
                          <TableCell className="text-gray-700 font-medium max-w-xs break-words">
                            {t.description || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
