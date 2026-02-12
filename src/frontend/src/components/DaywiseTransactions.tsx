import { useState, useEffect } from 'react';
import { useGetAllTransactions } from '../hooks/useQueries';
import { Transaction, TransactionType } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, FileDown, Calendar as CalendarIconLucide } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeDateToStartOfDay, getDerivedRowsForDate, isDerivedRow, isRealTransaction } from '../utils/derivedTransactions';
import type { DisplayTransaction } from '../utils/derivedTransactions';
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

function saveLocalUserDeductions(deductions: Record<string, bigint>) {
  try {
    const serializable: Record<string, string> = {};
    for (const [key, value] of Object.entries(deductions)) {
      serializable[key] = value.toString();
    }
    localStorage.setItem(LOCAL_USER_DEDUCTIONS_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Failed to save local user deductions:', error);
    throw error;
  }
}

export default function DaywiseTransactions() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [deductionInput, setDeductionInput] = useState('');
  const [userDeduction, setUserDeduction] = useState<bigint>(0n);

  const dateNs = normalizeDateToStartOfDay(selectedDate);
  const { data: transactions, isLoading, error } = useGetAllTransactions();

  // Load user deduction for the selected date
  useEffect(() => {
    const deductions = getLocalUserDeductions();
    const dateKey = dateNs.toString();
    const deduction = deductions[dateKey] || 0n;
    setUserDeduction(deduction);
    setDeductionInput(deduction.toString());
  }, [dateNs]);

  const handleDeductionChange = (value: string) => {
    setDeductionInput(value);
  };

  const handleDeductionBlur = () => {
    const amount = BigInt(deductionInput || '0');
    const deductions = getLocalUserDeductions();
    const dateKey = dateNs.toString();
    deductions[dateKey] = amount;
    saveLocalUserDeductions(deductions);
    setUserDeduction(amount);
  };

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

  const calculateTenPercentDeduction = (total: bigint): bigint => {
    if (total <= 0n) return 0n;
    const tenPercent = (total * 10n) / 100n;
    const remainder = tenPercent % 10n;
    if (remainder >= 5n) {
      return tenPercent + (10n - remainder);
    } else {
      return tenPercent - remainder;
    }
  };

  // Calculate day-wise stats from transactions
  const daywiseData = transactions ? (() => {
    const selectedDateMs = Number(dateNs) / 1_000_000;
    const selectedDate = new Date(selectedDateMs);
    selectedDate.setHours(0, 0, 0, 0);
    const startOfDay = selectedDate.getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const filteredTransactions = transactions.filter((t) => {
      const txnDateMs = Number(t.date) / 1_000_000;
      return txnDateMs >= startOfDay && txnDateMs < endOfDay;
    });

    let cashIn = 0n;
    let cashOut = 0n;
    let upiIn = 0n;
    let upiOut = 0n;

    filteredTransactions.forEach((transaction) => {
      switch (transaction.transactionType) {
        case TransactionType.cashIn:
          cashIn += transaction.amount;
          break;
        case TransactionType.cashOut:
          cashOut += transaction.amount;
          break;
        case TransactionType.upiIn:
          upiIn += transaction.amount;
          break;
        case TransactionType.upiOut:
          upiOut += transaction.amount;
          break;
      }
    });

    const combinedTotal = cashIn + upiIn;
    const totalBalanceForDay = BigInt(combinedTotal) - BigInt(cashOut + upiOut);

    return {
      cashIn,
      cashOut,
      upiIn,
      upiOut,
      combinedTotal,
      totalBalanceForDay,
      transactions: filteredTransactions,
    };
  })() : null;

  const handleGeneratePDF = () => {
    if (!daywiseData) return;

    const dateStr = format(selectedDate, 'PPP');
    const tenPercentDeduction = calculateTenPercentDeduction(daywiseData.combinedTotal);
    const userDeductionAmount = userDeduction || 0n;

    // Merge real transactions with derived rows
    const derivedRows = getDerivedRowsForDate(dateNs);
    const allRows: DisplayTransaction[] = [...daywiseData.transactions, ...derivedRows];
    allRows.sort((a, b) => Number(b.date) - Number(a.date));

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Day-wise Transactions - ${dateStr}</title>
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
          .summary {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .summary-box {
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #E5E7EB;
          }
          .summary-box.incoming {
            background-color: #D1FAE5;
            border-color: #059669;
          }
          .summary-box.outgoing {
            background-color: #FEE2E2;
            border-color: #DC2626;
          }
          .summary-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #6B7280;
          }
          .summary-box .amount {
            font-size: 20px;
            font-weight: bold;
          }
          .summary-box.incoming .amount {
            color: #059669;
          }
          .summary-box.outgoing .amount {
            color: #DC2626;
          }
          .transactions {
            margin-top: 30px;
          }
          .transactions h2 {
            color: #1F2937;
            margin-bottom: 15px;
            font-size: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
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
          <h2>Day-wise Transaction Report</h2>
        </div>
        <div class="summary">
          <div class="summary-box incoming">
            <h3>Cash In</h3>
            <div class="amount">${formatAmount(daywiseData.cashIn)}</div>
          </div>
          <div class="summary-box outgoing">
            <h3>Cash Out</h3>
            <div class="amount">${formatAmount(daywiseData.cashOut)}</div>
          </div>
          <div class="summary-box incoming">
            <h3>UPI In</h3>
            <div class="amount">${formatAmount(daywiseData.upiIn)}</div>
          </div>
          <div class="summary-box outgoing">
            <h3>UPI Out</h3>
            <div class="amount">${formatAmount(daywiseData.upiOut)}</div>
          </div>
          <div class="summary-box incoming">
            <h3>Combined Total (In)</h3>
            <div class="amount">${formatAmount(daywiseData.combinedTotal)}</div>
          </div>
          <div class="summary-box outgoing">
            <h3>10% Deduction</h3>
            <div class="amount">${formatAmount(tenPercentDeduction)}</div>
          </div>
          <div class="summary-box outgoing">
            <h3>User Deduction</h3>
            <div class="amount">${formatAmount(userDeductionAmount)}</div>
          </div>
          <div class="summary-box">
            <h3>Total Balance</h3>
            <div class="amount">${formatAmount(daywiseData.totalBalanceForDay)}</div>
          </div>
        </div>
        <div class="transactions">
          <h2>Transactions for ${dateStr}</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
    `;

    allRows.forEach((row) => {
      if (isDerivedRow(row)) {
        const amountStr = formatAmount(row.amount);
        htmlContent += `
          <tr class="derived-row">
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
        </div>
        <div class="footer">
          <p>This report was generated automatically by APJ ENTERPRISES Transaction Management System</p>
          <p>Generated on: ${format(new Date(), 'PPP p')}</p>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daywise-transactions-${format(selectedDate, 'yyyy-MM-dd')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CalendarIconLucide className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Day-wise Transactions</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            View detailed transactions for a specific day
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
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-2xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CalendarIconLucide className="h-5 w-5 text-white" />
            <CardTitle className="text-white font-bold">Day-wise Transactions</CardTitle>
          </div>
          <CardDescription className="text-white font-semibold">
            View detailed transactions for a specific day
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

  if (!daywiseData) {
    return null;
  }

  const tenPercentDeduction = calculateTenPercentDeduction(daywiseData.combinedTotal);
  const userDeductionAmount = userDeduction || 0n;

  // Merge real transactions with derived rows
  const derivedRows = getDerivedRowsForDate(dateNs);
  const allRows: DisplayTransaction[] = [...daywiseData.transactions, ...derivedRows];
  allRows.sort((a, b) => Number(b.date) - Number(a.date));

  return (
    <Card className="bg-white border border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-t-2xl border-b border-gray-200">
        <div className="flex items-center gap-2">
          <CalendarIconLucide className="h-5 w-5 text-white" />
          <CardTitle className="text-white font-bold">Day-wise Transactions</CardTitle>
        </div>
        <CardDescription className="text-white font-semibold">
          View detailed transactions for a specific day
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 space-y-2 w-full">
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
                  {format(selectedDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-2 border-gray-300 shadow-xl" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button
            onClick={handleGeneratePDF}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-lg shadow-md transition-all duration-200"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Cash In</h3>
            <p className="text-2xl font-black text-green-600">{formatAmount(daywiseData.cashIn)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Cash Out</h3>
            <p className="text-2xl font-black text-red-600">{formatAmount(daywiseData.cashOut)}</p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-300 rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-2">UPI In</h3>
            <p className="text-2xl font-black text-green-600">{formatAmount(daywiseData.upiIn)}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-2">UPI Out</h3>
            <p className="text-2xl font-black text-red-600">{formatAmount(daywiseData.upiOut)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Combined Total (In)</h3>
            <p className="text-2xl font-black text-green-600">{formatAmount(daywiseData.combinedTotal)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4 shadow-md">
            <h3 className="text-sm font-bold text-gray-700 mb-2">10% Deduction</h3>
            <p className="text-2xl font-black text-red-600">{formatAmount(tenPercentDeduction)}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-deduction" className="text-gray-900 font-bold">
            User Specified Deduction
          </Label>
          <Input
            id="user-deduction"
            type="number"
            value={deductionInput}
            onChange={(e) => handleDeductionChange(e.target.value)}
            onBlur={handleDeductionBlur}
            placeholder="Enter deduction amount"
            className="border-2 border-gray-300 bg-white text-black font-semibold rounded-lg shadow-sm"
          />
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-4 shadow-md">
          <div className="flex justify-between items-center text-white">
            <span className="font-bold text-lg">Total Balance for Day:</span>
            <span className="font-black text-2xl">{formatAmount(daywiseData.totalBalanceForDay)}</span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Transactions</h3>
          {allRows.length === 0 ? (
            <div className="text-center py-8 text-gray-700 font-semibold">
              No transactions found for this date
            </div>
          ) : (
            <div className="space-y-3">
              {allRows.map((row, index) => {
                const rowKey = isDerivedRow(row)
                  ? `derived-${row.derivedType}-${row.date.toString()}`
                  : `txn-${(row as Transaction).id.toString()}`;

                if (isDerivedRow(row)) {
                  return (
                    <div
                      key={rowKey}
                      className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl shadow-sm"
                    >
                      <div>
                        <p className="font-bold text-amber-700">{row.derivedType}</p>
                        <p className="text-sm text-gray-700 italic font-medium">Auto-calculated deduction</p>
                      </div>
                      <p className={`text-lg font-bold ${getDerivedRowAmountColor()}`}>
                        {formatAmount(row.amount)}
                      </p>
                    </div>
                  );
                }

                const transaction = row as Transaction;
                const amountColorClass = getAmountColorFromType(transaction.transactionType);

                return (
                  <div
                    key={rowKey}
                    className="flex justify-between items-center p-4 bg-white border-2 border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{getTransactionTypeLabel(transaction.transactionType)}</p>
                      {transaction.description && (
                        <p className="text-sm text-gray-700 font-medium">{transaction.description}</p>
                      )}
                    </div>
                    <p className={`text-lg font-bold ${amountColorClass}`}>
                      {formatAmount(transaction.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
