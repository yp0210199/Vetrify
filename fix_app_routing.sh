sed -i 's/<Route path="gst-settings" element={<EInvoiceSettingsView \/>} \/>//g' src/App.tsx

sed -i '/case '\''settings'\'':/i \
      case '\''gst_accounts'\'':\
        return <EInvoiceSettingsView />;\
' src/App.tsx

sed -i 's/{ id: '\''gst_accounts'\'', label: '\''GST & Accounts'\'', icon: '\''ReceiptText'\'', isFuture: true, phase: 2 },/{ id: '\''gst_accounts'\'', label: '\''GST & Accounts'\'', icon: '\''ReceiptText'\'' },/g' src/layouts/Sidebar.tsx
