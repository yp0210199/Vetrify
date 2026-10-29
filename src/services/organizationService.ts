import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import {
  Organization,
  PharmacyStore,
  StaffMember,
} from '../types/firestore';
import {
  validateOrganization,
  validatePharmacyStore,
  validateStaffMember,
} from '../lib/firebase/validators';

export const organizationService = {
  /**
   * Fetch organization details
   */
  async getOrganization(orgId: string): Promise<Organization | null> {
    if (!orgId) return null;
    const db = getFirestoreDb();
    const orgDocRef = doc(db, 'organizations', orgId);
    const snapshot = await getDoc(orgDocRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    const org: Organization = {
      id: snapshot.id,
      name: data.name,
      legalName: data.legalName,
      gstin: data.gstin,
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      status: data.status || 'active',
      settings: data.settings,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    if (!validateOrganization(org)) {
      console.warn(`Organization validation warning for ID: ${orgId}`);
    }
    return org;
  },

  /**
   * Provision a new business organization, primary showroom/godown, and owner staff record atomically.
   * Note: The Organization document explicitly does NOT contain ownerUid.
   * The owner is represented exclusively through /organizations/{orgId}/staff/{ownerUid} with roleId: 'owner'.
   */
  async createOrganization(params: {
    orgName: string;
    legalName?: string;
    gstin?: string;
    drugLicenseNumber?: string;
    ownerUid: string;
    ownerEmail: string;
    ownerName: string;
    mainStoreName: string;
    mainStoreCode?: string;
    phone?: string;
    email?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }): Promise<{ organization: Organization; store: PharmacyStore; staff: StaffMember }> {
    const db = getFirestoreDb();
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storeId = `str_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Prepare batch write
    const batch = writeBatch(db);

    // 1. Create Organization Document (No ownerUid field)
    const orgDocRef = doc(db, 'organizations', orgId);
    const orgData = {
      id: orgId,
      name: params.orgName.trim(),
      legalName: params.legalName?.trim() || params.orgName.trim(),
      gstin: params.gstin?.trim() || '',
      drugLicenseNumber: params.drugLicenseNumber?.trim() || '',
      currency: 'INR' as const,
      timezone: 'Asia/Kolkata' as const,
      status: 'active' as const,
      settings: {
        fefoStrictEnforcement: true,
        scheduleHAutoRegister: true,
        taxInclusivePricing: false,
        autoReorderTriggers: true,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(orgDocRef, orgData);

    // 2. Create Primary Store Document
    const storeDocRef = doc(db, 'organizations', orgId, 'stores', storeId);
    const storeData = {
      id: storeId,
      organizationId: orgId,
      name: params.mainStoreName.trim(),
      code: params.mainStoreCode?.trim().toUpperCase() || 'MAIN-01',
      address: {
        street: params.street?.trim() || '',
        city: params.city?.trim() || '',
        state: params.state?.trim() || '',
        postalCode: params.postalCode?.trim() || '',
        country: params.country?.trim() || 'India',
      },
      phone: params.phone?.trim() || '',
      email: params.email?.trim() || '',
      drugLicenseNumber: params.drugLicenseNumber?.trim() || '',
      gstin: params.gstin?.trim() || '',
      isMainBranch: true,
      status: 'active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(storeDocRef, storeData);

    // 3. Create Owner Staff Record (Single Source of Truth for Ownership)
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', params.ownerUid);
    const staffData = {
      uid: params.ownerUid,
      organizationId: orgId,
      allStoresAccess: true,
      storeIds: [storeId],
      roleId: 'owner' as const,
      displayName: params.ownerName || params.ownerEmail.split('@')[0],
      email: params.ownerEmail,
      phone: params.phone?.trim() || '',
      status: 'active' as const,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(staffDocRef, staffData);

    // 4. Update UI workspace hint on root user (Zero authorization authority)
    const userDocRef = doc(db, 'users', params.ownerUid);
    batch.set(
      userDocRef,
      {
        uid: params.ownerUid,
        email: params.ownerEmail,
        displayName: params.ownerName,
        primaryOrganizationId: orgId,
        status: 'active',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Commit atomic batch
    await batch.commit();

    return {
      organization: { ...orgData, createdAt: undefined, updatedAt: undefined } as any,
      store: { ...storeData, createdAt: undefined, updatedAt: undefined } as any,
      staff: { ...staffData, joinedAt: undefined, updatedAt: undefined } as any,
    };
  },

  /**
   * Fetch all stores for an organization
   */
  async getStores(orgId: string): Promise<PharmacyStore[]> {
    if (!orgId) return [];
    const db = getFirestoreDb();
    const storesCollRef = collection(db, 'organizations', orgId, 'stores');
    const snapshot = await getDocs(storesCollRef);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const store: PharmacyStore = {
        id: docSnap.id,
        organizationId: orgId,
        name: data.name,
        code: data.code,
        address: data.address,
        phone: data.phone,
        email: data.email,
        gstin: data.gstin,
        isMainBranch: data.isMainBranch ?? false,
        status: data.status || 'active',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      if (!validatePharmacyStore(store, orgId)) {
        console.warn(`Store document validation warning for ID: ${docSnap.id}`);
      }
      return store;
    });
  },

  /**
   * Fetch staff record for a specific user
   */
  async getStaffRecord(orgId: string, uid: string): Promise<StaffMember | null> {
    if (!orgId || !uid) return null;
    const db = getFirestoreDb();
    const staffDocRef = doc(db, 'organizations', orgId, 'staff', uid);
    const snapshot = await getDoc(staffDocRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    const staff: StaffMember = {
      uid: snapshot.id,
      organizationId: orgId,
      allStoresAccess: data.allStoresAccess ?? (data.roleId === 'owner' || data.roleId === 'admin'),
      storeIds: Array.isArray(data.storeIds) ? data.storeIds : [],
      roleId: data.roleId || 'staff',
      employeeId: data.employeeId,
      displayName: data.displayName || '',
      email: data.email || '',
      phone: data.phone,
      status: data.status || 'active',
      joinedAt: data.joinedAt,
      updatedAt: data.updatedAt,
    };
    if (!validateStaffMember(staff, orgId)) {
      console.warn(`Staff document validation warning for UID: ${uid}`);
    }
    return staff;
  },

  /**
   * Fetch all staff members for an organization
   */
  async getStaffMembers(orgId: string): Promise<StaffMember[]> {
    if (!orgId) return [];
    const db = getFirestoreDb();
    const staffCollRef = collection(db, 'organizations', orgId, 'staff');
    const snapshot = await getDocs(staffCollRef);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      const staff: StaffMember = {
        uid: docSnap.id,
        organizationId: orgId,
        allStoresAccess: data.allStoresAccess ?? (data.roleId === 'owner' || data.roleId === 'admin'),
        storeIds: Array.isArray(data.storeIds) ? data.storeIds : [],
        roleId: data.roleId || 'staff',
        employeeId: data.employeeId,
        displayName: data.displayName || '',
        email: data.email || '',
        phone: data.phone,
        status: data.status || 'active',
        joinedAt: data.joinedAt,
        updatedAt: data.updatedAt,
      };
      return staff;
    });
  },

  /**
   * Update organization details and operational settings
   */
  async updateOrganization(
    orgId: string,
    params: {
      name?: string;
      legalName?: string;
      gstin?: string;
      drugLicenseNumber?: string;
      settings?: Partial<Organization['settings']>;
    },
    actor?: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<void> {
    if (!orgId) throw new Error('Organization ID is required');
    const db = getFirestoreDb();
    const orgDocRef = doc(db, 'organizations', orgId);

    const updatePayload: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (params.name !== undefined) updatePayload.name = params.name.trim();
    if (params.legalName !== undefined) updatePayload.legalName = params.legalName.trim();
    if (params.gstin !== undefined) updatePayload.gstin = params.gstin.trim();
    if (params.drugLicenseNumber !== undefined) updatePayload.drugLicenseNumber = params.drugLicenseNumber.trim();

    if (params.settings) {
      const currentOrg = await organizationService.getOrganization(orgId);
      updatePayload.settings = {
        ...(currentOrg?.settings || {}),
        ...params.settings,
      };
    }

    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(orgDocRef, updatePayload);

    // Audit event logging
    if (actor) {
      const { logAuditEvent } = await import('./auditService');
      await logAuditEvent(orgId, {
        storeId: null,
        actorUid: actor.uid,
        actorEmail: actor.email || null,
        actorDisplayName: actor.displayName || null,
        action: 'organization.updated',
        entityType: 'organization',
        entityId: orgId,
        metadata: {
          updatedFields: Object.keys(params),
          settingsUpdated: !!params.settings,
        },
      });
    }
  },
};
