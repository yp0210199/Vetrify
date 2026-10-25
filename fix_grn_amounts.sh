sed -i '/const fullGrnPayload: Record<string, any> = {/i \
    const cgstAmount = formattedItems.reduce((acc, item) => acc + (item.cgstAmount || 0), 0);\
    const sgstAmount = formattedItems.reduce((acc, item) => acc + (item.sgstAmount || 0), 0);\
    const igstAmount = formattedItems.reduce((acc, item) => acc + (item.igstAmount || 0), 0);\
    const totalTax = taxTotal;\
' src/services/grnService.ts
