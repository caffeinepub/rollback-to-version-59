import { useState } from 'react';
import { useGetBalances, useGetCumulativeStats } from '../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Smartphone,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  PiggyBank,
  Coins,
  RefreshCw,
} from 'lucide-react';

interface BalanceCardsProps {
  onNavigateToAddTransaction?: (transactionType?: string) => void;
}

export default function BalanceCards({ onNavigateToAddTransaction }: BalanceCardsProps) {
  const { data: balances, isLoading: balancesLoading, error: balancesError, refetch: refetchBalances } = useGetBalances();
  const { data: cumulativeStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useGetCumulativeStats();
  const [isTotalBalanceActive, setIsTotalBalanceActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isLoading = balancesLoading || statsLoading;
  const error = balancesError || statsError;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchBalances(), refetchStats()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formatAmount = (amount: bigint | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  const handleCardClick = (transactionType?: string) => {
    if (transactionType && onNavigateToAddTransaction) {
      onNavigateToAddTransaction(transactionType);
    }
  };

  // Show loading state while data is loading
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
            Financial Overview
          </h2>
          <Skeleton className="h-8 w-8 rounded-full bg-gray-200" />
        </div>
        <div className="space-y-4">
          <Card className="bg-gray-50 border-gray-200 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32 bg-gray-200" />
              <Skeleton className="h-4 w-4 rounded-full bg-gray-200" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-12 w-48 bg-gray-200" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-gray-50 border-gray-200 shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24 bg-gray-200" />
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
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
            Financial Overview
          </h2>
          <Button
            onClick={handleRefresh}
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full hover:bg-blue-100 transition-all duration-200"
          >
            <RefreshCw className="h-4 w-4 text-blue-600" />
          </Button>
        </div>
        <Alert variant="destructive" className="bg-red-50 border-red-200 shadow-md">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="font-bold text-red-900">Error</AlertTitle>
          <AlertDescription className="text-red-800">
            Failed to load balances. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!balances || !cumulativeStats) return null;

  // Use the excludedTotalBalance directly from balances (already calculated correctly in useQueries)
  const totalRemainingBalance = balances.excludedTotalBalance;

  const cashCards = [
    {
      title: 'Cash In',
      value: balances.cashIn,
      icon: ArrowUpCircle,
      color: 'text-white',
      bgGradient: 'from-emerald-500 to-green-500',
      iconBg: 'bg-emerald-600',
      transactionType: 'cashIn',
    },
    {
      title: 'Cash Out',
      value: balances.cashOut,
      icon: ArrowDownCircle,
      color: 'text-white',
      bgGradient: 'from-rose-500 to-red-500',
      iconBg: 'bg-rose-600',
      transactionType: 'cashOut',
    },
    {
      title: 'Cash Balance',
      value: balances.cashBalance,
      icon: Wallet,
      color: 'text-white',
      bgGradient: 'from-purple-500 to-indigo-500',
      iconBg: 'bg-purple-600',
      transactionType: undefined,
    },
    {
      title: 'Savings (10%)',
      value: balances.savingsBalance,
      icon: PiggyBank,
      color: 'text-white',
      bgGradient: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-600',
      transactionType: 'savingsOut',
    },
  ];

  const upiCards = [
    {
      title: 'UPI In',
      value: balances.upiIn,
      icon: TrendingUp,
      color: 'text-white',
      bgGradient: 'from-teal-500 to-cyan-500',
      iconBg: 'bg-teal-600',
      transactionType: 'upiIn',
    },
    {
      title: 'UPI Out',
      value: balances.upiOut,
      icon: TrendingDown,
      color: 'text-white',
      bgGradient: 'from-orange-500 to-amber-500',
      iconBg: 'bg-orange-600',
      transactionType: 'upiOut',
    },
    {
      title: 'UPI Balance',
      value: balances.upiBalance,
      icon: Smartphone,
      color: 'text-white',
      bgGradient: 'from-blue-500 to-indigo-500',
      iconBg: 'bg-blue-600',
      transactionType: undefined,
    },
    {
      title: 'Cheeti',
      value: balances.deductionsBalance,
      icon: Coins,
      color: 'text-white',
      bgGradient: 'from-amber-500 to-yellow-500',
      iconBg: 'bg-amber-600',
      transactionType: 'deductionsOut',
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-amber-500 bg-clip-text text-transparent">
          Financial Overview
        </h2>
        <Button
          onClick={handleRefresh}
          size="icon"
          variant="ghost"
          disabled={isRefreshing}
          className="h-8 w-8 rounded-full hover:bg-blue-100 transition-all duration-200 hover:scale-110"
        >
          <RefreshCw className={`h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="space-y-4">
        {/* Total Remaining Balance - Full Width with Interactive Effect - Positioned at Top */}
        <Card 
          className="border-2 border-amber-400 bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-xl cursor-pointer"
          onMouseEnter={() => setIsTotalBalanceActive(true)}
          onMouseLeave={() => setIsTotalBalanceActive(false)}
          onTouchStart={() => setIsTotalBalanceActive(true)}
          onTouchEnd={() => setIsTotalBalanceActive(false)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg sm:text-xl font-bold text-white">Total Remaining Balance</CardTitle>
            <div className={`rounded-full p-3 sm:p-3.5 bg-amber-600 transition-all duration-300 ${isTotalBalanceActive ? 'scale-110 shadow-lg' : ''} shadow-md`}>
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-6xl sm:text-7xl font-bold text-white transition-all duration-300 ${isTotalBalanceActive ? 'scale-105' : ''}`}>
              {formatAmount(totalRemainingBalance)}
            </div>
            <p className="mt-3 text-sm sm:text-base text-white font-semibold">
              Cash Balance (after deductions) plus UPI Balance
            </p>
          </CardContent>
        </Card>

        {/* 2-column, 4-row grid layout with uniform card heights */}
        <div className="grid grid-cols-2 gap-4 auto-rows-fr">
          {/* Left Column - Cash Cards */}
          {cashCards.map((card) => {
            const Icon = card.icon;
            const isClickable = card.transactionType !== undefined;
            return (
              <Card 
                key={card.title} 
                className={`transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br ${card.bgGradient} border-0 shadow-lg flex flex-col ${isClickable ? 'cursor-pointer active:scale-95' : ''}`}
                onClick={() => isClickable && handleCardClick(card.transactionType)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleCardClick(card.transactionType);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-bold text-white">{card.title}</CardTitle>
                  <div className={`rounded-full p-2.5 ${card.iconBg} transition-all duration-300 hover:scale-110 shadow-md flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex items-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {formatAmount(card.value)}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Right Column - UPI Cards */}
          {upiCards.map((card) => {
            const Icon = card.icon;
            const isClickable = card.transactionType !== undefined;
            return (
              <Card 
                key={card.title} 
                className={`transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br ${card.bgGradient} border-0 shadow-lg flex flex-col ${isClickable ? 'cursor-pointer active:scale-95' : ''}`}
                onClick={() => isClickable && handleCardClick(card.transactionType)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleCardClick(card.transactionType);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-bold text-white">{card.title}</CardTitle>
                  <div className={`rounded-full p-2.5 ${card.iconBg} transition-all duration-300 hover:scale-110 shadow-md flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="flex-grow flex items-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    {formatAmount(card.value)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
