import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Transaction, TransactionType, Balance, UserProfile, DailyTracking, CumulativeStats, OpeningBalance } from '../backend';
import { toast } from 'sonner';

// Local storage keys
const LOCAL_TRANSACTIONS_KEY = 'apj_transactions';
const LOCAL_BALANCES_KEY = 'apj_balances';
const LOCAL_USER_PROFILE_KEY = 'apj_user_profile';
const LOCAL_DAILY_TRACKING_KEY = 'apj_daily_tracking';
const LOCAL_USER_DEDUCTIONS_KEY = 'apj_user_deductions';
const LOCAL_TEN_PERCENT_SAVINGS_KEY = 'apj_ten_percent_savings';
const LOCAL_OPENING_BALANCE_KEY = 'apj_opening_balance';

// Helper functions for local storage
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

function saveLocalTransactions(transactions: Transaction[]) {
  try {
    // Convert bigint to string for JSON serialization
    const serializable = transactions.map(t => ({
      ...t,
      id: t.id.toString(),
      amount: t.amount.toString(),
      date: t.date.toString(),
    }));
    localStorage.setItem(LOCAL_TRANSACTIONS_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Failed to save local transactions:', error);
    throw error;
  }
}

function getLocalOpeningBalance(): OpeningBalance {
  try {
    const stored = localStorage.getItem(LOCAL_OPENING_BALANCE_KEY);
    if (!stored) {
      return {
        cashBalance: 0n,
        upiBalance: 0n,
        savings: 0n,
        userDeductions: 0n,
        date: 0n,
      };
    }
    const parsed = JSON.parse(stored);
    return {
      cashBalance: BigInt(parsed.cashBalance),
      upiBalance: BigInt(parsed.upiBalance),
      savings: BigInt(parsed.savings),
      userDeductions: BigInt(parsed.userDeductions),
      date: BigInt(parsed.date),
    };
  } catch (error) {
    console.error('Failed to load local opening balance:', error);
    return {
      cashBalance: 0n,
      upiBalance: 0n,
      savings: 0n,
      userDeductions: 0n,
      date: 0n,
    };
  }
}

function saveLocalOpeningBalance(openingBalance: OpeningBalance) {
  try {
    const serializable = {
      cashBalance: openingBalance.cashBalance.toString(),
      upiBalance: openingBalance.upiBalance.toString(),
      savings: openingBalance.savings.toString(),
      userDeductions: openingBalance.userDeductions.toString(),
      date: openingBalance.date.toString(),
    };
    localStorage.setItem(LOCAL_OPENING_BALANCE_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Failed to save local opening balance:', error);
    throw error;
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

function saveLocalUserDeductions(deductions: Record<string, bigint>) {
  try {
    // Convert bigint values to strings for JSON serialization
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

function getLocalTenPercentSavings(): Record<string, bigint> {
  try {
    const stored = localStorage.getItem(LOCAL_TEN_PERCENT_SAVINGS_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    // Convert string values back to bigint
    const result: Record<string, bigint> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[key] = BigInt(value as string);
    }
    return result;
  } catch (error) {
    console.error('Failed to load local ten percent savings:', error);
    return {};
  }
}

function saveLocalTenPercentSavings(savings: Record<string, bigint>) {
  try {
    // Convert bigint values to strings for JSON serialization
    const serializable: Record<string, string> = {};
    for (const [key, value] of Object.entries(savings)) {
      serializable[key] = value.toString();
    }
    localStorage.setItem(LOCAL_TEN_PERCENT_SAVINGS_KEY, JSON.stringify(serializable));
  } catch (error) {
    console.error('Failed to save local ten percent savings:', error);
    throw error;
  }
}

// Recalculate all 10% savings from transactions
function recalculateTenPercentSavings(transactions: Transaction[]) {
  const tenPercentSavings: Record<string, bigint> = {};
  
  // Group transactions by date
  const transactionsByDate = new Map<string, Transaction[]>();
  
  transactions.forEach((t) => {
    const txnDateMs = Number(t.date) / 1_000_000;
    const txnDate = new Date(txnDateMs);
    txnDate.setHours(0, 0, 0, 0);
    const dateKey = BigInt(txnDate.getTime() * 1_000_000).toString();
    
    if (!transactionsByDate.has(dateKey)) {
      transactionsByDate.set(dateKey, []);
    }
    transactionsByDate.get(dateKey)!.push(t);
  });
  
  // Calculate 10% for each date
  transactionsByDate.forEach((dayTransactions, dateKey) => {
    // Calculate total inflows (Cash In + UPI In) for the day
    const totalInflows = dayTransactions.reduce((sum, txn) => {
      if (txn.transactionType === 'cashIn' || txn.transactionType === 'upiIn') {
        return sum + txn.amount;
      }
      return sum;
    }, 0n);
    
    // Calculate 10% deduction rounded to nearest 10
    if (totalInflows > 0n) {
      const tenPercent = (totalInflows * 10n) / 100n;
      const remainder = tenPercent % 10n;
      let deduction = 0n;
      if (remainder >= 5n) {
        deduction = tenPercent + (10n - remainder);
      } else {
        deduction = tenPercent - remainder;
      }
      tenPercentSavings[dateKey] = deduction;
    }
  });
  
  saveLocalTenPercentSavings(tenPercentSavings);
  return tenPercentSavings;
}

function calculateBalances(transactions: Transaction[], cumulativeStats?: CumulativeStats, openingBalance?: OpeningBalance): Balance {
  let cashIn = 0n;
  let cashOut = 0n;
  let upiIn = 0n;
  let upiOut = 0n;
  let savingsOut = 0n;
  let deductionsOut = 0n;

  transactions.forEach((transaction) => {
    switch (transaction.transactionType) {
      case 'cashIn':
        cashIn += transaction.amount;
        break;
      case 'cashOut':
        cashOut += transaction.amount;
        break;
      case 'upiIn':
        upiIn += transaction.amount;
        break;
      case 'upiOut':
        upiOut += transaction.amount;
        break;
      case 'savingsOut':
        savingsOut += transaction.amount;
        break;
      case 'deductionsOut':
        deductionsOut += transaction.amount;
        break;
    }
  });

  // CRITICAL FIX: Add opening balances directly to their respective heads
  const openingCashBalance = openingBalance?.cashBalance || 0n;
  const openingUpiBalance = openingBalance?.upiBalance || 0n;
  
  // Add opening balances to the totals immediately
  cashIn = cashIn + openingCashBalance;
  upiIn = upiIn + openingUpiBalance;

  // Calculate Cash Balance with the correct formula:
  // Cash Balance = Cash In (including opening) - Cash Out - (Cumulative Savings 10%) - (Cumulative Cheeti Amount)
  let cashBalance = BigInt(cashIn) - BigInt(cashOut);
  if (cumulativeStats) {
    cashBalance = cashBalance - cumulativeStats.cumulativeTenPercentSavings - cumulativeStats.cumulativeUserSpecifiedDeductions;
  }

  // UPI Balance = UPI In (including opening) - UPI Out
  const upiBalance = BigInt(upiIn) - BigInt(upiOut);
  
  // Savings Balance = Opening Savings + Cumulative 10% Savings - Savings Out
  const openingSavings = openingBalance?.savings || 0n;
  const cumulativeTenPercent = cumulativeStats?.cumulativeTenPercentSavings || 0n;
  const savingsBalance = openingSavings + cumulativeTenPercent - savingsOut;
  
  // Deductions Balance = Opening User Deductions + Cumulative User Deductions - Deductions Out
  const openingUserDeductions = openingBalance?.userDeductions || 0n;
  const cumulativeUserDeductions = cumulativeStats?.cumulativeUserSpecifiedDeductions || 0n;
  const deductionsBalance = openingUserDeductions + cumulativeUserDeductions - deductionsOut;
  
  // Total Balance = Cash Balance + UPI Balance (both already have deductions applied)
  const totalBalance = cashBalance + upiBalance;
  
  // excludedTotalBalance is the same as totalBalance since deductions are already applied to cashBalance
  const excludedTotalBalance = totalBalance;

  return {
    cashIn,
    cashOut,
    upiIn,
    upiOut,
    cashBalance,
    upiBalance,
    savingsBalance,
    deductionsBalance,
    totalBalance,
    excludedTotalBalance,
  };
}

function calculateDailyTracking(transactions: Transaction[], date: bigint, userDeductions: Record<string, bigint>): DailyTracking & { cashOut: bigint; upiOut: bigint } {
  // Filter transactions for the selected date (compare date only, not time)
  const dateKey = date.toString();
  const selectedDateMs = Number(date) / 1_000_000;
  const selectedDate = new Date(selectedDateMs);
  selectedDate.setHours(0, 0, 0, 0);
  const startOfDay = selectedDate.getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

  const filteredTransactions = transactions.filter((t) => {
    const txnDateMs = Number(t.date) / 1_000_000;
    return txnDateMs >= startOfDay && txnDateMs < endOfDay;
  });

  // Calculate total daily transactions (ONLY inflows: Cash In + UPI In)
  const totalDailyTransactions = filteredTransactions.reduce((sum, txn) => {
    // Only include inflows (cashIn and upiIn)
    if (txn.transactionType === 'cashIn' || txn.transactionType === 'upiIn') {
      return sum + txn.amount;
    }
    return sum;
  }, 0n);

  // Calculate separate outflows for display
  const cashOut = filteredTransactions.reduce((sum, txn) => {
    if (txn.transactionType === 'cashOut') {
      return sum + txn.amount;
    }
    return sum;
  }, 0n);

  const upiOut = filteredTransactions.reduce((sum, txn) => {
    if (txn.transactionType === 'upiOut') {
      return sum + txn.amount;
    }
    return sum;
  }, 0n);

  // Calculate 10% deduction rounded to nearest 10 (based on inflows only)
  let dailyTenPercentDeduction = 0n;
  if (totalDailyTransactions > 0n) {
    const tenPercent = (totalDailyTransactions * 10n) / 100n;
    const remainder = tenPercent % 10n;
    if (remainder >= 5n) {
      dailyTenPercentDeduction = tenPercent + (10n - remainder);
    } else {
      dailyTenPercentDeduction = tenPercent - remainder;
    }
  }

  // Store the 10% savings for this date
  const tenPercentSavings = getLocalTenPercentSavings();
  tenPercentSavings[dateKey] = dailyTenPercentDeduction;
  saveLocalTenPercentSavings(tenPercentSavings);

  // Get user-specified deduction for this date
  const userSpecifiedDailyDeduction = userDeductions[dateKey] || 0n;

  // Calculate total with deductions
  const totalDeductions = dailyTenPercentDeduction + userSpecifiedDailyDeduction;
  const totalDailyTransactionsWithDeduction = BigInt(totalDailyTransactions) - totalDeductions;

  return {
    totalDailyTransactions,
    dailyTenPercentDeduction,
    userSpecifiedDailyDeduction,
    totalDailyTransactionsWithDeduction,
    cashOut,
    upiOut,
  };
}

function calculateCumulativeStats(openingBalance?: OpeningBalance): CumulativeStats {
  const tenPercentSavings = getLocalTenPercentSavings();
  const userDeductions = getLocalUserDeductions();

  // Calculate cumulative from transactions
  const cumulativeTenPercentSavings = Object.values(tenPercentSavings).reduce((sum, val) => sum + val, 0n);
  const cumulativeUserSpecifiedDeductions = Object.values(userDeductions).reduce((sum, val) => sum + val, 0n);

  // CRITICAL FIX: Add opening balance savings and user deductions directly to cumulative totals
  const openingSavings = openingBalance?.savings || 0n;
  const openingUserDeductions = openingBalance?.userDeductions || 0n;

  return {
    cumulativeTenPercentSavings: openingSavings + cumulativeTenPercentSavings,
    cumulativeUserSpecifiedDeductions: openingUserDeductions + cumulativeUserSpecifiedDeductions,
  };
}

// Backup and Restore functions
export function useBackupData() {
  return useMutation({
    mutationFn: async () => {
      const backupData = {
        transactions: localStorage.getItem(LOCAL_TRANSACTIONS_KEY),
        balances: localStorage.getItem(LOCAL_BALANCES_KEY),
        userProfile: localStorage.getItem(LOCAL_USER_PROFILE_KEY),
        dailyTracking: localStorage.getItem(LOCAL_DAILY_TRACKING_KEY),
        userDeductions: localStorage.getItem(LOCAL_USER_DEDUCTIONS_KEY),
        tenPercentSavings: localStorage.getItem(LOCAL_TEN_PERCENT_SAVINGS_KEY),
        openingBalance: localStorage.getItem(LOCAL_OPENING_BALANCE_KEY),
        timestamp: new Date().toISOString(),
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `backup_${dateStr}.json`;
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return filename;
    },
    onSuccess: (filename) => {
      toast.success(`Backup created successfully: ${filename}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create backup: ${error.message}`);
    },
  });
}

export function useRestoreData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const backupData = JSON.parse(e.target?.result as string);
            
            // Validate backup data structure
            if (!backupData || typeof backupData !== 'object') {
              throw new Error('Invalid backup file format');
            }

            // Restore all data to localStorage
            if (backupData.transactions) localStorage.setItem(LOCAL_TRANSACTIONS_KEY, backupData.transactions);
            if (backupData.balances) localStorage.setItem(LOCAL_BALANCES_KEY, backupData.balances);
            if (backupData.userProfile) localStorage.setItem(LOCAL_USER_PROFILE_KEY, backupData.userProfile);
            if (backupData.dailyTracking) localStorage.setItem(LOCAL_DAILY_TRACKING_KEY, backupData.dailyTracking);
            if (backupData.userDeductions) localStorage.setItem(LOCAL_USER_DEDUCTIONS_KEY, backupData.userDeductions);
            if (backupData.tenPercentSavings) localStorage.setItem(LOCAL_TEN_PERCENT_SAVINGS_KEY, backupData.tenPercentSavings);
            if (backupData.openingBalance) localStorage.setItem(LOCAL_OPENING_BALANCE_KEY, backupData.openingBalance);

            resolve();
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read backup file'));
        reader.readAsText(file);
      });
    },
    onSuccess: () => {
      // Invalidate all queries to refresh UI with restored data
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTracking'] });
      queryClient.invalidateQueries({ queryKey: ['cumulativeStats'] });
      queryClient.invalidateQueries({ queryKey: ['openingBalance'] });
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      
      toast.success('Data restored successfully from backup');
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore data: ${error.message}`);
    },
  });
}

export function useGetCallerUserProfile() {
  const { actor } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      // Try to get from local storage first
      try {
        const stored = localStorage.getItem(LOCAL_USER_PROFILE_KEY);
        if (stored) {
          const profile = JSON.parse(stored);
          
          // Try to sync with backend in background if available
          if (actor) {
            try {
              const backendProfile = await actor.getCallerUserProfile();
              if (backendProfile) {
                localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(backendProfile));
                return backendProfile;
              }
            } catch (error) {
              console.log('Backend unavailable, using local profile');
            }
          }
          
          return profile;
        }
      } catch (error) {
        console.error('Failed to load local profile:', error);
      }

      // If no local profile and actor available, try backend
      if (actor) {
        try {
          const backendProfile = await actor.getCallerUserProfile();
          if (backendProfile) {
            localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(backendProfile));
          }
          return backendProfile;
        } catch (error) {
          console.log('Backend unavailable');
        }
      }

      return null;
    },
    retry: false,
    staleTime: 30000,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      // Save locally first (offline-first approach)
      localStorage.setItem(LOCAL_USER_PROFILE_KEY, JSON.stringify(profile));

      // Try to sync with backend in background if available
      if (actor) {
        try {
          await actor.saveCallerUserProfile(profile);
        } catch (error) {
          console.log('Backend unavailable, profile saved locally');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useGetOpeningBalance() {
  return useQuery<OpeningBalance>({
    queryKey: ['openingBalance'],
    queryFn: async () => {
      // Always load from local storage (completely offline)
      return getLocalOpeningBalance();
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    enabled: true,
  });
}

export function useAddOpeningBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cashBalance,
      upiBalance,
      savings,
      userDeductions,
      date,
    }: {
      cashBalance: bigint;
      upiBalance: bigint;
      savings: bigint;
      userDeductions: bigint;
      date: bigint;
    }) => {
      const newOpeningBalance: OpeningBalance = {
        cashBalance,
        upiBalance,
        savings,
        userDeductions,
        date,
      };

      // Save locally (instant offline-only approach)
      saveLocalOpeningBalance(newOpeningBalance);

      return newOpeningBalance;
    },
    onSuccess: () => {
      // Immediately invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['openingBalance'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['cumulativeStats'] });
      
      toast.success('Opening balances saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save opening balances: ${error.message}`);
    },
  });
}

export function useUpdateOpeningBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      cashBalance,
      upiBalance,
      savings,
      userDeductions,
      date,
    }: {
      cashBalance: bigint;
      upiBalance: bigint;
      savings: bigint;
      userDeductions: bigint;
      date: bigint;
    }) => {
      const updatedOpeningBalance: OpeningBalance = {
        cashBalance,
        upiBalance,
        savings,
        userDeductions,
        date,
      };

      // Update locally (instant offline-only approach)
      saveLocalOpeningBalance(updatedOpeningBalance);

      return updatedOpeningBalance;
    },
    onSuccess: () => {
      // Immediately invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['openingBalance'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['cumulativeStats'] });
      
      toast.success('Opening balances updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update opening balances: ${error.message}`);
    },
  });
}

export function useGetCumulativeStats() {
  const queryClient = useQueryClient();

  return useQuery<CumulativeStats>({
    queryKey: ['cumulativeStats'],
    queryFn: async () => {
      // Get opening balance from cache or local storage
      const cachedOpeningBalance = queryClient.getQueryData<OpeningBalance>(['openingBalance']);
      const openingBalance = cachedOpeningBalance || getLocalOpeningBalance();

      // Calculate from local data including opening balance
      return calculateCumulativeStats(openingBalance);
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

export function useGetBalances() {
  const queryClient = useQueryClient();

  return useQuery<Balance>({
    queryKey: ['balances'],
    queryFn: async () => {
      // Get current transactions
      const cachedTransactions = queryClient.getQueryData<Transaction[]>(['transactions']);
      const transactions = cachedTransactions || getLocalTransactions();

      // Get opening balance
      const cachedOpeningBalance = queryClient.getQueryData<OpeningBalance>(['openingBalance']);
      const openingBalance = cachedOpeningBalance || getLocalOpeningBalance();

      // Get cumulative stats
      const cumulativeStats = calculateCumulativeStats(openingBalance);

      // Calculate balances with cumulative deductions and opening balance
      return calculateBalances(transactions, cumulativeStats, openingBalance);
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

export function useGetAllTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ['transactions'],
    queryFn: async () => {
      // Always load from local storage (completely offline)
      return getLocalTransactions();
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    enabled: true,
  });
}

export function useGetDailyTracking(date: bigint) {
  const queryClient = useQueryClient();

  return useQuery<DailyTracking & { cashOut: bigint; upiOut: bigint }>({
    queryKey: ['dailyTracking', date.toString()],
    queryFn: async () => {
      // Get transactions from cache or local storage
      const cachedTransactions = queryClient.getQueryData<Transaction[]>(['transactions']);
      const transactions = cachedTransactions || getLocalTransactions();

      // Get user deductions
      const userDeductions = getLocalUserDeductions();

      // Calculate daily tracking
      return calculateDailyTracking(transactions, date, userDeductions);
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}

export function useSetUserSpecifiedDeduction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ date, amount }: { date: bigint; amount: bigint }) => {
      // Save locally (instant offline-only update)
      const userDeductions = getLocalUserDeductions();
      userDeductions[date.toString()] = amount;
      saveLocalUserDeductions(userDeductions);
    },
    onSuccess: (_data, variables) => {
      // Invalidate daily tracking for the specific date
      queryClient.invalidateQueries({ queryKey: ['dailyTracking', variables.date.toString()] });
      // Invalidate cumulative stats
      queryClient.invalidateQueries({ queryKey: ['cumulativeStats'] });
      // Invalidate balances to reflect the new deduction
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      toast.success('Daily deduction updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to set deduction: ${error.message}`);
    },
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionType,
      amount,
      description,
      date,
    }: {
      transactionType: TransactionType;
      amount: bigint;
      description: string | null;
      date: bigint | null;
    }) => {
      // Validate amount - reject only zero
      if (amount === 0n) {
        throw new Error('Amount cannot be zero');
      }

      // Get current local transactions synchronously
      const localTransactions = getLocalTransactions();
      
      // Generate new ID
      const newId = localTransactions.length > 0 
        ? Math.max(...localTransactions.map(t => Number(t.id))) + 1 
        : 0;

      // Create new transaction
      const newTransaction: Transaction = {
        id: BigInt(newId),
        transactionType,
        amount,
        description: description || '',
        date: date || BigInt(Date.now() * 1_000_000),
      };

      // Save locally synchronously (instant offline-only approach)
      const updatedTransactions = [newTransaction, ...localTransactions];
      saveLocalTransactions(updatedTransactions);
      
      // Recalculate 10% savings immediately after adding transaction
      recalculateTenPercentSavings(updatedTransactions);

      // Update query cache immediately with new data
      queryClient.setQueryData<Transaction[]>(['transactions'], updatedTransactions);

      return newTransaction;
    },
    onSuccess: () => {
      // Immediately invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTracking'] });
      queryClient.invalidateQueries({ queryKey: ['cumulativeStats'] });
      
      toast.success('Transaction added successfully');
    },
    onError: (error: Error) => {
      const errorMsg = error.message;
      
      if (errorMsg.includes('Amount cannot be zero')) {
        toast.error('Amount cannot be zero');
      } else {
        toast.error(`Failed to add transaction: ${errorMsg}`);
      }
    },
  });
}

export function useEditTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      transactionType,
      amount,
      description,
      date,
    }: {
      transactionId: bigint;
      transactionType: TransactionType;
      amount: bigint;
      description: string | null;
      date: bigint | null;
    }) => {
      // Validate amount - reject only zero
      if (amount === 0n) {
        throw new Error('Amount cannot be zero');
      }

      // Get current local transactions synchronously
      const localTransactions = getLocalTransactions();
      
      // Find and update the transaction using proper BigInt comparison
      const transactionIndex = localTransactions.findIndex(t => t.id.toString() === transactionId.toString());
      if (transactionIndex === -1) {
        throw new Error('Transaction not found');
      }

      // Create updated transaction
      const updatedTransaction: Transaction = {
        id: transactionId,
        transactionType,
        amount,
        description: description || '',
        date: date || BigInt(Date.now() * 1_000_000),
      };

      // Update locally synchronously (instant offline-only approach)
      const updatedTransactions = [...localTransactions];
      updatedTransactions[transactionIndex] = updatedTransaction;
      saveLocalTransactions(updatedTransactions);
      
      // Recalculate 10% savings immediately after editing transaction
      recalculateTenPercentSavings(updatedTransactions);

      // Update query cache immediately with new data
      queryClient.setQueryData<Transaction[]>(['transactions'], updatedTransactions);

      return updatedTransaction;
    },
    onSuccess: () => {
      // Immediately invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTracking'] });
      queryClient.invalidateQueries({ queryKey: ['cumulativeStats'] });
      
      toast.success('Transaction updated successfully');
    },
    onError: (error: Error) => {
      const errorMsg = error.message;
      
      if (errorMsg.includes('Amount cannot be zero')) {
        toast.error('Amount cannot be zero');
      } else if (errorMsg.includes('Transaction not found')) {
        toast.error('Transaction not found');
      } else {
        toast.error(`Failed to edit transaction: ${errorMsg}`);
      }
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: bigint) => {
      // Get current local transactions synchronously
      const localTransactions = getLocalTransactions();
      
      // Find the transaction to delete using proper BigInt comparison
      const transactionIndex = localTransactions.findIndex(t => t.id.toString() === transactionId.toString());
      if (transactionIndex === -1) {
        console.error('Transaction not found. ID:', transactionId.toString());
        console.error('Available IDs:', localTransactions.map(t => t.id.toString()));
        throw new Error('Transaction not found');
      }

      // Delete locally synchronously (instant offline-only approach)
      const updatedTransactions = localTransactions.filter(t => t.id.toString() !== transactionId.toString());
      saveLocalTransactions(updatedTransactions);
      
      // Recalculate 10% savings immediately after deleting transaction
      recalculateTenPercentSavings(updatedTransactions);

      // Update query cache immediately with new data
      queryClient.setQueryData<Transaction[]>(['transactions'], updatedTransactions);

      return transactionId;
    },
    onSuccess: () => {
      // Immediately invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTracking'] });
      queryClient.invalidateQueries({ queryKey: ['cumulativeStats'] });
      
      toast.success('Transaction deleted successfully');
    },
    onError: (error: Error) => {
      const errorMsg = error.message;
      
      if (errorMsg.includes('Transaction not found')) {
        toast.error('Transaction not found. Please refresh and try again.');
      } else {
        toast.error(`Failed to delete transaction: ${errorMsg}`);
      }
    },
  });
}

export function useClearTransactionData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear local storage (offline-only approach)
      localStorage.removeItem(LOCAL_TRANSACTIONS_KEY);
      localStorage.removeItem(LOCAL_BALANCES_KEY);
      localStorage.removeItem(LOCAL_DAILY_TRACKING_KEY);
      localStorage.removeItem(LOCAL_USER_DEDUCTIONS_KEY);
      localStorage.removeItem(LOCAL_TEN_PERCENT_SAVINGS_KEY);
      localStorage.removeItem(LOCAL_OPENING_BALANCE_KEY);

      return 'Success: All transaction data cleared locally';
    },
    onSuccess: (message) => {
      // Immediately invalidate and refetch all queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['dailyTracking'] });
      queryClient.invalidateQueries({ queryKey: ['cumulativeStats'] });
      queryClient.invalidateQueries({ queryKey: ['openingBalance'] });
      
      toast.success(message || 'All transaction data cleared successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear data: ${error.message}`);
    },
  });
}
