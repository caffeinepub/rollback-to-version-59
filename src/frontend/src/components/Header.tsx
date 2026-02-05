import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, Trash2, Download, Upload } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useClearTransactionData, useBackupData, useRestoreData } from '../hooks/useQueries';
import { useRef } from 'react';

interface HeaderProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function Header({ isAuthenticated, onLogout }: HeaderProps) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const clearDataMutation = useClearTransactionData();
  const { mutate: backupData, isPending: isBackingUp } = useBackupData();
  const { mutate: restoreData, isPending: isRestoring } = useRestoreData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClearData = async () => {
    await clearDataMutation.mutateAsync();
    setIsResetDialogOpen(false);
  };

  const handleBackup = () => {
    backupData(undefined, {
      onSuccess: () => {
        // Success handled silently or with toast if needed
      },
      onError: (error) => {
        console.error('Backup failed:', error);
      },
    });
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please select a valid JSON backup file');
      return;
    }

    restoreData(file, {
      onSuccess: () => {
        // Success handled silently or with toast if needed
      },
      onError: (error) => {
        console.error('Restore failed:', error);
        alert('Restore failed: ' + error.message);
      },
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-600 shadow-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-white p-2.5 shadow-md">
            <Wallet className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">APJ ENTERPRISES</h1>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <TooltipProvider>
              {/* Backup Icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleBackup}
                    disabled={isBackingUp}
                    size="icon"
                    className="h-9 w-9 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg transition-all duration-300 rounded-full border-0 hover:scale-110"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-black font-semibold">Backup</p>
                </TooltipContent>
              </Tooltip>

              {/* Restore Icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleRestoreClick}
                    disabled={isRestoring}
                    size="icon"
                    className="h-9 w-9 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:shadow-lg transition-all duration-300 rounded-full border-0 hover:scale-110"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-black font-semibold">Restore</p>
                </TooltipContent>
              </Tooltip>

              {/* Hidden file input for restore */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Clear Data Icon */}
              <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 text-white hover:from-red-600 hover:via-rose-600 hover:to-pink-600 hover:shadow-lg transition-all duration-300 rounded-full border-0 hover:scale-110"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-black font-semibold">Clear Data</p>
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent className="bg-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-gray-900">Clear All Transaction Data?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-600">
                      This action will permanently delete all transactions, daily tracking data, and cumulative deductions.
                      Your PIN and user profile will be preserved. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="text-black hover:text-black hover:font-bold">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearData}
                      disabled={clearDataMutation.isPending}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 font-semibold"
                    >
                      {clearDataMutation.isPending ? 'Clearing...' : 'Clear All Data'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Logout Icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onLogout}
                    size="icon"
                    className="h-9 w-9 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 hover:shadow-lg transition-all duration-300 rounded-full border-0 hover:scale-110"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-black font-semibold">Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </header>
  );
}
