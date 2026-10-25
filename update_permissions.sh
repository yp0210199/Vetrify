sed -i '/export type ReplenishmentPermission =/i \
export type GstPermission =\
  | "gst.view"\
  | "gst.export"\
  | "gst.prepare"\
  | "gst.reconcile"\
  | "gst.lock_period"\
  | "gst.manage_configuration";\
\
export type AccountingPermission =\
  | "accounting.view"\
  | "accounting.post"\
  | "accounting.adjust";\
\
export type EInvoicePermission =\
  | "einvoice.generate"\
  | "einvoice.cancel";\
' src/types/firestore.ts
