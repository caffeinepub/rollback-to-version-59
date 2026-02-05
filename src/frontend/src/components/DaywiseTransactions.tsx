import { useState, useEffect } from 'react';
import { useGetAllTransactions, useSetUserSpecifiedDeduction } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  Wallet,
  FileDown,
  Percent,
  IndianRupee,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '../backend';

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

export default function DaywiseTransactions() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dailyDeduction, setDailyDeduction] = useState<string>('350');

  const { data: allTransactions, isLoading, error } = useGetAllTransactions();
  const setUserDeductionMutation = useSetUserSpecifiedDeduction();

  // Load daily deduction for selected date
  useEffect(() => {
    const dateKey = getDateKey(selectedDate);
    const userDeductions = getLocalUserDeductions();
    const savedDeduction = userDeductions[dateKey];
    if (savedDeduction !== undefined) {
      setDailyDeduction(savedDeduction.toString());
    } else {
      setDailyDeduction('350');
    }
  }, [selectedDate]);

  const formatAmount = (amount: bigint | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return format(date, 'hh:mm a');
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const getDateKey = (date: Date) => {
    const dateMs = date.setHours(0, 0, 0, 0);
    return BigInt(dateMs * 1_000_000).toString();
  };

  const handleDailyDeductionChange = (value: string) => {
    // Allow negative numbers and empty string
    if (value === '' || value === '-' || /^-?\d+$/.test(value)) {
      setDailyDeduction(value);
    }
  };

  const handleDailyDeductionSave = () => {
    const amount = dailyDeduction === '' || dailyDeduction === '-' ? 0n : BigInt(dailyDeduction);
    const dateMs = selectedDate.setHours(0, 0, 0, 0);
    const dateNs = BigInt(dateMs * 1_000_000);
    
    setUserDeductionMutation.mutate({ date: dateNs, amount });
  };

  // Filter transactions for selected date
  const getTransactionsForDate = () => {
    if (!allTransactions) return [];

    const selectedDateMs = selectedDate.setHours(0, 0, 0, 0);
    const startOfDay = selectedDateMs;
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    return allTransactions.filter((t) => {
      const txnDateMs = Number(t.date) / 1_000_000;
      return txnDateMs >= startOfDay && txnDateMs < endOfDay;
    });
  };

  // Calculate statistics for selected date
  const calculateStats = () => {
    const transactions = getTransactionsForDate();

    let cashIn = 0n;
    let cashOut = 0n;
    let upiIn = 0n;
    let upiOut = 0n;

    transactions.forEach((t) => {
      switch (t.transactionType) {
        case 'cashIn':
          cashIn += t.amount;
          break;
        case 'cashOut':
          cashOut += t.amount;
          break;
        case 'upiIn':
          upiIn += t.amount;
          break;
        case 'upiOut':
          upiOut += t.amount;
          break;
      }
    });

    // Combined Total = Cash In + UPI In (inflows only)
    const combinedTotal = cashIn + upiIn;

    // Calculate 10% deduction rounded to nearest 10 (based on Cash In + UPI In)
    let tenPercentDeduction = 0n;
    if (combinedTotal > 0n) {
      const tenPercent = (combinedTotal * 10n) / 100n;
      const remainder = tenPercent % 10n;
      if (remainder >= 5n) {
        tenPercentDeduction = tenPercent + (10n - remainder);
      } else {
        tenPercentDeduction = tenPercent - remainder;
      }
    }

    // Get daily deduction amount
    const dailyDeductionAmount = dailyDeduction === '' || dailyDeduction === '-' ? 0n : BigInt(dailyDeduction);

    // Calculate total balance for day
    const totalBalanceForDay = BigInt(combinedTotal) - tenPercentDeduction - dailyDeductionAmount - BigInt(cashOut + upiOut);

    return {
      cashIn,
      cashOut,
      upiIn,
      upiOut,
      combinedTotal,
      tenPercentDeduction,
      dailyDeductionAmount,
      totalBalanceForDay,
      transactions,
    };
  };

  const generatePDF = () => {
    const stats = calculateStats();
    const transactions = stats.transactions;

    // Create PDF content as HTML
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Day-wise Transaction Report - ${format(selectedDate, 'PPP')}</title>
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
    .summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-table th {
      background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: bold;
    }
    .summary-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .summary-table tr:last-child td {
      border-bottom: 2px solid #0ea5e9;
      font-weight: bold;
    }
    .transactions-section {
      margin-top: 40px;
    }
    .transactions-section h3 {
      color: #0ea5e9;
      border-bottom: 2px solid #0ea5e9;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .transaction-table {
      width: 100%;
      border-collapse: collapse;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .transaction-table th {
      background: linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%);
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      font-size: 14px;
    }
    .transaction-table td {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
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
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #64748b;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>APJ ENTERPRISES</h1>
    <h2>Day-wise Transaction Report</h2>
    <h2>${format(selectedDate, 'EEEE, MMMM d, yyyy')}</h2>
  </div>

  <table class="summary-table">
    <thead>
      <tr>
        <th>Category</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Cash In</td>
        <td class="${Number(stats.cashIn) >= 0 ? 'amount-positive' : 'amount-negative'}">${formatAmount(stats.cashIn)}</td>
      </tr>
      <tr>
        <td>Cash Out</td>
        <td class="${Number(stats.cashOut) >= 0 ? 'amount-positive' : 'amount-negative'}">${formatAmount(stats.cashOut)}</td>
      </tr>
      <tr>
        <td>UPI In</td>
        <td class="${Number(stats.upiIn) >= 0 ? 'amount-positive' : 'amount-negative'}">${formatAmount(stats.upiIn)}</td>
      </tr>
      <tr>
        <td>UPI Out</td>
        <td class="${Number(stats.upiOut) >= 0 ? 'amount-positive' : 'amount-negative'}">${formatAmount(stats.upiOut)}</td>
      </tr>
      <tr>
        <td>Combined Total (Cash In + UPI In)</td>
        <td class="${Number(stats.combinedTotal) >= 0 ? 'amount-positive' : 'amount-negative'}">${formatAmount(stats.combinedTotal)}</td>
      </tr>
      <tr>
        <td>10% Deduction (from Cash In + UPI In)</td>
        <td class="${Number(stats.tenPercentDeduction) >= 0 ? 'amount-positive' : 'amount-negative'}">${formatAmount(stats.tenPercentDeduction)}</td>
      </tr>
      <tr>
        <td>Daily Deduction</td>
        <td class="${Number(stats.dailyDeductionAmount) >= 0 ? 'amount-positive' : 'amount-negative'}">${formatAmount(stats.dailyDeductionAmount)}</td>
      </tr>
      <tr>
        <td><strong>Total Balance for Day</strong></td>
        <td class="${Number(stats.totalBalanceForDay) >= 0 ? 'amount-positive' : 'amount-negative'}">
          ${formatAmount(stats.totalBalanceForDay)}
        </td>
      </tr>
    </tbody>
  </table>

  <div class="transactions-section">
    <h3>Transaction Details</h3>
    ${
      transactions.length === 0
        ? '<div class="empty-state">No transactions recorded for this date.</div>'
        : `
    <table class="transaction-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${transactions
          .map(
            (t) => `
        <tr>
          <td>${formatTime(t.date)}</td>
          <td>
            <span class="badge badge-${t.transactionType.toLowerCase().replace(' ', '-')}">
              ${t.transactionType === 'cashIn' ? 'Cash In' : t.transactionType === 'cashOut' ? 'Cash Out' : t.transactionType === 'upiIn' ? 'UPI In' : 'UPI Out'}
            </span>
          </td>
          <td class="${Number(t.amount) >= 0 ? 'amount-positive' : 'amount-negative'}">
            ${formatAmount(t.amount)}
          </td>
          <td>${t.description || '-'}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `
    }
  </div>

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
    link.download = `APJ_DayWise_Report_${format(selectedDate, 'yyyy-MM-dd')}.html`;
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

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
        <h2 className="mb-6 text-3xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
          Day-wise Transactions
        </h2>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full bg-gray-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-gray-50 border-gray-200 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-32 bg-gray-200" />
                  <Skeleton className="h-4 w-4 rounded-full bg-gray-200" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32 bg-gray-200" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
        <h2 className="mb-6 text-3xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
          Day-wise Transactions
        </h2>
        <Alert variant="destructive" className="bg-red-50 border-red-200 shadow-md">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="font-bold text-red-900">Error</AlertTitle>
          <AlertDescription className="text-red-800">
            Failed to load transaction data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = calculateStats();
  const transactions = stats.transactions;

  const categoryCards = [
    {
      title: 'Cash In',
      value: stats.cashIn,
      icon: ArrowUpCircle,
      color: 'text-white',
      bgGradient: 'from-emerald-500 to-green-500',
      iconBg: 'bg-emerald-600',
    },
    {
      title: 'Cash Out',
      value: stats.cashOut,
      icon: ArrowDownCircle,
      color: 'text-white',
      bgGradient: 'from-rose-500 to-red-500',
      iconBg: 'bg-rose-600',
    },
    {
      title: 'UPI In',
      value: stats.upiIn,
      icon: ArrowUpCircle,
      color: 'text-white',
      bgGradient: 'from-blue-500 to-indigo-500',
      iconBg: 'bg-blue-600',
    },
    {
      title: 'UPI Out',
      value: stats.upiOut,
      icon: ArrowDownCircle,
      color: 'text-white',
      bgGradient: 'from-orange-500 to-amber-500',
      iconBg: 'bg-orange-600',
    },
    {
      title: 'Combined Total',
      value: stats.combinedTotal,
      icon: TrendingUp,
      color: 'text-white',
      bgGradient: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-600',
      description: 'Cash In + UPI In',
    },
    {
      title: '10% Deduction',
      value: stats.tenPercentDeduction,
      icon: Percent,
      color: 'text-white',
      bgGradient: 'from-amber-500 to-yellow-500',
      iconBg: 'bg-amber-600',
      description: '10% of (Cash In + UPI In)',
    },
    {
      title: 'Daily Deduction',
      value: stats.dailyDeductionAmount,
      icon: IndianRupee,
      color: 'text-white',
      bgGradient: 'from-fuchsia-500 to-pink-500',
      iconBg: 'bg-fuchsia-600',
      description: 'User-specified amount',
    },
    {
      title: 'Total Balance for Day',
      value: stats.totalBalanceForDay,
      icon: Wallet,
      color: 'text-white',
      bgGradient: 'from-cyan-500 to-teal-500',
      iconBg: 'bg-cyan-600',
      description: 'Net balance for selected date',
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
          Day-wise Transactions
        </h2>
      </div>

      {/* Date Selector */}
      <div className="mb-6">
        <Label htmlFor="date-selector" className="text-base font-semibold text-gray-700 mb-2 block">
          Select Date
        </Label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-semibold text-lg h-14 px-5 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-400 bg-white border-gray-300 shadow-sm text-black hover:text-black hover:font-bold"
            >
              <CalendarIcon className="mr-3 h-5 w-5 text-blue-600" />
              <span className="text-lg font-bold text-black">{format(selectedDate, 'PPP')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="modern-calendar"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Daily Deduction Input */}
      <div className="mb-6">
        <Label htmlFor="daily-deduction" className="text-base font-semibold text-gray-700 mb-2 block">
          Daily Deduction Amount (₹)
        </Label>
        <div className="flex gap-3">
          <Input
            id="daily-deduction"
            type="text"
            value={dailyDeduction}
            onChange={(e) => handleDailyDeductionChange(e.target.value)}
            placeholder="350 (positive or negative)"
            className="flex-1 h-14 px-5 text-lg font-semibold rounded-xl border-2 border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 bg-white text-black"
          />
          <Button
            onClick={handleDailyDeductionSave}
            disabled={setUserDeductionMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-black font-bold shadow-lg transition-all duration-300 hover:shadow-xl h-14 px-8 text-base rounded-xl"
          >
            {setUserDeductionMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Set the daily deduction amount for {format(selectedDate, 'PPP')}. This amount will be deducted from the total balance.
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {categoryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              className={`transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br ${card.bgGradient} border-0 shadow-lg`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-white">{card.title}</CardTitle>
                <div className={`rounded-full p-2.5 ${card.iconBg} transition-all duration-300 hover:scale-110 shadow-md`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-white">
                  {formatAmount(card.value)}
                </div>
                {card.description && (
                  <p className="mt-2 text-xs text-white/90 font-medium">
                    {card.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Generate PDF Button */}
      <div className="mb-6">
        <Button
          onClick={generatePDF}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-black font-bold shadow-lg transition-all duration-300 hover:shadow-xl h-12 text-base rounded-xl"
        >
          <FileDown className="mr-2 h-5 w-5" />
          Generate PDF Report
        </Button>
      </div>

      {/* Transaction List */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-800">
            Transaction Details ({transactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm">No transactions recorded for the selected date.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id.toString()}
                  className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          transaction.transactionType === 'cashIn'
                            ? 'bg-emerald-100 text-emerald-700'
                            : transaction.transactionType === 'cashOut'
                            ? 'bg-rose-100 text-rose-700'
                            : transaction.transactionType === 'upiIn'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}
                      >
                        {transaction.transactionType === 'cashIn'
                          ? 'Cash In'
                          : transaction.transactionType === 'cashOut'
                          ? 'Cash Out'
                          : transaction.transactionType === 'upiIn'
                          ? 'UPI In'
                          : 'UPI Out'}
                      </span>
                      <span className="text-sm text-gray-600 font-medium">
                        {formatTime(transaction.date)}
                      </span>
                    </div>
                    <span
                      className={`text-lg font-bold ${
                        Number(transaction.amount) >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatAmount(transaction.amount)}
                    </span>
                  </div>
                  {transaction.description && (
                    <p className="text-sm text-gray-700 mt-2 pl-1">
                      {transaction.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
