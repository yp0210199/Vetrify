sed -i '/tx.set(ledgerDocRef, ledgerData);/a \
      // ---------------------------------------------------------\
      // GST Ledger & Accounting Integration (Phase 2 - Step 5)\
      // ---------------------------------------------------------\
      const financialYear = new Date().getMonth() >= 3 ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;\
      const taxPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '\''0'\'')}`;\
\
      if (totalTax > 0) {\
        const gstLedgerRef = doc(collection(db, '\''organizations'\'', organizationId, '\''gstLedgerEntries'\''));\
        tx.set(gstLedgerRef, {\
          id: gstLedgerRef.id,\
          organizationId,\
          storeId: payload.storeId,\
          financialYear,\
          taxPeriod,\
          sourceType: '\''PURCHASE'\'',\
          sourceId: grnId,\
          documentNumber: payload.supplierInvoiceNumber,\
          documentDate: Timestamp.fromDate(new Date(payload.supplierInvoiceDate)),\
          partyId: po.supplierId,\
          partyGSTIN: supplierData.gstin || null,\
          supplyType: '\''B2B'\'',\
          taxableValue: taxableAmount,\
          cgst: cgstAmount,\
          sgst: sgstAmount,\
          igst: igstAmount || 0,\
          cess: 0,\
          totalTax: totalTax,\
          inputOutputType: '\''INPUT'\'',\
          reverseCharge: false,\
          createdAt: serverTimestamp(),\
          createdBy: caller.uid,\
        });\
      }\
\
      const journalEntryRef = doc(collection(db, '\''organizations'\'', organizationId, '\''journalEntries'\''));\
      const lines = [];\
      lines.push({ accountId: '\''INVENTORY'\'', accountName: '\''Inventory'\'', debit: taxableAmount, credit: 0, description: `GRN #${grnNumber}` });\
      if (cgstAmount > 0) {\
        lines.push({ accountId: '\''INPUT_CGST'\'', accountName: '\''Input CGST'\'', debit: cgstAmount, credit: 0, description: `GRN #${grnNumber}` });\
      }\
      if (sgstAmount > 0) {\
        lines.push({ accountId: '\''INPUT_SGST'\'', accountName: '\''Input SGST'\'', debit: sgstAmount, credit: 0, description: `GRN #${grnNumber}` });\
      }\
      if (igstAmount && igstAmount > 0) {\
        lines.push({ accountId: '\''INPUT_IGST'\'', accountName: '\''Input IGST'\'', debit: igstAmount, credit: 0, description: `GRN #${grnNumber}` });\
      }\
      lines.push({ accountId: '\''PAYABLES'\'', accountName: '\''Accounts Payable'\'', debit: 0, credit: grandTotal, description: `Supplier Inv #${payload.supplierInvoiceNumber}` });\
      tx.set(journalEntryRef, {\
        id: journalEntryRef.id,\
        organizationId,\
        storeId: payload.storeId,\
        date: serverTimestamp(),\
        financialYear,\
        sourceType: '\''PURCHASE'\'',\
        sourceId: grnId,\
        documentNumber: grnNumber,\
        description: `Goods Receipt Note #${grnNumber}`,\
        lines,\
        totalAmount: grandTotal,\
        status: '\''POSTED'\'',\
        postedByUid: caller.uid,\
        createdAt: serverTimestamp(),\
        updatedAt: serverTimestamp(),\
      });' src/services/grnService.ts
