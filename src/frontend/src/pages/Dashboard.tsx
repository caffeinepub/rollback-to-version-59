import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BalanceCards from '../components/BalanceCards';
import TransactionForm from '../components/TransactionForm';
import TransactionHistory from '../components/TransactionHistory';
import FilterTransactions from '../components/FilterTransactions';
import DaywiseTransactions from '../components/DaywiseTransactions';
import MonthlyTransactions from '../components/MonthlyTransactions';
import OpeningBalancesForm from '../components/OpeningBalancesForm';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [preselectedTransactionType, setPreselectedTransactionType] = useState<string | undefined>(undefined);

  const handleNavigateToAddTransaction = (transactionType?: string) => {
    // Set preselected type immediately for instant synchronization
    setPreselectedTransactionType(transactionType);
    // Switch to add transaction tab instantly
    setActiveTab('add');
  };

  // Clear preselected type when switching away from add tab
  useEffect(() => {
    if (activeTab !== 'add') {
      setPreselectedTransactionType(undefined);
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-teal-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Enhanced two-row layout with improved spacing, visibility, and non-overlapping tabs */}
          <div className="mb-8 bg-white shadow-xl rounded-2xl p-6 border-2 border-gray-200">
            {/* First Row - Overview, Add Transaction, History */}
            <TabsList className="grid w-full grid-cols-3 mb-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 shadow-inner gap-3">
              <TabsTrigger
                value="overview"
                className="rounded-xl font-black text-base sm:text-lg md:text-xl text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg py-4 px-3 hover:bg-gray-100"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="add"
                className="rounded-xl font-black text-base sm:text-lg md:text-xl text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg py-4 px-3 hover:bg-gray-100"
              >
                Add Transaction
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-xl font-black text-base sm:text-lg md:text-xl text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg py-4 px-3 hover:bg-gray-100"
              >
                History
              </TabsTrigger>
            </TabsList>

            {/* Second Row - Filter, Day-wise Transactions, Monthly Transactions */}
            <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-3 shadow-inner gap-3">
              <TabsTrigger
                value="filter"
                className="rounded-xl font-black text-base sm:text-lg md:text-xl text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg py-4 px-3 hover:bg-gray-100"
              >
                Filter
              </TabsTrigger>
              <TabsTrigger
                value="daywise"
                className="rounded-xl font-black text-base sm:text-lg md:text-xl text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg py-4 px-3 hover:bg-gray-100"
              >
                Day-wise
              </TabsTrigger>
              <TabsTrigger
                value="monthly"
                className="rounded-xl font-black text-base sm:text-lg md:text-xl text-gray-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white transition-all duration-300 data-[state=active]:shadow-lg py-4 px-3 hover:bg-gray-100"
              >
                Monthly
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0">
            <BalanceCards onNavigateToAddTransaction={handleNavigateToAddTransaction} />
          </TabsContent>

          <TabsContent value="add" className="mt-0">
            <TransactionForm 
              preselectedType={preselectedTransactionType}
              key={preselectedTransactionType || 'default'}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <TransactionHistory />
          </TabsContent>

          <TabsContent value="filter" className="mt-0">
            <FilterTransactions />
          </TabsContent>

          <TabsContent value="daywise" className="mt-0">
            <DaywiseTransactions />
          </TabsContent>

          <TabsContent value="monthly" className="mt-0">
            <MonthlyTransactions />
          </TabsContent>
        </Tabs>

        {/* Bottom Section - Opening Balances only */}
        <div className="mt-8">
          <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6 max-w-3xl mx-auto">
            <OpeningBalancesForm />
          </div>
        </div>
      </div>
    </div>
  );
}
