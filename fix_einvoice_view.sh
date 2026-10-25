sed -i 's/currentOrganization/organization/g' src/views/EInvoiceSettingsView.tsx
sed -i 's/currentUser/firestoreUser/g' src/views/EInvoiceSettingsView.tsx
sed -i '/import { Button } from/d' src/views/EInvoiceSettingsView.tsx
sed -i '/import { Input } from/d' src/views/EInvoiceSettingsView.tsx
sed -i '/import { Label } from/d' src/views/EInvoiceSettingsView.tsx
sed -i 's/<Button /<button className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500" /g' src/views/EInvoiceSettingsView.tsx
sed -i 's/<\/Button>/<\/button>/g' src/views/EInvoiceSettingsView.tsx
sed -i 's/<Input /<input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-50" /g' src/views/EInvoiceSettingsView.tsx
sed -i 's/<Label>/<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300">/g' src/views/EInvoiceSettingsView.tsx
sed -i 's/<\/Label>/<\/label>/g' src/views/EInvoiceSettingsView.tsx
