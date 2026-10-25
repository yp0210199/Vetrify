const fs = require('fs');
let code = fs.readFileSync('src/components/staff/StaffDetailsDrawer.tsx', 'utf8');
code = code.replace(
  'onStaffStatusChanged();\n    } catch (err: any) {',
  'onStaffStatusChanged();\n      onClose();\n    } catch (err: any) {'
);
fs.writeFileSync('src/components/staff/StaffDetailsDrawer.tsx', code);
