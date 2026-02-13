import { useGetBalances } from '../hooks/useQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TransactionType } from '../backend';
import { storeSessionParameter } from '../utils/urlParams';

interface BalanceCardsProps {
  onTileClick: (type: TransactionType) => void;
}

export default function BalanceCards({ onTileClick }: BalanceCardsProps) {
  const { data: balances, isLoading, error } = useGetBalances();

  const formatAmount = (amount: bigint) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-50 border-red-200">
        <AlertDescription className="text-red-800">
          Failed to load balances. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!balances) {
    return null;
  }

  const handleTileClick = (type: TransactionType) => {
    onTileClick(type);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-teal-500 to-blue-500 border-2 border-gray-200 shadow-2xl">
        <CardContent className="pt-6">
          <h2 className="text-xl font-black text-white mb-2">Total Remaining Balance</h2>
          <p className="text-5xl font-black text-white">{formatAmount(balances.totalBalance)}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => handleTileClick(TransactionType.cashIn)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTileClick(TransactionType.cashIn);
            }
          }}
          className="focus:outline-none focus:ring-4 focus:ring-green-400 rounded-2xl transition-all active:scale-95"
          aria-label="View Cash In transactions"
        >
          <Card className="bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer h-32">
            <CardContent className="pt-6">
              <h3 className="text-sm font-bold text-white mb-2">Cash In</h3>
              <p className="text-2xl font-black text-white">{formatAmount(balances.cashIn)}</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => handleTileClick(TransactionType.cashOut)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTileClick(TransactionType.cashOut);
            }
          }}
          className="focus:outline-none focus:ring-4 focus:ring-red-400 rounded-2xl transition-all active:scale-95"
          aria-label="View Cash Out transactions"
        >
          <Card className="bg-gradient-to-br from-red-400 to-rose-500 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer h-32">
            <CardContent className="pt-6">
              <h3 className="text-sm font-bold text-white mb-2">Cash Out</h3>
              <p className="text-2xl font-black text-white">{formatAmount(balances.cashOut)}</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => handleTileClick(TransactionType.upiIn)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTileClick(TransactionType.upiIn);
            }
          }}
          className="focus:outline-none focus:ring-4 focus:ring-teal-400 rounded-2xl transition-all active:scale-95"
          aria-label="View UPI In transactions"
        >
          <Card className="bg-gradient-to-br from-teal-400 to-cyan-500 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer h-32">
            <CardContent className="pt-6">
              <h3 className="text-sm font-bold text-white mb-2">UPI In</h3>
              <p className="text-2xl font-black text-white">{formatAmount(balances.upiIn)}</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => handleTileClick(TransactionType.upiOut)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTileClick(TransactionType.upiOut);
            }
          }}
          className="focus:outline-none focus:ring-4 focus:ring-orange-400 rounded-2xl transition-all active:scale-95"
          aria-label="View UPI Out transactions"
        >
          <Card className="bg-gradient-to-br from-orange-400 to-amber-500 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer h-32">
            <CardContent className="pt-6">
              <h3 className="text-sm font-bold text-white mb-2">UPI Out</h3>
              <p className="text-2xl font-black text-white">{formatAmount(balances.upiOut)}</p>
            </CardContent>
          </Card>
        </button>

        <Card className="bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-gray-200 shadow-xl h-32">
          <CardContent className="pt-6">
            <h3 className="text-sm font-bold text-white mb-2">Cash Balance</h3>
            <p className="text-2xl font-black text-white">{formatAmount(balances.cashBalance)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-400 to-violet-500 border-2 border-gray-200 shadow-xl h-32">
          <CardContent className="pt-6">
            <h3 className="text-sm font-bold text-white mb-2">UPI Balance</h3>
            <p className="text-2xl font-black text-white">{formatAmount(balances.upiBalance)}</p>
          </CardContent>
        </Card>

        <button
          onClick={() => handleTileClick(TransactionType.savingsOut)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTileClick(TransactionType.savingsOut);
            }
          }}
          className="focus:outline-none focus:ring-4 focus:ring-yellow-400 rounded-2xl transition-all active:scale-95"
          aria-label="View Savings (10%) transactions"
        >
          <Card className="bg-gradient-to-br from-yellow-400 to-amber-500 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer h-32">
            <CardContent className="pt-6">
              <h3 className="text-sm font-bold text-white mb-2">Savings (10%)</h3>
              <p className="text-2xl font-black text-white">{formatAmount(balances.savingsBalance)}</p>
            </CardContent>
          </Card>
        </button>

        <button
          onClick={() => handleTileClick(TransactionType.deductionsOut)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTileClick(TransactionType.deductionsOut);
            }
          }}
          className="focus:outline-none focus:ring-4 focus:ring-pink-400 rounded-2xl transition-all active:scale-95"
          aria-label="View Cheeti transactions"
        >
          <Card className="bg-gradient-to-br from-pink-400 to-rose-500 border-2 border-gray-200 shadow-xl hover:shadow-2xl transition-all cursor-pointer h-32">
            <CardContent className="pt-6">
              <h3 className="text-sm font-bold text-white mb-2">Cheeti</h3>
              <p className="text-2xl font-black text-white">{formatAmount(balances.deductionsBalance)}</p>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>
  );
}
