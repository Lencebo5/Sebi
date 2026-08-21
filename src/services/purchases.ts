import { Platform } from 'react-native';

import { REVENUECAT_API_KEYS } from '@/constants/appConfig';
import type { PlanOffering, SubscriptionPlan } from '@/models/types';
import { readJson, StorageKeys, writeJson } from '@/services/storage';

/**
 * Subscription abstraction. The app talks only to this interface;
 * behind it sits either RevenueCat (production) or a mock adapter
 * (development, Expo Go, tests). The mock is used automatically whenever
 * no RevenueCat API key is configured for the current platform.
 */
export interface PurchasesAdapter {
  /** Human-readable adapter name for debugging. */
  readonly name: string;
  initialize(): Promise<void>;
  isPremium(): Promise<boolean>;
  getOfferings(): Promise<PlanOffering[]>;
  /** Returns true when the entitlement is active after the purchase. */
  purchase(plan: SubscriptionPlan): Promise<boolean>;
  /** Returns true when an active entitlement was restored. */
  restore(): Promise<boolean>;
}

const ENTITLEMENT_ID = 'premium';

/** Mock adapter: local flag, fake localized prices, instant "purchases". */
class MockPurchases implements PurchasesAdapter {
  readonly name = 'mock';

  async initialize() {}

  async isPremium() {
    return readJson<boolean>(StorageKeys.mockPremium, false);
  }

  async getOfferings(): Promise<PlanOffering[]> {
    return [
      { plan: 'annual', priceString: '24,99 €', perMonthPriceString: '2,08 €' },
      { plan: 'monthly', priceString: '3,99 €' },
    ];
  }

  async purchase(_plan: SubscriptionPlan) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await writeJson(StorageKeys.mockPremium, true);
    return true;
  }

  async restore() {
    return this.isPremium();
  }
}

/** RevenueCat adapter. Loaded lazily so Expo Go never touches the native module. */
class RevenueCatPurchases implements PurchasesAdapter {
  readonly name = 'revenuecat';

  private async rc() {
    const module = await import('react-native-purchases');
    return module.default;
  }

  async initialize() {
    const Purchases = await this.rc();
    const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;
    Purchases.configure({ apiKey });
  }

  async isPremium() {
    const Purchases = await this.rc();
    const info = await Purchases.getCustomerInfo();
    return ENTITLEMENT_ID in info.entitlements.active;
  }

  async getOfferings(): Promise<PlanOffering[]> {
    const Purchases = await this.rc();
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return [];
    const result: PlanOffering[] = [];
    if (current.annual) {
      const product = current.annual.product;
      result.push({
        plan: 'annual',
        priceString: product.priceString,
        perMonthPriceString: product.pricePerMonthString ?? undefined,
      });
    }
    if (current.monthly) {
      result.push({ plan: 'monthly', priceString: current.monthly.product.priceString });
    }
    return result;
  }

  async purchase(plan: SubscriptionPlan) {
    const Purchases = await this.rc();
    const offerings = await Purchases.getOfferings();
    const pkg = plan === 'annual' ? offerings.current?.annual : offerings.current?.monthly;
    if (!pkg) throw new Error('Ponuda trenutno nije dostupna.');
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return ENTITLEMENT_ID in customerInfo.entitlements.active;
    } catch (error) {
      if ((error as { userCancelled?: boolean }).userCancelled) return false;
      throw error;
    }
  }

  async restore() {
    const Purchases = await this.rc();
    const info = await Purchases.restorePurchases();
    return ENTITLEMENT_ID in info.entitlements.active;
  }
}

function hasApiKey(): boolean {
  const key = Platform.OS === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;
  return key.length > 0 && Platform.OS !== 'web';
}

export function createPurchasesAdapter(): PurchasesAdapter {
  return hasApiKey() ? new RevenueCatPurchases() : new MockPurchases();
}
