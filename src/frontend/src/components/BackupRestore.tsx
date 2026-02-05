import { useState, useRef } from 'react';
import { useBackupData, useRestoreData } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Download, Upload, Database, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BackupRestore() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isBackupExpanded, setIsBackupExpanded] = useState(false);
  const [isRestoreExpanded, setIsRestoreExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: backupData, isPending: isBackingUp } = useBackupData();
  const { mutate: restoreData, isPending: isRestoring } = useRestoreData();

  const handleBackup = () => {
    backupData(undefined, {
      onSuccess: () => {
        setShowSuccess(true);
        setShowError(false);
        setTimeout(() => setShowSuccess(false), 3000);
      },
      onError: (error) => {
        setShowError(true);
        setErrorMessage(error.message);
        setTimeout(() => setShowError(false), 5000);
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
      setShowError(true);
      setErrorMessage('Please select a valid JSON backup file');
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    restoreData(file, {
      onSuccess: () => {
        setShowSuccess(true);
        setShowError(false);
        setTimeout(() => setShowSuccess(false), 3000);
      },
      onError: (error) => {
        setShowError(true);
        setErrorMessage(error.message);
        setTimeout(() => setShowError(false), 5000);
      },
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleBackup = () => {
    setIsBackupExpanded(!isBackupExpanded);
  };

  const toggleRestore = () => {
    setIsRestoreExpanded(!isRestoreExpanded);
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <Alert className="border-2 border-green-200 bg-green-50 shadow-md">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900 font-semibold">
            Operation completed successfully!
          </AlertDescription>
        </Alert>
      )}

      {showError && (
        <Alert variant="destructive" className="border-2 border-red-200 bg-red-50 shadow-md">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-900 font-semibold">
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Backup Section */}
      <div className="space-y-4">
        <button
          onClick={toggleBackup}
          className="flex items-center justify-between w-full text-left group hover:opacity-80 transition-opacity duration-200"
        >
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            <h3 className="text-xl font-bold text-gray-900">Backup</h3>
          </div>
          {isBackupExpanded ? (
            <ChevronUp className="h-6 w-6 text-gray-600 group-hover:text-indigo-600 transition-colors duration-200" />
          ) : (
            <ChevronDown className="h-6 w-6 text-gray-600 group-hover:text-indigo-600 transition-colors duration-200" />
          )}
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isBackupExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-2 pt-4">
            <p className="text-sm text-gray-600 font-medium">
              Export all your transactions, balances, and settings to a JSON file. The file will be named with today's date.
            </p>
            <Button
              onClick={handleBackup}
              disabled={isBackingUp}
              className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-black hover:shadow-lg transition-all duration-200 hover:scale-[1.02] font-bold rounded-xl shadow-md hover:text-black hover:font-extrabold"
            >
              {isBackingUp ? (
                <>Backing up...</>
              ) : (
                <>
                  <Download className="mr-2 h-5 w-5" />
                  Create Backup
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Restore Section */}
      <div className="space-y-4">
        <button
          onClick={toggleRestore}
          className="flex items-center justify-between w-full text-left group hover:opacity-80 transition-opacity duration-200"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-purple-600" />
            <h3 className="text-xl font-bold text-gray-900">Restore</h3>
          </div>
          {isRestoreExpanded ? (
            <ChevronUp className="h-6 w-6 text-gray-600 group-hover:text-purple-600 transition-colors duration-200" />
          ) : (
            <ChevronDown className="h-6 w-6 text-gray-600 group-hover:text-purple-600 transition-colors duration-200" />
          )}
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isRestoreExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="space-y-2 pt-4">
            <p className="text-sm text-gray-600 font-medium">
              Import data from a previously created backup file. This will replace all current data.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={handleRestoreClick}
              disabled={isRestoring}
              className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-black hover:shadow-lg transition-all duration-200 hover:scale-[1.02] font-bold rounded-xl shadow-md hover:text-black hover:font-extrabold"
            >
              {isRestoring ? (
                <>Restoring...</>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Restore from Backup
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <p className="text-sm text-blue-900 font-semibold">
          <strong>Note:</strong> Backup files are saved with the current date (e.g., backup_2026-01-16.json). 
          Creating a new backup on the same day will overwrite the previous file.
        </p>
      </div>
    </div>
  );
}
