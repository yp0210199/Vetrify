sed -i '/import { WholesaleOrdersView } from '\''\.\/views\/WholesaleOrdersView'\'';/a \
import { EInvoiceSettingsView } from '\''./views/EInvoiceSettingsView'\'';\
' src/App.tsx

sed -i '/<Route path="wholesale" element={<WholesaleOrdersView \/>} \/>/a \
          <Route path="gst-settings" element={<EInvoiceSettingsView />} />\
' src/App.tsx
