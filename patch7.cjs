const fs = require('fs');
let code = fs.readFileSync('src/views/settings/StaffManagementView.tsx', 'utf8');
code = code.replace(
  "inv.status === 'pending' || inv.status === 'expired'",
  "inv.status === 'pending' || inv.status === 'expired' || inv.status === 'revoked'"
);
fs.writeFileSync('src/views/settings/StaffManagementView.tsx', code);
