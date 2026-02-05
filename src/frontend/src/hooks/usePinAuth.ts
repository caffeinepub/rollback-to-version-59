import { useState, useEffect } from 'react';

const PIN_HASH_KEY = 'store_manager_pin_hash';
const PIN_SETUP_COMPLETE_KEY = 'store_manager_pin_setup_complete';
const SESSION_AUTH_KEY = 'store_manager_session_authenticated';

// Simple hash function for PIN storage
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function usePinAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasPinSetup, setHasPinSetup] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    const setupComplete = localStorage.getItem(PIN_SETUP_COMPLETE_KEY);
    const sessionAuth = sessionStorage.getItem(SESSION_AUTH_KEY);
    
    setHasPinSetup(!!storedHash && setupComplete === 'true');
    
    // If we have a valid session, restore authentication
    if (sessionAuth === 'true' && storedHash && setupComplete === 'true') {
      setIsAuthenticated(true);
    }
    
    setIsInitializing(false);
  }, []);

  const setupPin = async (pin: string): Promise<boolean> => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setAuthError('PIN must be exactly 4 digits');
      return false;
    }
    
    setAuthError(null);
    setIsVerifyingPin(true);
    
    try {
      // Save PIN hash locally
      const hash = await hashPin(pin);
      localStorage.setItem(PIN_HASH_KEY, hash);
      localStorage.setItem(PIN_SETUP_COMPLETE_KEY, 'true');
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      
      setHasPinSetup(true);
      setIsAuthenticated(true);
      setIsVerifyingPin(false);
      setAuthError(null);
      return true;
    } catch (error: any) {
      console.error('Failed to set up PIN:', error);
      setAuthError('Failed to set up PIN. Please try again.');
      setIsVerifyingPin(false);
      return false;
    }
  };

  const verifyPin = async (pin: string): Promise<boolean> => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setAuthError('PIN must be exactly 4 digits');
      return false;
    }
    
    const storedHash = localStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) {
      setAuthError('No PIN found. Please reset and set up a new PIN.');
      return false;
    }
    
    setAuthError(null);
    setIsVerifyingPin(true);
    
    try {
      const hash = await hashPin(pin);
      const isValid = hash === storedHash;
      
      if (!isValid) {
        setAuthError('Incorrect PIN. Please try again.');
        setIsVerifyingPin(false);
        return false;
      }
      
      // PIN is valid, authenticate locally
      sessionStorage.setItem(SESSION_AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setIsVerifyingPin(false);
      setAuthError(null);
      return true;
    } catch (error: any) {
      console.error('PIN verification error:', error);
      setAuthError('An error occurred. Please try again.');
      setIsVerifyingPin(false);
      return false;
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
  };

  const resetPin = async () => {
    localStorage.removeItem(PIN_HASH_KEY);
    localStorage.removeItem(PIN_SETUP_COMPLETE_KEY);
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    setHasPinSetup(false);
    setIsAuthenticated(false);
    setIsVerifyingPin(false);
    setAuthError(null);
  };

  return {
    isAuthenticated,
    isInitializing,
    hasPinSetup,
    setupPin,
    verifyPin,
    logout,
    resetPin,
    isVerifyingPin,
    authError,
  };
}
