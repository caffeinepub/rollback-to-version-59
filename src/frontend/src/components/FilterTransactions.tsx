import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Filter as FilterIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import type { Transaction } from '../backend';
import { useQueryClient } from '@tanstack/react-query';

interface FilteredTransaction extends Transaction {
  dateDisplay: string;
}

interface FilterStats {
  cashIn: bigint;
  cashOut: bigint;
  upiIn: bigint;
  upiOut: bigint;
  totalInflow: bigint;
  totalOutflow: bigint;
  totalTransaction: bigint;
  tenPercentDeduction: bigint;
  userAmountDeduction: bigint;
  netAmount: bigint;
}

// Local storage keys
const LOCAL_TRANSACTIONS_KEY = 'apj_transactions';
const LOCAL_USER_DEDUCTIONS_KEY = 'apj_user_deductions';

function getLocalTransactions(): Transaction[] {
  try {
    const stored = localStorage.getItem(LOCAL_TRANSACTIONS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    // Ensure bigint fields are properly converted
    return parsed.map((t: any) => ({
      ...t,
      id: typeof t.id === 'string' ? BigInt(t.id) : BigInt(t.id),
      amount: typeof t.amount === 'string' ? BigInt(t.amount) : BigInt(t.amount),
      date: typeof t.date === 'string' ? BigInt(t.date) : BigInt(t.date),
    }));
  } catch (error) {
    console.error('Failed to load local transactions:', error);
    return [];
  }
}

function getLocalUserDeductions(): Record<string, bigint> {
  try {
    const stored = localStorage.getItem(LOCAL_USER_DEDUCTIONS_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    // Convert string values back to bigint
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
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
  const [filteredData, setFilteredData] = useState<FilteredTransaction[]>([]);
  const [filterStats, setFilterStats] = useState<FilterStats | null>(null);
  const [hasFiltered, setHasFiltered] = useState(false);

  // Listen for transaction updates from React Query cache
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // Check if transactions query was updated
      if (event?.query?.queryKey?.[0] === 'transactions') {
        // If we have already filtered and dates are set, re-apply the filter
        if (hasFiltered && startDate && endDate) {
          applyFilter(startDate, endDate);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [hasFiltered, startDate, endDate, queryClient]);

  const formatAmount = (amount: bigint | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'cashIn':
        return 'Cash In';
      case 'cashOut':
        return 'Cash Out';
      case 'upiIn':
        return 'UPI In';
      case 'upiOut':
        return 'UPI Out';
      default:
        return type;
    }
  };

  const getTransactionTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'cashIn':
        return 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg';
      case 'cashOut':
        return 'bg-gradient-to-r from-rose-500 to-red-500 text-white hover:from-rose-600 hover:to-red-600 shadow-lg';
      case 'upiIn':
        return 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-lg';
      case 'upiOut':
        return 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg';
      default:
        return 'bg-gray-500 text-white shadow-lg';
    }
  };

  const applyFilter = (start: Date, end: Date) => {
    // Always get fresh data from local storage
    const transactions = getLocalTransactions();
    const userDeductions = getLocalUserDeductions();

    console.log('Filter: Total transactions in storage:', transactions.length);

    // Normalize dates to start and end of day in local timezone
    const startOfDay = new Date(start);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(end);
    endOfDay.setHours(23, 59, 59, 999);

    // Convert to milliseconds for comparison
    const startTimestamp = startOfDay.getTime();
    const endTimestamp = endOfDay.getTime();

    console.log('Filter range:', {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString(),
      startMs: startTimestamp,
      endMs: endTimestamp,
    });

    // Initialize stats
    let totalCashIn = 0n;
    let totalCashOut = 0n;
    let totalUpiIn = 0n;
    let totalUpiOut = 0n;
    const dateDeductions = new Map<string, bigint>();

    // Filter transactions within the date range
    const filtered: FilteredTransaction[] = transactions
      .filter((transaction) => {
        // Convert nanoseconds to milliseconds
        const txnDateMs = Number(transaction.date) / 1_000_000;
        
        // Create a date object and normalize to start of day for comparison
        const txnDate = new Date(txnDateMs);
        const txnDateNormalized = new Date(txnDate);
        txnDateNormalized.setHours(0, 0, 0, 0);
        const txnTimestamp = txnDateNormalized.getTime();
        
        // Check if transaction date falls within the range (inclusive)
        const isInRange = txnTimestamp >= startTimestamp && txnTimestamp <= endTimestamp;
        
        if (isInRange) {
          console.log('Transaction in range:', {
            id: transaction.id.toString(),
            date: txnDate.toISOString(),
            type: transaction.transactionType,
            amount: transaction.amount.toString(),
          });
        }
        
        return isInRange;
      })
      .map((transaction) => {
        // Convert nanoseconds to milliseconds for display
        const txnDateMs = Number(transaction.date) / 1_000_000;
        const txnDate = new Date(txnDateMs);
        
        // Accumulate all transaction types for comprehensive stats
        if (transaction.transactionType === 'cashIn') {
          totalCashIn += transaction.amount;
        } else if (transaction.transactionType === 'cashOut') {
          totalCashOut += transaction.amount;
        } else if (transaction.transactionType === 'upiIn') {
          totalUpiIn += transaction.amount;
        } else if (transaction.transactionType === 'upiOut') {
          totalUpiOut += transaction.amount;
        }

        // Track user deductions by date (normalize to start of day)
        const txnDateNormalized = new Date(txnDate);
        txnDateNormalized.setHours(0, 0, 0, 0);
        const dateKey = BigInt(txnDateNormalized.getTime() * 1_000_000).toString();
        
        if (!dateDeductions.has(dateKey)) {
          const deduction = userDeductions[dateKey] || 0n;
          dateDeductions.set(dateKey, deduction);
        }

        return {
          ...transaction,
          dateDisplay: format(txnDate, 'PPP'),
        };
      })
      .sort((a, b) => {
        // Sort by date descending (most recent first)
        return Number(b.date) - Number(a.date);
      });

    console.log('Filtered transactions:', filtered.length);
    console.log('Stats:', {
      cashIn: totalCashIn.toString(),
      cashOut: totalCashOut.toString(),
      upiIn: totalUpiIn.toString(),
      upiOut: totalUpiOut.toString(),
    });

    // Calculate total inflows and outflows
    const totalInflow = totalCashIn + totalUpiIn;
    const totalOutflow = totalCashOut + totalUpiOut;
    
    // Total transaction is inflows only (for 10% calculation)
    const totalTransaction = totalInflow;

    // Calculate 10% deduction rounded to nearest 10
    let tenPercentDeduction = 0n;
    if (totalTransaction > 0n) {
      const tenPercent = (totalTransaction * 10n) / 100n;
      const remainder = tenPercent % 10n;
      if (remainder >= 5n) {
        tenPercentDeduction = tenPercent + (10n - remainder);
      } else {
        tenPercentDeduction = tenPercent - remainder;
      }
    }

    // Sum all user deductions for the date range
    let totalUserDeductions = 0n;
    for (const deduction of dateDeductions.values()) {
      totalUserDeductions += deduction;
    }

    // Calculate net amount: Total Inflow - Total Outflow - 10% Deduction - User Deductions
    const netAmount = totalInflow - totalOutflow - tenPercentDeduction - totalUserDeductions;

    // Set stats
    setFilterStats({
      cashIn: totalCashIn,
      cashOut: totalCashOut,
      upiIn: totalUpiIn,
      upiOut: totalUpiOut,
      totalInflow,
      totalOutflow,
      totalTransaction,
      tenPercentDeduction,
      userAmountDeduction: totalUserDeductions,
      netAmount,
    });

    setFilteredData(filtered);
    setHasFiltered(true);
  };

  const handleFilter = () => {
    if (!startDate || !endDate) {
      return;
    }

    applyFilter(startDate, endDate);
  };

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setStartDate(date);
      setIsStartCalendarOpen(false);
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setEndDate(date);
      setIsEndCalendarOpen(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border-2 border-gray-200">
      <div className="mb-6">
        <h2 className="text-4xl font-black bg-gradient-to-r from-teal-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
          Filter Transactions
        </h2>
        <p className="text-gray-600 mt-2 text-base font-medium">
          Analyze your transactions by date range with detailed insights
        </p>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6 bg-gradient-to-br from-blue-50 via-teal-50 to-amber-50 border-2 border-blue-300 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-black text-gray-800 flex items-center gap-2">
            <FilterIcon className="h-6 w-6 text-blue-600" />
            Date Range Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Start Date */}
            <div>
              <Label htmlFor="start-date" className="text-base font-bold text-gray-700 mb-2 block">
                Start Date
              </Label>
              <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-bold text-lg h-14 px-4 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 bg-white border-gray-300 shadow-md text-black hover:text-black"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-blue-600" />
                    {startDate ? format(startDate, 'PPP') : <span className="text-gray-500">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={handleStartDateSelect}
                    initialFocus
                    className="modern-calendar"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="end-date" className="text-base font-bold text-gray-700 mb-2 block">
                End Date
              </Label>
              <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-bold text-lg h-14 px-4 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-500 transition-all duration-200 bg-white border-gray-300 shadow-md text-black hover:text-black"
                  >
                    <CalendarIcon className="mr-2 h-5 w-5 text-blue-600" />
                    {endDate ? format(endDate, 'PPP') : <span className="text-gray-500">Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={handleEndDateSelect}
                    initialFocus
                    className="modern-calendar"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            onClick={handleFilter}
            disabled={!startDate || !endDate}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-black shadow-xl transition-all duration-300 hover:shadow-2xl h-14 text-lg rounded-xl"
          >
            <FilterIcon className="mr-2 h-5 w-5" />
            Apply Filter
          </Button>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {hasFiltered && filterStats && (
        <Card className="mb-6 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-300 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
              Summary Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-2xl shadow-xl border-2 border-emerald-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Cash In
                </p>
                <p className="text-2xl font-black text-white">{formatAmount(filterStats.cashIn)}</p>
              </div>
              <div className="bg-gradient-to-br from-rose-500 to-red-600 p-5 rounded-2xl shadow-xl border-2 border-rose-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  Cash Out
                </p>
                <p className="text-2xl font-black text-white">{formatAmount(filterStats.cashOut)}</p>
              </div>
              <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-5 rounded-2xl shadow-xl border-2 border-teal-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  UPI In
                </p>
                <p className="text-2xl font-black text-white">{formatAmount(filterStats.upiIn)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-5 rounded-2xl shadow-xl border-2 border-orange-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1 flex items-center gap-1">
                  <TrendingDown className="h-4 w-4" />
                  UPI Out
                </p>
                <p className="text-2xl font-black text-white">{formatAmount(filterStats.upiOut)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-5 rounded-2xl shadow-xl border-2 border-blue-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1">Total Inflow</p>
                <p className="text-2xl font-black text-white">{formatAmount(filterStats.totalInflow)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500 to-pink-600 p-5 rounded-2xl shadow-xl border-2 border-red-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1">Total Outflow</p>
                <p className="text-2xl font-black text-white">{formatAmount(filterStats.totalOutflow)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-violet-600 p-5 rounded-2xl shadow-xl border-2 border-purple-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1">Deduction 10%</p>
                <p className="text-2xl font-black text-white">{formatAmount(filterStats.tenPercentDeduction)}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-5 rounded-2xl shadow-xl border-2 border-amber-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1">User Deduction</p>
                <p className="text-2xl font-black text-white">{formatAmount(filterStats.userAmountDeduction)}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-5 rounded-2xl shadow-xl border-2 border-cyan-300 transform hover:scale-105 transition-transform duration-200">
                <p className="text-sm font-bold text-white/90 mb-1">Net Amount</p>
                <p className={`text-2xl font-black ${filterStats.netAmount >= 0n ? 'text-white' : 'text-red-200'}`}>
                  {formatAmount(filterStats.netAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {hasFiltered && filteredData.length > 0 && (
        <Card className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-300 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-teal-500 via-blue-500 to-purple-500 text-white rounded-t-xl">
            <CardTitle className="text-2xl font-black flex items-center gap-2">
              <FilterIcon className="h-6 w-6" />
              Filtered Results ({filteredData.length} {filteredData.length === 1 ? 'transaction' : 'transactions'})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-teal-100 via-blue-100 to-purple-100 hover:from-teal-200 hover:via-blue-200 hover:to-purple-200 border-b-2 border-gray-300">
                    <TableHead className="font-black text-gray-900 text-lg py-4">Date</TableHead>
                    <TableHead className="font-black text-gray-900 text-lg py-4">Type</TableHead>
                    <TableHead className="font-black text-gray-900 text-lg py-4 text-right">Amount</TableHead>
                    <TableHead className="font-black text-gray-900 text-lg py-4">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((transaction, index) => (
                    <TableRow 
                      key={transaction.id.toString()} 
                      className={`hover:bg-gradient-to-r hover:from-blue-50 hover:via-teal-50 hover:to-purple-50 transition-all duration-200 border-b border-gray-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <TableCell className="font-bold text-gray-900 text-base py-4">
                        {transaction.dateDisplay}
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className={`${getTransactionTypeBadgeClass(transaction.transactionType)} font-black text-base px-4 py-2`}>
                          {getTransactionTypeLabel(transaction.transactionType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-black text-gray-900 text-lg py-4">
                        {formatAmount(transaction.amount)}
                      </TableCell>
                      <TableCell className="text-gray-700 text-base font-medium py-4">
                        {transaction.description || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {hasFiltered && filteredData.length === 0 && startDate && endDate && (
        <Card className="bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-400 shadow-xl">
          <CardContent className="py-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                <FilterIcon className="h-10 w-10 text-gray-600" />
              </div>
              <p className="text-gray-700 text-2xl font-black">
                No transactions found
              </p>
              <p className="text-gray-600 text-base font-semibold mt-2 max-w-md">
                No transactions were found for the selected date range. Try selecting a different date range or add new transactions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

