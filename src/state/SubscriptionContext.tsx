import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { PlanOffering, SubscriptionPlan } from '@/models/types';
import { track } from '@/services/analytics';
import { createPurchasesAdapter } from '@/services/purchases';
import { StorageKeys, writeJson } from '@/services/storage';
import { refreshSebiWidget } from '@/widgets/widget-refresh';

interface SubscriptionContextValue {
  ready: boolean;
  isPremium: boolean;
  offerings: PlanOffering[];
  /** 'mock' in dev mode, 'revenuecat' in production builds with keys. */
  adapterName: string;
  purchase(plan: SubscriptionPlan): Promise<boolean>;
  restore(): Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [adapter] = useState(createPurchasesAdapter);
  const [ready, setReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [offerings, setOfferings] = useState<PlanOffering[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await adapter.initialize();
        const [premium, plans] = await Promise.all([adapter.isPremium(), adapter.getOfferings()]);
        if (cancelled) return;
        setIsPremium(premium);
        setOfferings(plans);
        // The headless widget task can't query the store — cache entitlement.
        void writeJson(StorageKeys.premiumCache, premium);
      } catch (error) {
        if (__DEV__) console.warn('[purchases] init failed', error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const purchase = useCallback(async (plan: SubscriptionPlan) => {
    const active = await adapter.purchase(plan);
    if (active) {
      setIsPremium(true);
      track('subscription_started', { plan });
      void writeJson(StorageKeys.premiumCache, true);
      refreshSebiWidget('entitlement');
    }
    return active;
  }, [adapter]);

  const restore = useCallback(async () => {
    const active = await adapter.restore();
    if (active) {
      setIsPremium(true);
      track('subscription_restored');
      void writeJson(StorageKeys.premiumCache, true);
      refreshSebiWidget('entitlement');
    }
    return active;
  }, [adapter]);

  const value = useMemo(
    () => ({
      ready,
      isPremium,
      offerings,
      adapterName: adapter.name,
      purchase,
      restore,
    }),
    [ready, isPremium, offerings, adapter, purchase, restore],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextValue {
  const value = useContext(SubscriptionContext);
  if (!value) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return value;
}
