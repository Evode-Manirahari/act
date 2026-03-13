import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface NetworkStatus {
  isOnline: boolean;
  isSyncing: boolean;
  setIsSyncing: (v: boolean) => void;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? true);
    });

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? true);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isSyncing, setIsSyncing };
}
