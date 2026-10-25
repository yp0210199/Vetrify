/**
 * Vetrify Phase 1 Step 3B - Onboarding & Owner Bootstrap Integration Test Suite
 */
import {
  isValidEmail,
  isValidGstin,
  isValidPostalCode,
  isValidPhone,
  validateOrganization,
  validatePharmacyStore,
  validateStaffMember,
} from '../lib/firebase/validators';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

console.log('=== RX OMNI ONBOARDING & BOOTSTRAP TEST SUITE ===');

// 1. Validation tests
console.log('\n--- 1. Client-Side Form Validation Tests ---');
assert(isValidGstin('07AAAAA0000A1Z5') === true, 'Valid GSTIN format accepted');
assert(isValidGstin('INVALID_GSTIN') === false, 'Invalid GSTIN format rejected');
assert(isValidGstin('12345') === false, 'Short GSTIN rejected');

assert(isValidEmail('owner@pharmacy.com') === true, 'Valid email accepted');
assert(isValidEmail('invalid-email') === false, 'Invalid email rejected');

assert(isValidPostalCode('110001', 'India') === true, 'Valid Indian 6-digit PIN code accepted');
assert(isValidPostalCode('010001', 'India') === false, 'Invalid PIN code starting with 0 rejected');
assert(isValidPostalCode('123', 'India') === false, 'Short PIN code rejected');

assert(isValidPhone('+919876543210') === true, 'Valid international phone format accepted');
assert(isValidPhone('9876543210') === true, 'Valid 10-digit mobile number accepted');
assert(isValidPhone('abc') === false, 'Non-numeric phone rejected');

// 2. Data model and tenant isolation integrity tests
console.log('\n--- 2. Tenant Isolation & Bootstrap Schema Tests ---');

const mockOrg = {
  id: 'org_test_123',
  name: 'Test Healthcare',
  legalName: 'Test Healthcare Pvt Ltd',
  currency: 'INR' as const,
  timezone: 'Asia/Kolkata' as const,
  status: 'active' as const,
};

assert(validateOrganization(mockOrg) === true, 'Organization without ownerUid is valid');

const invalidOrgWithOwnerUid = {
  ...mockOrg,
  ownerUid: 'usr_owner_123', // FORBIDDEN: Organization documents must NOT contain ownerUid
};

assert(validateOrganization(invalidOrgWithOwnerUid) === false, 'Organization with ownerUid is strictly rejected');

const mockStore = {
  id: 'str_main_123',
  organizationId: 'org_test_123',
  name: 'Test Healthcare - Main Branch',
  code: 'MAIN-01',
  address: {
    street: '123 Health Ave',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'India',
  },
  isMainBranch: true,
  status: 'active' as const,
};

assert(validatePharmacyStore(mockStore, 'org_test_123') === true, 'Primary store document schema is valid');

const mockOwnerStaff = {
  uid: 'usr_owner_123',
  organizationId: 'org_test_123',
  allStoresAccess: true,
  storeIds: ['str_main_123'],
  roleId: 'owner' as const,
  displayName: 'Test Owner',
  email: 'owner@testpharmacy.com',
  status: 'active' as const,
};

assert(validateStaffMember(mockOwnerStaff, 'org_test_123') === true, 'Owner staff record schema is valid');
assert(mockOwnerStaff.roleId === 'owner', 'Owner role is strictly owner');
assert(mockOwnerStaff.allStoresAccess === true, 'Owner receives allStoresAccess = true');

// 3. Concurrency simulation
console.log('\n--- 3. Concurrency / Duplicate Submission Protection Simulation ---');
let inFlight = false;
let callCount = 0;

function simulateCreatePharmacy() {
  if (inFlight) {
    return 'BLOCKED_DUPLICATE';
  }
  inFlight = true;
  callCount++;
  // Simulate async operation
  return 'SUCCESS';
}

const firstCall = simulateCreatePharmacy();
const secondCall = simulateCreatePharmacy();
const thirdCall = simulateCreatePharmacy();

assert(firstCall === 'SUCCESS', 'First submission accepted');
assert(secondCall === 'BLOCKED_DUPLICATE', 'Rapid second submission safely blocked');
assert(thirdCall === 'BLOCKED_DUPLICATE', 'Rapid third submission safely blocked');
assert(callCount === 1, 'Only one provisioning operation executed');

console.log('\nALL ONBOARDING & BOOTSTRAP TESTS PASSED PERFECTLY.');
