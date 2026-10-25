sed -i '/transaction.set(invoiceRef, sanitizeFirestorePayload(invoicePayload));/a \
      // ---------------------------------------------------------\
      // GST Ledger & Accounting Integration (Phase 2 - Step 5)\
      // ---------------------------------------------------------\
      const financialYear = new Date().getMonth() >= 3 ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;\
      const taxPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '\''0'\'')}`;\
\
      if (summary.totalTax > 0) {\
        const gstLedgerRef = doc(collection(db, '\''organizations'\'', organizationId, '\''gstLedgerEntries'\''));\
        transaction.set(gstLedgerRef, {\
          id: gstLedgerRef.id,\
          organizationId,\
          storeId,\
          financialYear,\
          taxPeriod,\
          sourceType: '\''RETAIL_SALE'\'',\
          sourceId: invoiceId,\
          documentNumber: invoiceNumber,\
          documentDate: serverTimestamp(),\
          partyId: customerId || null,\
          partyGSTIN: null,\
          supplyType: '\''B2C'\'',\
          taxableValue: summary.taxableAmount,\
          cgst: summary.cgstAmount,\
          sgst: summary.sgstAmount,\
          igst: 0,\
          cess: 0,\
          totalTax: summary.totalTax,\
          inputOutputType: '\''OUTPUT'\'',\
          reverseCharge: false,\
          createdAt: serverTimestamp(),\
          createdBy: caller.uid,\
        });\
      }\
\
      const journalEntryRef = doc(collection(db, '\''organizations'\'', organizationId, '\''journalEntries'\''));\
      const lines = [];\
      if (paymentMode === '\''credit'\'') {\
        lines.push({ accountId: '\''ACCOUNTS_RECEIVABLE'\'', accountName: '\''Accounts Receivable'\'', debit: summary.grandTotal, credit: 0, description: `Invoice #${invoiceNumber}` });\
      } else {\
        lines.push({ accountId: '\''CASH'\'', accountName: '\''Cash'\'', debit: summary.grandTotal, credit: 0, description: `Invoice #${invoiceNumber}` });\
      }\
      lines.push({ accountId: '\''SALES'\'', accountName: '\''Sales Revenue'\'', debit: 0, credit: summary.taxableAmount, description: `Invoice #${invoiceNumber}` });\
      if (summary.cgstAmount > 0) {\
        lines.push({ accountId: '\''OUTPUT_CGST'\'', accountName: '\''Output CGST'\'', debit: 0, credit: summary.cgstAmount, description: `Invoice #${invoiceNumber}` });\
      }\
      if (summary.sgstAmount > 0) {\
        lines.push({ accountId: '\''OUTPUT_SGST'\'', accountName: '\''Output SGST'\'', debit: 0, credit: summary.sgstAmount, description: `Invoice #${invoiceNumber}` });\
      }\
      transaction.set(journalEntryRef, {\
        id: journalEntryRef.id,\
        organizationId,\
        storeId,\
        date: serverTimestamp(),\
        financialYear,\
        sourceType: '\''RETAIL_SALE'\'',\
        sourceId: invoiceId,\
        documentNumber: invoiceNumber,\
        description: `Retail POS Sale #${invoiceNumber}`,\
        lines,\
        totalAmount: summary.grandTotal,\
        status: '\''POSTED'\'',\
        postedByUid: caller.uid,\
        createdAt: serverTimestamp(),\
        updatedAt: serverTimestamp(),\
      });' src/services/posService.ts
