// Features logic (Agent invites, etc.)
function initAgentForm() {
  const form = document.getElementById('invite-agent-form');
  if (!form) return;
  
  // Remove existing listeners by cloning if necessary, or just attach
  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button.btn-primary') || form.querySelector('button[type="submit"]');
    const name = document.getElementById('agent-username').value.trim();
    const email = document.getElementById('agent-email').value.trim();
    if (!name || !email) { 
        if(typeof showToast === 'function') showToast('error', 'Error', 'Name and email required.'); 
        return; 
    }
    
    if (typeof setLoading === 'function') setLoading(btn, true);
    try {
      if (typeof apiInviteAgent === 'function') {
        await apiInviteAgent({ username: name, email });
        if (typeof closeModal === 'function') closeModal('modal-invite-agent');
        if (typeof showToast === 'function') showToast('success', 'Agent Invited', 'An invitation email has been sent to ' + email);
        
        // Refresh agents
        const data = await apiGetAgents();
        if (typeof S !== 'undefined') {
            S.agents = data || [];
        }
        if (typeof renderAgents === 'function') renderAgents();
      }
    } catch(err) {
      if (typeof showToast === 'function') showToast('error', 'Invite Failed', err.message);
    } finally {
      if (typeof setLoading === 'function') setLoading(btn, false);
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initAgentForm, 500);
});
