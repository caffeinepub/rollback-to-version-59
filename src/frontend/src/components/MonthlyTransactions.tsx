import { useState, useMemo } from 'react';
import { useGetAllTransactions } from '../hooks/useQueries';
import { TransactionType } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Calendar as CalendarIconLucide, FileDown } from 'lucide-react';
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

export default function MonthlyTransactions() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<TransactionType | ''>('');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const { data: transactions, isLoading, error } = useGetAllTransactions();

  // Filter transactions by selected month and type
  const filteredTransactions = useMemo(() => {
    if (!transactions || !selectedType) return [];

    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthNum = selectedMonth.getMonth();

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

  // Calculate totals
  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0n);
  }, [filteredTransactions]);

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

  const getTransactionTypeLabel = (type: TransactionType): string => {
    const labels: Record<TransactionType, string> = {
      [TransactionType.cashIn]: 'Cash In',
      [TransactionType.cashOut]: 'Cash Out',
      [TransactionType.upiIn]: 'UPI In',
      [TransactionType.upiOut]: 'UPI Out',
      [TransactionType.savingsOut]: 'Savings (10%) Out',
      [TransactionType.deductionsOut]: 'Deductions Out',
    };
    return labels[type] || 'Unknown';
  };

  const getTransactionTypeColor = (type: TransactionType): string => {
    const colors: Record<TransactionType, string> = {
      [TransactionType.cashIn]: 'bg-green-100 text-green-800 border-green-300',
      [TransactionType.cashOut]: 'bg-red-100 text-red-800 border-red-300',
      [TransactionType.upiIn]: 'bg-teal-100 text-teal-800 border-teal-300',
      [TransactionType.upiOut]: 'bg-orange-100 text-orange-800 border-orange-300',
      [TransactionType.savingsOut]: 'bg-purple-100 text-purple-800 border-purple-300',
      [TransactionType.deductionsOut]: 'bg-amber-100 text-amber-800 border-amber-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-300';
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
    setSelectedType(value as TransactionType);
    setIsTypeDropdownOpen(false);
  };

  const generatePDF = () => {
    if (!selectedType || filteredTransactions.length === 0) return;

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
    <h2>${format(selectedMonth, 'MMMM yyyy')} - ${getTransactionTypeLabel(selectedType as TransactionType)}</h2>
  </div>

  <div class="summary">
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-label">Total Transactions</div>
        <div class="summary-value">${filteredTransactions.length}</div>
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
      ${filteredTransactions
        .map(
          (t) => `
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
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated on ${format(new Date(), 'PPP')} at ${format(new Date(), 'pp')}</p>
    <p>© 2025 APJ ENTERPRISES. All rights reserved.</p>
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
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          {selectedType && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-bold text-gray-900">Total Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {filteredTransactions.length}
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
          {selectedType && filteredTransactions.length > 0 && (
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
          ) : filteredTransactions.length === 0 ? (
            <Alert className="bg-amber-50 border-amber-200 shadow-md">
              <AlertDescription className="text-amber-900 font-semibold">
                No {getTransactionTypeLabel(selectedType as TransactionType)} transactions found for{' '}
                {format(selectedMonth, 'MMMM yyyy')}.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-xl border-2 border-gray-200 shadow-inner bg-white">
              <div className="overflow-hidden rounded-xl">
                <div className="h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-gray-100 to-gray-200 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="font-bold text-gray-900 text-base whitespace-nowrap">Date & Time</TableHead>
                        <TableHead className="font-bold text-gray-900 text-base whitespace-nowrap">Type</TableHead>
                        <TableHead className="font-bold text-gray-900 text-base whitespace-nowrap">Amount</TableHead>
                        <TableHead className="font-bold text-gray-900 text-base whitespace-nowrap">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction, index) => (
                        <TableRow
                          key={transaction.id.toString()}
                          className={`${
                            index % 2 === 0 ? 'bg-white' : 'bg-gradient-to-r from-blue-50 to-teal-50'
                          } hover:bg-gradient-to-r hover:from-blue-100 hover:to-teal-100 transition-all duration-200`}
                        >
                          <TableCell className="font-semibold text-gray-900 whitespace-nowrap">
                            {formatDate(transaction.date)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border-2 ${getTransactionTypeColor(
                                transaction.transactionType
                              )}`}
                            >
                              {getTransactionTypeLabel(transaction.transactionType)}
                            </span>
                          </TableCell>
                          <TableCell className="font-bold text-gray-900 text-lg whitespace-nowrap">
                            {formatAmount(transaction.amount)}
                          </TableCell>
                          <TableCell className="text-gray-700 font-medium">
                            <div className="max-w-md break-words whitespace-normal">
                              {transaction.description || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
