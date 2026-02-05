import { useState, useEffect, useRef } from 'react';
import { useAddTransaction } from '../hooks/useQueries';
import { TransactionType } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CheckCircle2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TransactionFormProps {
  onSuccess?: () => void;
  preselectedType?: string;
}

export default function TransactionForm({ onSuccess, preselectedType }: TransactionFormProps) {
  // Initialize transaction type with preselected value immediately
  const getInitialTransactionType = (): TransactionType | '' => {
    if (!preselectedType) return '';
    
    const typeMapping: Record<string, TransactionType> = {
      'cashIn': TransactionType.cashIn,
      'cashOut': TransactionType.cashOut,
      'upiIn': TransactionType.upiIn,
      'upiOut': TransactionType.upiOut,
      'savingsOut': TransactionType.savingsOut,
      'deductionsOut': TransactionType.deductionsOut,
    };
    
    return typeMapping[preselectedType] || '';
  };

  const [transactionType, setTransactionType] = useState<TransactionType | ''>(getInitialTransactionType());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const { mutate: addTransaction, isPending } = useAddTransaction();

  // Update transaction type when preselectedType changes and auto-focus amount field
  useEffect(() => {
    if (preselectedType) {
      const typeMapping: Record<string, TransactionType> = {
        'cashIn': TransactionType.cashIn,
        'cashOut': TransactionType.cashOut,
        'upiIn': TransactionType.upiIn,
        'upiOut': TransactionType.upiOut,
        'savingsOut': TransactionType.savingsOut,
        'deductionsOut': TransactionType.deductionsOut,
      };
      
      const mappedType = typeMapping[preselectedType];
      if (mappedType) {
        // Set transaction type immediately for instant preselection
        setTransactionType(mappedType);
        
        // Auto-focus the amount input field with optimized delay for smooth transition
        const focusTimer = setTimeout(() => {
          amountInputRef.current?.focus();
        }, 150);
        
        return () => clearTimeout(focusTimer);
      }
    }
  }, [preselectedType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transactionType || !amount) {
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue === 0) {
      return;
    }

    const dateInNanoseconds = BigInt(date.getTime()) * BigInt(1_000_000);

    addTransaction(
      {
        transactionType: transactionType as TransactionType,
        amount: BigInt(Math.round(amountValue)),
        description: description.trim() || null,
        date: dateInNanoseconds,
      },
      {
        onSuccess: () => {
          // Reset form
          setTransactionType('');
          setAmount('');
          setDescription('');
          setDate(new Date());
          
          // Show success message
          setShowSuccess(true);
          
          // Hide success message after 2 seconds
          setTimeout(() => {
            setShowSuccess(false);
          }, 2000);
          
          // Call parent callback to switch to overview tab
          onSuccess?.();
        },
      }
    );
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setIsDatePickerOpen(false);
    }
  };

  const handleTypeSelect = (value: string) => {
    setTransactionType(value as TransactionType);
    setIsTypeDropdownOpen(false);
    
    // Focus amount field after type selection for smooth workflow
    setTimeout(() => {
      amountInputRef.current?.focus();
    }, 100);
  };

  // Get display text for selected transaction type
  const getTransactionTypeDisplayText = (type: TransactionType | '') => {
    if (!type) return undefined;
    
    const displayMapping: Record<TransactionType, string> = {
      [TransactionType.cashIn]: 'Cash In',
      [TransactionType.cashOut]: 'Cash Out',
      [TransactionType.upiIn]: 'UPI In',
      [TransactionType.upiOut]: 'UPI Out',
      [TransactionType.savingsOut]: 'Savings (10%) Out',
      [TransactionType.deductionsOut]: 'Deductions Out',
    };
    
    return displayMapping[type];
  };

  return (
    <Card className="mx-auto max-w-2xl bg-white border border-gray-200 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-t-2xl border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-white" />
          <CardTitle className="text-white font-bold">Add New Transaction</CardTitle>
        </div>
        <CardDescription className="text-white font-semibold">Record a new cash or UPI transaction</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {showSuccess && (
          <Alert className="mb-4 border-2 border-green-200 bg-green-50 shadow-md">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 font-semibold">
              Transaction added successfully! Balances updated.
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-gray-900 font-bold text-base">Transaction Type</Label>
            <Select
              value={transactionType}
              onValueChange={handleTypeSelect}
              disabled={isPending}
              open={isTypeDropdownOpen}
              onOpenChange={setIsTypeDropdownOpen}
            >
              <SelectTrigger 
                id="type" 
                className="bg-white border-2 border-gray-300 h-12 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-semibold transaction-type-trigger"
              >
                <SelectValue placeholder="Select transaction type" className="transaction-type-value">
                  {transactionType ? (
                    <span className="text-gray-900 font-bold text-base">
                      {getTransactionTypeDisplayText(transactionType)}
                    </span>
                  ) : (
                    <span className="text-gray-500 font-semibold">Select transaction type</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-200 shadow-xl rounded-xl">
                <SelectItem 
                  value={TransactionType.cashIn} 
                  className="bg-green-50 text-gray-900 hover:bg-green-100 focus:bg-green-100 focus:text-gray-900 rounded-lg transition-all duration-200 font-semibold my-1 cursor-pointer"
                >
                  <span className="text-gray-900 font-bold">Cash In</span>
                </SelectItem>
                <SelectItem 
                  value={TransactionType.cashOut} 
                  className="bg-red-50 text-gray-900 hover:bg-red-100 focus:bg-red-100 focus:text-gray-900 rounded-lg transition-all duration-200 font-semibold my-1 cursor-pointer"
                >
                  <span className="text-gray-900 font-bold">Cash Out</span>
                </SelectItem>
                <SelectItem 
                  value={TransactionType.upiIn} 
                  className="bg-teal-50 text-gray-900 hover:bg-teal-100 focus:bg-teal-100 focus:text-gray-900 rounded-lg transition-all duration-200 font-semibold my-1 cursor-pointer"
                >
                  <span className="text-gray-900 font-bold">UPI In</span>
                </SelectItem>
                <SelectItem 
                  value={TransactionType.upiOut} 
                  className="bg-orange-50 text-gray-900 hover:bg-orange-100 focus:bg-orange-100 focus:text-gray-900 rounded-lg transition-all duration-200 font-semibold my-1 cursor-pointer"
                >
                  <span className="text-gray-900 font-bold">UPI Out</span>
                </SelectItem>
                <SelectItem 
                  value={TransactionType.savingsOut} 
                  className="bg-purple-50 text-gray-900 hover:bg-purple-100 focus:bg-purple-100 focus:text-gray-900 rounded-lg transition-all duration-200 font-semibold my-1 cursor-pointer"
                >
                  <span className="text-gray-900 font-bold">Savings (10%) Out</span>
                </SelectItem>
                <SelectItem 
                  value={TransactionType.deductionsOut} 
                  className="bg-amber-50 text-gray-900 hover:bg-amber-100 focus:bg-amber-100 focus:text-gray-900 rounded-lg transition-all duration-200 font-semibold my-1 cursor-pointer"
                >
                  <span className="text-gray-900 font-bold">Deductions Out</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-gray-900 font-bold text-base">Amount (₹)</Label>
            <Input
              ref={amountInputRef}
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount (positive or negative)"
              disabled={isPending}
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder:text-gray-500 h-12 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-900 font-bold text-base">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter transaction description (optional)"
              disabled={isPending}
              rows={3}
              className="bg-white border-2 border-gray-300 text-gray-900 placeholder:text-gray-500 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-900 font-bold text-base">Date</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-semibold text-lg h-14 px-5 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-400 bg-white border-gray-300 shadow-sm text-black hover:text-black hover:font-bold"
                  disabled={isPending}
                >
                  <CalendarIcon className="mr-3 h-5 w-5 text-blue-600" />
                  <span className="text-lg font-bold text-black">{format(date, 'PPP')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl" align="start">
                <Calendar 
                  mode="single" 
                  selected={date} 
                  onSelect={handleDateSelect} 
                  initialFocus 
                  className="modern-calendar"
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-black hover:shadow-lg transition-all duration-200 hover:scale-[1.02] font-bold rounded-xl shadow-md hover:text-black hover:font-extrabold" 
            disabled={isPending || !transactionType || !amount}
          >
            {isPending ? (
              <>
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                Add Transaction
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
