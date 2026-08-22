import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { usePreferences } from '@/state/PreferencesContext';
import { fonts, radius } from '@/theme/tokens';

/**
 * Quiet in-app toast, per the design: ink pill above the tab bar, auto
 * dismissed after ~2.3s. Used for confirmations ("Kupovina je vraćena.")
 * and soft errors instead of system alerts.
 */

interface ToastContextValue {
  showToast(message: string): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(''), 2300);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message !== '' && <ToastView message={message} />}
    </ToastContext.Provider>
  );
}

function ToastView({ message }: { message: string }) {
  const { tokens } = usePreferences();
  return (
    <View pointerEvents="none" style={styles.host}>
      <Animated.View
        entering={FadeInDown.duration(250)}
        exiting={FadeOut.duration(180)}
        style={[styles.toast, { backgroundColor: tokens.ctaBg }]}>
        <Text style={[styles.text, { color: tokens.ctaFg }]}>{message}</Text>
      </Animated.View>
    </View>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 112,
    alignItems: 'center',
    zIndex: 60,
  },
  toast: {
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.toast,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: 13,
    textAlign: 'center',
  },
});
