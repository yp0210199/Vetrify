import { PharmacyStore, StaffMember } from '../types/firestore';

export interface ResolvedStoreAccess {
  accessibleStores: PharmacyStore[];
  accessibleStoreIds: string[];
  canAccessAllStores: boolean;
  defaultStore: PharmacyStore | null;
  canAccessStore: (storeId: string) => boolean;
}

export const storeResolverService = {
  /**
   * Resolves store access for a staff member within an organization.
   * Guarantees that foreign or malformed store IDs cannot grant access.
   */
  resolveStoreAccess(
    orgId: string,
    staff: StaffMember,
    allOrgStores: PharmacyStore[],
    previousStoreIdPreference?: string | null
  ): ResolvedStoreAccess {
    // 1. Filter all organization stores to active status and matching organization ID
    const activeOrgStores = allOrgStores.filter(
      (store) => store.organizationId === orgId && store.status === 'active'
    );

    // 2. Determine accessible stores based on staff access model
    let accessibleStores: PharmacyStore[] = [];

    if (staff.allStoresAccess === true || staff.roleId === 'owner' || staff.roleId === 'admin') {
      accessibleStores = activeOrgStores;
    } else {
      const allowedSet = new Set(staff.storeIds || []);
      accessibleStores = activeOrgStores.filter((store) => allowedSet.has(store.id));
    }

    const accessibleStoreIds = accessibleStores.map((store) => store.id);
    const accessibleStoreIdSet = new Set(accessibleStoreIds);

    // 3. Deterministic default store selection
    let defaultStore: PharmacyStore | null = null;

    // Priority 1: Previously selected valid store preference if accessible
    if (previousStoreIdPreference && accessibleStoreIdSet.has(previousStoreIdPreference)) {
      defaultStore = accessibleStores.find((s) => s.id === previousStoreIdPreference) || null;
    }

    // Priority 2: Main branch store if accessible
    if (!defaultStore) {
      defaultStore = accessibleStores.find((s) => s.isMainBranch) || null;
    }

    // Priority 3: First accessible active store
    if (!defaultStore && accessibleStores.length > 0) {
      defaultStore = accessibleStores[0];
    }

    return {
      accessibleStores,
      accessibleStoreIds,
      canAccessAllStores: staff.allStoresAccess === true || staff.roleId === 'owner' || staff.roleId === 'admin',
      defaultStore,
      canAccessStore: (storeId: string) => accessibleStoreIdSet.has(storeId),
    };
  },
};
