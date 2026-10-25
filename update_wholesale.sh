sed -i '/tx.set(invRef, invoiceData);/a \
      // ---------------------------------------------------------\
      // GST Ledger & Accounting Integration (Phase 2 - Step 5)\
      // ---------------------------------------------------------\
      const financialYear = new Date().getMonth() >= 3 ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;\
      const taxPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '\''0'\'')}`;\
\
      if (order.totalTax > 0) {\
        const gstLedgerRef = doc(collection(db, '\''organizations'\'', orgId, '\''gstLedgerEntries'\''));\
        tx.set(gstLedgerRef, {\
          id: gstLedgerRef.id,\
          organizationId: orgId,\
          storeId,\
          financialYear,\
          taxPeriod,\
          sourceType: '\''WHOLESALE_SALE'\'',\
          sourceId: invoiceId,\
          documentNumber: invoiceNumber,\
          documentDate: serverTimestamp(),\
          partyId: order.customerId || null,\
          partyGSTIN: null,\
          supplyType: '\''B2B'\'',\
          taxableValue: order.taxableAmount,\
          cgst: order.cgstTotal,\
          sgst: order.sgstTotal,\
          igst: order.igstTotal || 0,\
          cess: 0,\
          totalTax: order.totalTax,\
          inputOutputType: '\''OUTPUT'\'',\
          reverseCharge: false,\
          createdAt: serverTimestamp(),\
          createdBy: caller.uid,\
        });\
      }\
\
      const journalEntryRef = doc(collection(db, '\''organizations'\'', orgId, '\''journalEntries'\''));\
      const lines = [];\
      if (paymentMode === '\''credit'\'') {\
        lines.push({ accountId: '\''ACCOUNTS_RECEIVABLE'\'', accountName: '\''Accounts Receivable'\'', debit: order.grandTotal, credit: 0, description: `Wholesale Invoice #${invoiceNumber}` });\
      } else {\
        lines.push({ accountId: '\''CASH'\'', accountName: '\''Cash'\'', debit: order.grandTotal, credit: 0, description: `Wholesale Invoice #${invoiceNumber}` });\
      }\
      lines.push({ accountId: '\''SALES'\'', accountName: '\''Sales Revenue'\'', debit: 0, credit: order.taxableAmount, description: `Wholesale Invoice #${invoiceNumber}` });\
      if (order.cgstTotal > 0) {\
        lines.push({ accountId: '\''OUTPUT_CGST'\'', accountName: '\''Output CGST'\'', debit: 0, credit: order.cgstTotal, description: `Wholesale Invoice #${invoiceNumber}` });\
      }\
      if (order.sgstTotal > 0) {\
        lines.push({ accountId: '\''OUTPUT_SGST'\'', accountName: '\''Output SGST'\'', debit: 0, credit: order.sgstTotal, description: `Wholesale Invoice #${invoiceNumber}` });\
      }\
      if (order.igstTotal && order.igstTotal > 0) {\
        lines.push({ accountId: '\''OUTPUT_IGST'\'', accountName: '\''Output IGST'\'', debit: 0, credit: order.igstTotal, description: `Wholesale Invoice #${invoiceNumber}` });\
      }\
      tx.set(journalEntryRef, {\
        id: journalEntryRef.id,\
        organizationId: orgId,\
        storeId,\
        date: serverTimestamp(),\
        financialYear,\
        sourceType: '\''WHOLESALE_SALE'\'',\
        sourceId: invoiceId,\
        documentNumber: invoiceNumber,\
        description: `Wholesale B2B Sale #${invoiceNumber}`,\
        lines,\
        totalAmount: order.grandTotal,\
        status: '\''POSTED'\'',\
        postedByUid: caller.uid,\
        createdAt: serverTimestamp(),\
        updatedAt: serverTimestamp(),\
      });' src/services/wholesaleService.ts
