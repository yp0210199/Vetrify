import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { Role, Permission } from '../types/firestore';
import { validateRole, isValidPermission } from '../lib/firebase/validators';

export const roleService = {
  /**
   * Fetch a single role by ID
   */
  async getRole(orgId: string, roleId: string): Promise<Role | null> {
    if (!orgId || !roleId) return null;
    const db = getFirestoreDb();
    const roleDocRef = doc(db, 'organizations', orgId, 'roles', roleId);
    const snapshot = await getDoc(roleDocRef);
    if (!snapshot.exists()) return null;
    const data = snapshot.data();
    const role: Role = {
      id: snapshot.id,
      organizationId: orgId,
      name: data.name,
      description: data.description || '',
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
      isSystem: data.isSystem ?? false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    if (!validateRole(role, orgId)) {
      console.warn(`Role validation warning for ID: ${roleId}`);
    }
    return role;
  },

  /**
   * Fetch all roles for an organization
   */
  async getRoles(orgId: string): Promise<Role[]> {
    if (!orgId) return [];
    const db = getFirestoreDb();
    const rolesCollRef = collection(db, 'organizations', orgId, 'roles');
    const snapshot = await getDocs(rolesCollRef);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        organizationId: orgId,
        name: data.name,
        description: data.description || '',
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        isSystem: data.isSystem ?? false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });
  },

  /**
   * Create a new custom role (Operational permission bundle only)
   * Note: Custom roles can NEVER escalate to system Owner or Admin.
   */
  async createCustomRole(
    orgId: string,
    params: {
      id?: string;
      name: string;
      description?: string;
      permissions: Permission[];
    }
  ): Promise<Role> {
    const db = getFirestoreDb();
    const roleId =
      params.id?.trim() || `role_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const roleDocRef = doc(db, 'organizations', orgId, 'roles', roleId);

    // Validate all permissions
    const validPermissions = params.permissions.filter(isValidPermission);

    const roleData = {
      id: roleId,
      organizationId: orgId,
      name: params.name.trim(),
      description: params.description?.trim() || '',
      permissions: validPermissions,
      isSystem: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(roleDocRef, roleData);
    return { ...roleData, createdAt: undefined, updatedAt: undefined } as any;
  },

  /**
   * Update an existing custom role
   */
  async updateCustomRole(
    orgId: string,
    roleId: string,
    params: {
      name?: string;
      description?: string;
      permissions?: Permission[];
    }
  ): Promise<void> {
    const db = getFirestoreDb();
    const roleDocRef = doc(db, 'organizations', orgId, 'roles', roleId);

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (params.name) updatePayload.name = params.name.trim();
    if (params.description !== undefined) updatePayload.description = params.description.trim();
    if (params.permissions) {
      updatePayload.permissions = params.permissions.filter(isValidPermission);
    }

    await updateDoc(roleDocRef, updatePayload);
  },

  /**
   * Delete a custom role (Only non-system roles)
   */
  async deleteCustomRole(orgId: string, roleId: string): Promise<void> {
    const db = getFirestoreDb();
    const roleDocRef = doc(db, 'organizations', orgId, 'roles', roleId);
    const snapshot = await getDoc(roleDocRef);
    if (snapshot.exists() && snapshot.data().isSystem === true) {
      throw new Error('System roles cannot be deleted.');
    }
    await deleteDoc(roleDocRef);
  },
};
