const fs = require('fs');
let code = fs.readFileSync('src/services/staffInvitationService.ts', 'utf8');

code = code.replace(
  /'staff\.invitation_removed'/g,
  "'staff.invitation_revoked'"
);

code = code.replace(
  /const data = docSnap\.data\(\);/g,
  "const data = docSnap.data() as any;"
);

fs.writeFileSync('src/services/staffInvitationService.ts', code);
