import { useState, useEffect } from 'react';
import { useEditTransaction } from '../hooks/useQueries';
import { Transaction, TransactionType } from '../backend';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { CalendarIcon, Loader2, Save, X } from 'lucide-react';
import { format } from 'date-fns';

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const [transactionType, setTransactionType] = useState<TransactionType | ''>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const { mutate: editTransaction, isPending } = useEditTransaction();

  // Initialize form with transaction data when dialog opens
  useEffect(() => {
    if (transaction && open) {
      setTransactionType(transaction.transactionType);
      setAmount(transaction.amount.toString());
      setDescription(transaction.description);
      setDate(new Date(Number(transaction.date) / 1_000_000));
    }
  }, [transaction, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!transaction || !transactionType || !amount) {
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue === 0) {
      return;
    }

    const dateInNanoseconds = BigInt(date.getTime()) * BigInt(1_000_000);

    editTransaction(
      {
        transactionId: transaction.id,
        transactionType: transactionType as TransactionType,
        amount: BigInt(Math.round(amountValue)),
        description: description.trim() || null,
        date: dateInNanoseconds,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white border-2 border-gray-200 shadow-2xl rounded-2xl">
        <DialogHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 -mx-6 -mt-6 px-6 py-4 rounded-t-2xl">
          <DialogTitle className="text-white font-bold text-xl">Edit Transaction</DialogTitle>
          <DialogDescription className="text-white font-semibold">
            Update the transaction details below
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="edit-type" className="text-gray-900 font-bold text-base">
              Transaction Type
            </Label>
            <Select
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as TransactionType)}
              disabled={isPending}
            >
              <SelectTrigger
                id="edit-type"
                className="bg-white border-2 border-gray-300 text-gray-900 h-12 rounded-xl hover:border-blue-400 transition-all duration-200 focus:ring-2 focus:ring-blue-400 shadow-sm font-semibold"
              >
                <SelectValue placeholder="Select transaction type" className="text-gray-900 font-semibold" />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-gray-200 shadow-xl rounded-xl">
                <SelectItem
                  value={TransactionType.cashIn}
                  className="bg-green-50 text-gray-900 hover:bg-green-100 focus:bg-green-100 rounded-lg transition-all duration-200 font-semibold my-1"
                >
                  Cash In
                </SelectItem>
                <SelectItem
                  value={TransactionType.cashOut}
                  className="bg-red-50 text-gray-900 hover:bg-red-100 focus:bg-red-100 rounded-lg transition-all duration-200 font-semibold my-1"
                >
                  Cash Out
                </SelectItem>
                <SelectItem
                  value={TransactionType.upiIn}
                  className="bg-teal-50 text-gray-900 hover:bg-teal-100 focus:bg-teal-100 rounded-lg transition-all duration-200 font-semibold my-1"
                >
                  UPI In
                </SelectItem>
                <SelectItem
                  value={TransactionType.upiOut}
                  className="bg-orange-50 text-gray-900 hover:bg-orange-100 focus:bg-orange-100 rounded-lg transition-all duration-200 font-semibold my-1"
                >
                  UPI Out
                </SelectItem>
                <SelectItem
                  value={TransactionType.savingsOut}
                  className="bg-purple-50 text-gray-900 hover:bg-purple-100 focus:bg-purple-100 rounded-lg transition-all duration-200 font-semibold my-1"
                >
                  Savings (10%) Out
                </SelectItem>
                <SelectItem
                  value={TransactionType.deductionsOut}
                  className="bg-amber-50 text-gray-900 hover:bg-amber-100 focus:bg-amber-100 rounded-lg transition-all duration-200 font-semibold my-1"
                >
                  Deductions Out
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-amount" className="text-gray-900 font-bold text-base">
              Amount (₹)
            </Label>
            <Input
              id="edit-amount"
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
            <Label htmlFor="edit-description" className="text-gray-900 font-bold text-base">
              Description (Optional)
            </Label>
            <Textarea
              id="edit-description"
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
            <Popover>
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
              <PopoverContent
                className="w-auto p-0 bg-white border-2 border-blue-300 shadow-2xl rounded-2xl"
                align="start"
              >
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

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-12 border-2 border-gray-300 text-black hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 font-bold rounded-xl shadow-sm hover:text-black hover:font-extrabold"
              disabled={isPending}
            >
              <X className="mr-2 h-5 w-5" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-black hover:shadow-lg transition-all duration-200 hover:scale-[1.02] font-bold rounded-xl shadow-md hover:text-black hover:font-extrabold"
              disabled={isPending || !transactionType || !amount}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Update Transaction
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
