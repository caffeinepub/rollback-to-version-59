import { useState, useEffect } from 'react';
import { useGetOpeningBalance, useAddOpeningBalance, useUpdateOpeningBalance } from '../hooks/useQueries';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle2, Save, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function OpeningBalancesForm() {
  const [cashBalance, setCashBalance] = useState('');
  const [upiBalance, setUpiBalance] = useState('');
  const [savings, setSavings] = useState('');
  const [userDeductions, setUserDeductions] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: existingBalance, isLoading } = useGetOpeningBalance();
  const { mutate: addOpeningBalance, isPending: isAdding } = useAddOpeningBalance();
  const { mutate: updateOpeningBalance, isPending: isUpdating } = useUpdateOpeningBalance();

  const isPending = isAdding || isUpdating;

  // Load existing opening balance if available
  useEffect(() => {
    if (existingBalance && existingBalance.date > 0n) {
      setCashBalance(existingBalance.cashBalance.toString());
      setUpiBalance(existingBalance.upiBalance.toString());
      setSavings(existingBalance.savings.toString());
      setUserDeductions(existingBalance.userDeductions.toString());
      
      const dateMs = Number(existingBalance.date) / 1_000_000;
      setDate(new Date(dateMs));
      setIsEditing(true);
    }
  }, [existingBalance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cashBalanceValue = parseFloat(cashBalance || '0');
    const upiBalanceValue = parseFloat(upiBalance || '0');
    const savingsValue = parseFloat(savings || '0');
    const userDeductionsValue = parseFloat(userDeductions || '0');

    if (isNaN(cashBalanceValue) || isNaN(upiBalanceValue) || isNaN(savingsValue) || isNaN(userDeductionsValue)) {
      return;
    }

    const dateInNanoseconds = BigInt(date.getTime()) * BigInt(1_000_000);

    const balanceData = {
      cashBalance: BigInt(Math.round(cashBalanceValue)),
      upiBalance: BigInt(Math.round(upiBalanceValue)),
      savings: BigInt(Math.round(savingsValue)),
      userDeductions: BigInt(Math.round(userDeductionsValue)),
      date: dateInNanoseconds,
    };

    const mutationFn = isEditing ? updateOpeningBalance : addOpeningBalance;

    mutationFn(balanceData, {
      onSuccess: () => {
        setShowSuccess(true);
        setIsEditing(true);
        
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      },
    });
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <button
          onClick={toggleExpanded}
          className="flex items-center justify-between w-full text-left group"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-teal-600" />
            <h3 className="text-xl font-bold text-gray-900">Opening Balance</h3>
          </div>
          <Skeleton className="h-6 w-6 bg-gray-200 rounded" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={toggleExpanded}
        className="flex items-center justify-between w-full text-left group hover:opacity-80 transition-opacity duration-200"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-teal-600" />
          <h3 className="text-xl font-bold text-gray-900">Opening Balance</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-6 w-6 text-gray-600 group-hover:text-teal-600 transition-colors duration-200" />
        ) : (
          <ChevronDown className="h-6 w-6 text-gray-600 group-hover:text-teal-600 transition-colors duration-200" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {showSuccess && (
          <Alert className="mb-4 border-2 border-green-200 bg-green-50 shadow-md">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 font-semibold">
              Opening balances {isEditing ? 'updated' : 'saved'} successfully!
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="cashBalance" className="text-gray-900 font-bold text-sm">Cash Balance (₹)</Label>
            <Input
              id="cashBalance"
              type="number"
              step="0.01"
              value={cashBalance}
              onChange={(e) => setCashBalance(e.target.value)}
              placeholder="Enter opening cash (positive or negative)"
              disabled={isPending}
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder:text-gray-500 h-10 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="upiBalance" className="text-gray-900 font-bold text-sm">UPI Balance (₹)</Label>
            <Input
              id="upiBalance"
              type="number"
              step="0.01"
              value={upiBalance}
              onChange={(e) => setUpiBalance(e.target.value)}
              placeholder="Enter opening UPI (positive or negative)"
              disabled={isPending}
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder:text-gray-500 h-10 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="savings" className="text-gray-900 font-bold text-sm">Savings (10%) (₹)</Label>
            <Input
              id="savings"
              type="number"
              step="0.01"
              value={savings}
              onChange={(e) => setSavings(e.target.value)}
              placeholder="Enter existing savings (positive or negative)"
              disabled={isPending}
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder:text-gray-500 h-10 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userDeductions" className="text-gray-900 font-bold text-sm">User Deductions (₹)</Label>
            <Input
              id="userDeductions"
              type="number"
              step="0.01"
              value={userDeductions}
              onChange={(e) => setUserDeductions(e.target.value)}
              placeholder="Enter existing deductions (positive or negative)"
              disabled={isPending}
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder:text-gray-500 h-10 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900 font-bold text-sm">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-semibold text-base h-10 px-4 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-400 bg-white border-gray-300 shadow-sm text-black hover:text-black hover:font-bold"
                  disabled={isPending}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-600" />
                  <span className="text-base font-bold text-black">{format(date, 'PPP')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl" align="start">
                <Calendar 
                  mode="single" 
                  selected={date} 
                  onSelect={(d) => d && setDate(d)} 
                  initialFocus 
                  className="modern-calendar"
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 bg-gradient-to-r from-teal-500 to-blue-500 text-black hover:shadow-lg transition-all duration-200 hover:scale-[1.02] font-bold rounded-xl shadow-md hover:text-black hover:font-extrabold" 
            disabled={isPending}
          >
            {isPending ? (
              <>
                {isEditing ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update' : 'Save'}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
