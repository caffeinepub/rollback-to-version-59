import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Archive } from 'lucide-react';
import { format } from 'date-fns';
import BalanceCards from '../components/BalanceCards';
import TransactionForm from '../components/TransactionForm';
import TransactionHistory from '../components/TransactionHistory';
import FilterTransactions from '../components/FilterTransactions';
import DaywiseTransactions from '../components/DaywiseTransactions';
import MonthlyTransactions from '../components/MonthlyTransactions';
import OpeningBalancesForm from '../components/OpeningBalancesForm';
import { TransactionType } from '../backend';
import { storeSessionParameter, getSessionParameter, clearSessionParameter } from '../utils/urlParams';

export default function Dashboard() {
  const [preselectedType, setPreselectedType] = useState<string | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Archive month state for Overview tab
  const currentDate = new Date();
  const [archiveMonth, setArchiveMonth] = useState<Date>(currentDate);
  const [isArchiveCalendarOpen, setIsArchiveCalendarOpen] = useState(false);
  const [isArchiveMode, setIsArchiveMode] = useState(false);

  const handleTileClick = (type: TransactionType) => {
    // Convert TransactionType enum to string for TransactionForm
    setPreselectedType(type as string);
    setFormKey((prev) => prev + 1);
    setActiveTab('add-transaction');
    
    // Store archive month if in archive mode
    if (isArchiveMode) {
      const year = archiveMonth.getFullYear();
      const month = archiveMonth.getMonth() + 1;
      storeSessionParameter('overviewArchiveYear', year.toString());
      storeSessionParameter('overviewArchiveMonth', month.toString());
    } else {
      clearSessionParameter('overviewArchiveYear');
      clearSessionParameter('overviewArchiveMonth');
    }
  };

  const handleResetArchive = () => {
    setArchiveMonth(currentDate);
    setIsArchiveMode(false);
    clearSessionParameter('overviewArchiveYear');
    clearSessionParameter('overviewArchiveMonth');
  };

  const handleArchiveMonthSelect = (date: Date | undefined) => {
    if (date) {
      setArchiveMonth(date);
      setIsArchiveMode(true);
      setIsArchiveCalendarOpen(false);
    }
  };

  const isCurrentMonth = 
    archiveMonth.getFullYear() === currentDate.getFullYear() &&
    archiveMonth.getMonth() === currentDate.getMonth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-amber-50">
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-2 border-2 border-gray-200">
            <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0 h-auto">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-4 font-bold text-gray-700 hover:bg-gray-100 transition-all"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="add-transaction"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-4 font-bold text-gray-700 hover:bg-gray-100 transition-all"
              >
                Add Transaction
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-4 font-bold text-gray-700 hover:bg-gray-100 transition-all"
              >
                History
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0 h-auto">
                <TabsTrigger
                  value="filter"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-4 font-bold text-gray-700 hover:bg-gray-100 transition-all"
                >
                  Filter
                </TabsTrigger>
                <TabsTrigger
                  value="daywise"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-4 font-bold text-gray-700 hover:bg-gray-100 transition-all"
                >
                  Daywise
                </TabsTrigger>
                <TabsTrigger
                  value="monthly"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl py-3 px-4 font-bold text-gray-700 hover:bg-gray-100 transition-all"
                >
                  Monthly
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-white border-2 border-gray-200 shadow-xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-blue-600" />
                    <Label className="text-gray-900 font-bold text-lg">
                      Archive
                    </Label>
                  </div>
                  {isArchiveMode && !isCurrentMonth && (
                    <Button
                      onClick={handleResetArchive}
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-gray-100 text-gray-900 font-bold border-2 border-gray-300"
                    >
                      Reset to Current Month
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Popover open={isArchiveCalendarOpen} onOpenChange={setIsArchiveCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full md:w-auto justify-start text-left font-semibold border-2 border-gray-300 bg-white hover:bg-gray-50 text-black rounded-lg shadow-sm"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                        {isArchiveMode && !isCurrentMonth
                          ? `Archive: ${format(archiveMonth, 'MMMM yyyy')}`
                          : `Current Month: ${format(currentDate, 'MMMM yyyy')}`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border-2 border-gray-300 shadow-xl" align="start">
                      <Calendar
                        mode="single"
                        selected={archiveMonth}
                        onSelect={handleArchiveMonthSelect}
                        initialFocus
                        className="modern-calendar"
                      />
                    </PopoverContent>
                  </Popover>
                  {isArchiveMode && !isCurrentMonth && (
                    <div className="text-sm font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-300">
                      Viewing archived month
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <BalanceCards onTileClick={handleTileClick} />
          </TabsContent>

          <TabsContent value="add-transaction">
            <TransactionForm key={formKey} preselectedType={preselectedType} />
          </TabsContent>

          <TabsContent value="history">
            <TransactionHistory />
          </TabsContent>

          <TabsContent value="filter">
            <FilterTransactions />
          </TabsContent>

          <TabsContent value="daywise">
            <DaywiseTransactions />
          </TabsContent>

          <TabsContent value="monthly">
            <MonthlyTransactions />
          </TabsContent>
        </Tabs>

        <div className="mt-8">
          <OpeningBalancesForm />
        </div>
      </main>
    </div>
  );
}
