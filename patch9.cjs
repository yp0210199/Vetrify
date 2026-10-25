const fs = require('fs');
let code = fs.readFileSync('src/components/staff/StaffDetailsDrawer.tsx', 'utf8');

const oldInviteToken = `{isInvite && invitation && (
          <div className="p-4 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] space-y-3 text-xs">`;

const newInviteToken = `{isInvite && invitation && invitation.status === 'pending' && (
          <div className="p-4 bg-[#FFFBEB] rounded-2xl border border-[#FDE68A] space-y-3 text-xs">`;

code = code.replace(oldInviteToken, newInviteToken);

const oldRevokeButton = `<Button
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={isProcessing}
                onClick={handleRevokeInvite}
              >
                Revoke Invitation
              </Button>`;

const newRevokeButton = `{invitation.status === 'pending' && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={isProcessing}
                onClick={handleRevokeInvite}
              >
                Revoke Invitation
              </Button>
              )}`;

code = code.replace(oldRevokeButton, newRevokeButton);

fs.writeFileSync('src/components/staff/StaffDetailsDrawer.tsx', code);
