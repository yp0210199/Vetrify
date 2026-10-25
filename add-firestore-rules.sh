sed -i '/match \/replenishmentSettings\/{settingId}/i \
      // -----------------------------------------------------------------------\
      // 2al. GST and Accounting Collections\
      // -----------------------------------------------------------------------\
      match /gstFilingPeriods/{periodId} {\
        allow read: if isStaffMember(orgId);\
        allow create, update: if isStaffMember(orgId) && request.resource.data.organizationId == orgId;\
        allow delete: if false;\
      }\
      match /gstLedgerEntries/{entryId} {\
        allow read: if isStaffMember(orgId);\
        allow create, update: if isStaffMember(orgId) && request.resource.data.organizationId == orgId;\
        allow delete: if false;\
      }\
      match /accounts/{accountId} {\
        allow read: if isStaffMember(orgId);\
        allow create, update: if isStaffMember(orgId) && request.resource.data.organizationId == orgId;\
        allow delete: if false;\
      }\
      match /journalEntries/{entryId} {\
        allow read: if isStaffMember(orgId);\
        allow create, update: if isStaffMember(orgId) && request.resource.data.organizationId == orgId;\
        allow delete: if false;\
      }\
      match /eInvoiceRecords/{recordId} {\
        allow read: if isStaffMember(orgId);\
        allow create, update: if isStaffMember(orgId) && request.resource.data.organizationId == orgId;\
        allow delete: if false;\
      }\
      match /eInvoiceConfiguration/{configId} {\
        allow read: if isStaffMember(orgId);\
        allow create, update: if isManagerOrAbove(orgId) && request.resource.data.organizationId == orgId;\
        allow delete: if false;\
      }\
' firestore.rules
