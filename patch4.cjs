const fs = require('fs');
let code = fs.readFileSync('src/components/staff/StaffDetailsDrawer.tsx', 'utf8');

const target = `
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={isProcessing}
                onClick={handleRevokeInvite}
              >
                Revoke Invitation
              </Button>
            </div>
          )}
`;

const replacement = `
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                disabled={isProcessing}
                onClick={handleRevokeInvite}
              >
                Revoke Invitation
              </Button>
              {invitation.status !== 'accepted' && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Trash2}
                  disabled={isProcessing}
                  onClick={handleDeleteInvite}
                  className="text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FCA5A5]"
                >
                  Remove Invitation
                </Button>
              )}
            </div>
          )}
`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/staff/StaffDetailsDrawer.tsx', code);
