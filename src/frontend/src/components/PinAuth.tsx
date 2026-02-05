import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertCircle, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface PinAuthProps {
  hasPinSetup: boolean;
  onSetupPin: (pin: string) => Promise<boolean>;
  onVerifyPin: (pin: string) => Promise<boolean>;
  onResetPin: () => void;
  isVerifyingPin?: boolean;
  authError?: string | null;
}

export default function PinAuth({ 
  hasPinSetup, 
  onSetupPin, 
  onVerifyPin, 
  onResetPin, 
  isVerifyingPin,
  authError 
}: PinAuthProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Update error from auth hook
  useEffect(() => {
    if (authError) {
      setError(authError);
      setIsProcessing(false);
    }
  }, [authError]);

  const handlePinComplete = async (value: string) => {
    if (isProcessing || isVerifyingPin) return;

    setError('');
    setIsProcessing(true);

    try {
      if (!hasPinSetup) {
        // Setting up new PIN
        if (!isConfirming) {
          setPin(value);
          setIsConfirming(true);
          setIsProcessing(false);
          return;
        }

        // Confirming PIN
        if (value !== pin) {
          setError('PINs do not match. Please try again.');
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
          setIsProcessing(false);
          return;
        }

        // PINs match, proceed with setup
        const success = await onSetupPin(value);
        if (!success) {
          setError('Failed to set up PIN. Please try again.');
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
        }
        setIsProcessing(false);
      } else {
        // Verifying existing PIN
        const success = await onVerifyPin(value);
        if (!success) {
          setPin('');
        }
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('PIN authentication error:', err);
      setError('An error occurred. Please try again.');
      setPin('');
      setConfirmPin('');
      setIsConfirming(false);
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your PIN? This will log you out and you will need to set up a new PIN.')) {
      onResetPin();
      setPin('');
      setConfirmPin('');
      setIsConfirming(false);
      setError('');
      toast.success('PIN has been reset');
    }
  };

  const handleBack = () => {
    setIsConfirming(false);
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const isLoading = isProcessing || isVerifyingPin;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <Card className="w-full max-w-md bg-white border border-gray-200 shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500 rounded-t-2xl border-b border-gray-200">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
            {isLoading ? (
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            ) : (
              <Lock className="h-10 w-10 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-2xl text-white font-bold">
            {!hasPinSetup
              ? isConfirming
                ? 'Confirm Your PIN'
                : 'Set Up Your PIN'
              : 'Enter Your PIN'}
          </CardTitle>
          <CardDescription className="font-semibold text-white">
            {!hasPinSetup
              ? isConfirming
                ? 'Re-enter your 4-digit PIN to confirm'
                : 'Create a 4-digit PIN to secure your account'
              : 'Enter your 4-digit PIN to access your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {error && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 shadow-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="font-semibold text-red-900">{error}</AlertDescription>
            </Alert>
          )}

          {isVerifyingPin && (
            <Alert className="bg-blue-50 border-blue-200 shadow-md">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-900 font-semibold">Verifying PIN...</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <InputOTP
              maxLength={4}
              value={isConfirming ? confirmPin : pin}
              onChange={isConfirming ? setConfirmPin : setPin}
              onComplete={handlePinComplete}
              disabled={isLoading}
            >
              <InputOTPGroup className="gap-3">
                <InputOTPSlot index={0} className="h-14 w-14 text-xl border-2 border-blue-300 rounded-xl shadow-md hover:border-blue-500 transition-all duration-200 bg-white text-gray-900 font-bold" />
                <InputOTPSlot index={1} className="h-14 w-14 text-xl border-2 border-blue-300 rounded-xl shadow-md hover:border-blue-500 transition-all duration-200 bg-white text-gray-900 font-bold" />
                <InputOTPSlot index={2} className="h-14 w-14 text-xl border-2 border-blue-300 rounded-xl shadow-md hover:border-blue-500 transition-all duration-200 bg-white text-gray-900 font-bold" />
                <InputOTPSlot index={3} className="h-14 w-14 text-xl border-2 border-blue-300 rounded-xl shadow-md hover:border-blue-500 transition-all duration-200 bg-white text-gray-900 font-bold" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {!hasPinSetup && isConfirming && (
            <Button
              variant="outline"
              className="w-full h-11 border-2 border-gray-300 hover:bg-gray-50 transition-all duration-200 font-semibold bg-white text-black hover:text-black hover:font-bold"
              onClick={handleBack}
              disabled={isLoading}
            >
              Back
            </Button>
          )}

          {hasPinSetup && (
            <Button
              variant="ghost"
              className="w-full text-sm text-black hover:text-black transition-all duration-200 font-semibold hover:bg-blue-50 hover:font-bold"
              onClick={handleReset}
              disabled={isLoading}
            >
              Forgot PIN? Reset
            </Button>
          )}

          <div className="text-center text-xs text-gray-700 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="h-3 w-3 text-blue-600" />
              <p className="font-bold text-gray-900">Secure & Private</p>
            </div>
            <p className="font-medium">Your PIN is stored securely and encrypted locally.</p>
            <p className="mt-1 font-medium">No internet connection required for authentication.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
