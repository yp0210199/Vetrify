# Implementation Plan: Collections Aging, Tile Financial Analytics & E-Invoice Compliance Center

Build and deploy production-grade, zero-demo-data implementations for three unbuilt and incomplete modules in Vetrify ERP: **Collections & Receivables Aging**, **Analytics & Tile Financial Reports**, and **E-Invoice & GST Compliance Center**, fully responsive across mobile, tablet, and desktop devices for Tiles, Sanitaryware, Faucets, and Hardware dealers.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were clarified and confirmed during requirement alignment:
> - **Module Scope**: All 3 unbuilt modules will be built fully without placeholders or Phase 2 locks.
> - **Aging Calculation**: Invoice-level FIFO settlement into 4 statutory buckets: `0-30 days`, `31-60 days`, `61-90 days`, and `90+ days (Critical Overdue)`.
> - **Analytics Depth**: Tile Sq.Ft & Box metrics, Gross Margins, Fast vs Slow moving shades/slabs, and Architect referral commission analytics based strictly on live Firestore sales and ledger documents (zero mock/hardcoded numbers).

---

## 1. Overview & Core Concept

Currently, navigating to `Collections & Receivables Aging` or `Analytics & Tile Financial Reports` renders a static `FutureModuleView` ("Phase 2 Roadmap") banner, while `E-Invoice & GST Configuration` contains an incomplete form without sandbox testing or generation workflows.

This release replaces all placeholder screens with three fully functioning operational hubs:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      VETRIFY CORE OPERATIONS HUB                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  COLLECTIONS &   │       │ ANALYTICS & TILE │       │   E-INVOICE &    │
│ RECEIVABLES AGING│       │FINANCIAL REPORTS │       │  GST COMPLIANCE  │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│• FIFO Aging (4)  │       │• P&L Financials  │       │• IRP Credentials │
│• Multi-Receipt   │       │• Sq.Ft & Boxes   │       │• IRN & QR Code   │
│• Payment Remind  │       │• Shade Velocity  │       │• E-Way Dispatch  │
│• Statement (SOA) │       │• Architect ROI   │       │• HSN 6907 Export │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

1. **Collections & Receivables Aging (`/collections`)**:
   - Automated FIFO bucket assignment (`0-30`, `31-60`, `61-90`, `90+ days`) across builder and customer accounts.
   - Multi-mode payment receipt recording (`Cash`, `Cheque with bank/clearing`, `NEFT/RTGS with UTR`, `UPI with reference`).
   - WhatsApp & SMS-ready Site Payment Reminder generator with bank details and UPI pay link.
   - Statement of Accounts (SOA) builder with PDF print layout for project contractors.

2. **Analytics & Tile Financial Reports (`/reports`)**:
   - Profit & Loss overview: Live calculation of Showroom Turnover, Landed Cost of Goods Sold (COGS), Gross Margin %, and Freight/Handling recovery.
   - Tile Specific Metrics: Total Sq. Ft billed, Box throughput, fast vs non-moving shade lots, and broken box write-off tracking.
   - Architect & Designer Attribution: Commission accrued vs disbursed, sales volume driven per partner.
   - Tax Audit Summary: 1-click exportable HSN 6907/6910 GST summary for monthly return filing.

3. **E-Invoice & GST Compliance Center (`/gst_accounts`)**:
   - IRP Credentials & API Environment Management (NIC, ClearTax, Cygnet with live connectivity ping).
   - E-Invoice Generation Engine: Select B2B/Export invoice, compute payload, sign IRN (64-character hash), and preview statutory QR code.
   - E-Way Bill Vehicle Dispatch: Distance calculation, vehicle number recording, transporter ID assignment, and Part-A/Part-B slip generation.
   - HSN-wise Sales Tax Reconciliation with CSV/Print export.

---

## 2. User Experience & Visual Design

### Aesthetic Direction
- **Tone**: High-density, utilitarian trade workspace tailored to Indian building material dealerships.
- **Palette**: Slate-900 header accents, Emerald-600 (`#059669`) for positive collections/cashflow, Amber-500 (`#D97706`) for 31-60 day aging, Rose-600 (`#E11D48`) for 90+ day overdue, and Teal-700 (`#0D5C63`) for brand consistency.
- **Typography**: Clean tabular monospace (`font-mono`) for currency values (`₹`), HSN codes, UTR numbers, and IRN hashes; bold sans (`Inter`/`Plus Jakarta Sans`) for titles and metric labels.
- **Anti-AI Slop Enforcement**: Zero candy badges or floating decorative pills. Plain typographic tags with bullet separators (`·`), clean segmented tab controls, and clear tabular layout.

### Viewport Presence & Device Responsiveness
- **Desktop (>= 1024px)**: Full dual-column views; left summary KPI cards with right action panels; multi-column aging data tables with sticky header and horizontal scroll safeguards.
- **Tablet (768px - 1023px)**: 2x2 metric grids, collapsable filter drawers, and optimized column visibility.
- **Mobile (< 768px)**: Stacked card-based ledger rows, touch-friendly primary action buttons (min 44px height), full-screen bottom sheet modals for payment recording and IRN generation.

---

## 3. Key Architectural Decisions & Data Strategy

### Decision 1: Zero Demo Data Guarantee
- **Approach**: All numbers, aging cards, P&L calculations, and customer ledgers will derive exclusively from real Firestore collections:
  - `organizations/{orgId}/customers` (credit limits, current outstanding)
  - `organizations/{orgId}/customers/{customerId}/ledger` (individual debits, credits, running balance)
  - `organizations/{orgId}/invoices` (retail & wholesale invoices, line items, timestamps)
  - `organizations/{orgId}/wholesaleOrders` (B2B orders, dispatch status)
  - `organizations/{orgId}/einvoice_config` & `organizations/{orgId}/einvoices` (live IRP configurations & generated IRNs)
- **Zero-State Handling**: When an organization has zero sales or invoices, clean empty-state banners guide the cashier/manager to create their first invoice in POS or register a B2B customer, without displaying artificial dummy charts.

### Decision 2: Real-time FIFO Receivables Aging Engine
- **Approach**: Aging calculation runs on-the-fly or via cached ledger analysis:
  - For each customer with outstanding balance $> 0$, invoices with balance due are sorted chronologically (`oldest first`).
  - Unallocated payments are matched FIFO against unpaid bills.
  - The remaining unpaid balance of each invoice is categorized based on days elapsed since bill date:
    - `0 - 30 Days`: Current billing cycle (Normal Credit)
    - `31 - 60 Days`: Due soon (Payment follow-up recommended)
    - `61 - 90 Days`: Overdue (Credit hold advisory)
    - `90+ Days`: Critical overdue (Manager escalation required)

### Decision 3: Atomic Multi-Receipt Payment Recording
- **Approach**: When recording customer payment receipts (Cash, Cheque, NEFT/RTGS, UPI):
  - A Firestore transaction writes the new ledger entry into `organizations/{orgId}/customers/{customerId}/ledger/{entryId}`.
  - Decrements `currentOutstanding` on `organizations/{orgId}/customers/{customerId}`.
  - Records an audit log event (`payment.recorded`).
  - Automatically posts corresponding Journal Entry (`DEBIT Cash/Bank`, `CREDIT Accounts Receivable`).

---

## 4. Technical Architecture & File Layout

```
src/
├── views/
│   ├── CollectionsReceivablesView.tsx  <-- Brand new complete module
│   ├── TileAnalyticsReportsView.tsx     <-- Brand new complete module
│   ├── EInvoiceSettingsView.tsx         <-- Upgraded to full Compliance Center
│   └── PosView.tsx / WholesaleView.tsx  (Preserved & Integrated)
├── components/
│   ├── collections/
│   │   ├── AgingSummaryCards.tsx        <-- 0-30, 31-60, 61-90, 90+ buckets
│   │   ├── CustomerAgingTable.tsx       <-- Filterable table & search
│   │   ├── RecordPaymentModal.tsx       <-- Cash, Cheque, NEFT, UPI
│   │   ├── PaymentReminderDrawer.tsx    <-- WhatsApp/SMS text builder
│   │   └── StatementOfAccountModal.tsx  <-- Printable SOA statement
│   ├── analytics/
│   │   ├── ProfitAndLossSummary.tsx     <-- Revenue, COGS, Margins
│   │   ├── TileSqFtVelocityReport.tsx   <-- Sq.Ft & Box breakdown
│   │   ├── ShadeVelocityMatrix.tsx      <-- Fast/slow moving shade analysis
│   │   ├── ArchitectAttributionReport.tsx <-- Referral sales & commissions
│   │   └── GstTaxAuditReport.tsx        <-- HSN 6907 B2B/B2C audit
│   └── einvoice/
│       ├── EInvoiceConfigTab.tsx        <-- IRP credentials & environment
│       ├── IrnGenerationConsole.tsx     <-- B2B IRN generation & QR Code
│       ├── EWayBillConsole.tsx          <-- Transporter dispatch & Part-B
│       └── IrnHistoryTable.tsx          <-- Generated IRN audit log
├── services/
│   ├── collectionsService.ts            <-- Aging logic, FIFO allocation, SOA
│   ├── analyticsService.ts              <-- Financial metrics, Sq.Ft analytics
│   └── gstService.ts                    <-- Extended for IRN simulation & E-Way bills
└── types/
    ├── collections.ts                   <-- Aging buckets, payment receipts, SOA
    └── analytics.ts                     <-- Financial reports, velocity metrics
```

---

## 5. Step-by-Step Implementation Strategy

1. **Step 1: Data Types & Schemas**:
   - Define `AgingBucketItem`, `CustomerAgingSummary`, `PaymentReceiptPayload`, `StatementOfAccount` in `src/types/collections.ts`.
   - Define `TileFinancialSummary`, `TileSqFtReport`, `ShadeVelocityItem`, `ArchitectRoiSummary` in `src/types/analytics.ts`.
   - Extend `src/types/gst.ts` with IRN generation details, QR codes, and E-Way bill dispatch records.

2. **Step 2: Backend & Firestore Services**:
   - Implement `collectionsService.ts`: `calculateCustomerAging()`, `recordCustomerReceipt()`, `generateStatementOfAccount()`.
   - Implement `analyticsService.ts`: `getFinancialSummary()`, `getTileSqFtReport()`, `getShadeVelocity()`, `getArchitectReport()`.
   - Extend `gstService.ts`: `generateEInvoice()`, `cancelEInvoice()`, `generateEWayBill()`, `testIrpConnection()`.

3. **Step 3: Component Implementations**:
   - Build modular UI components for Collections (`AgingSummaryCards`, `CustomerAgingTable`, `RecordPaymentModal`, `StatementOfAccountModal`, `PaymentReminderDrawer`).
   - Build modular UI components for Analytics (`ProfitAndLossSummary`, `TileSqFtVelocityReport`, `ShadeVelocityMatrix`, `ArchitectAttributionReport`, `GstTaxAuditReport`).
   - Build E-Invoice Compliance Center tabs with real-time test connection and QR code visualizer.

4. **Step 4: Integration in App.tsx**:
   - Route `collections` to `<CollectionsReceivablesView />`.
   - Route `reports` to `<TileAnalyticsReportsView />`.
   - Update `gst_accounts` to upgraded `<EInvoiceSettingsView />`.
   - Remove placeholder locks from navigation and ensure full mobile responsiveness.

5. **Step 5: Verification & Zero-Bug Testing**:
   - Run `compile_applet` and `lint_applet` to ensure 0 build or typescript errors.
   - Verify zero-data states with helpful guidance banners.
   - Verify layout integrity across desktop, tablet, and mobile breakpoints.
