// Transfers page functionality

// Sample recipients data (in a real app, this would come from an API)
const sampleRecipients = [
  { id: 1, name: "Alice Smith", accountNumber: "4587******9012", bank: "Chase Bank", recentTransfer: true },
  { id: 2, name: "Bob Johnson", accountNumber: "3256******7891", bank: "Bank of America", recentTransfer: true },
  { id: 3, name: "Carol Williams", accountNumber: "7812******3456", bank: "Wells Fargo", recentTransfer: true },
  { id: 4, name: "David Brown", accountNumber: "9145******6789", bank: "Citibank", recentTransfer: false },
  { id: 5, name: "Emma Davis", accountNumber: "6234******1234", bank: "TD Bank", recentTransfer: false }
];

// Function to initialize transfers page
function initializeTransfersPage() {
  const currentUser = localStorage.getItem('currentUser');
  
  if (!currentUser) {
    window.location.href = '/login';
    return;
  }
  
  // Load recent recipients
  loadRecentRecipients();
  
  // Initialize transfer form
  initializeTransferForm();
  
  // Load all recipients for recipient selector
  loadRecipientOptions();
}

// Function to load recent recipients
function loadRecentRecipients() {
  const recentRecipientsContainer = document.getElementById('recentRecipients');
  
  if (!recentRecipientsContainer) return;
  
  const recentRecipients = sampleRecipients.filter(recipient => recipient.recentTransfer);
  
  if (recentRecipients.length === 0) {
    recentRecipientsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users empty-state-icon"></i>
        <p>No recent recipients</p>
      </div>
    `;
    return;
  }
  
  recentRecipientsContainer.innerHTML = '';
  
  recentRecipients.forEach(recipient => {
    const recipientElement = document.createElement('div');
    recipientElement.className = 'recent-recipient';
    recipientElement.setAttribute('data-recipient-id', recipient.id);
    
    const initials = recipient.name.split(' ').map(name => name[0]).join('');
    
    recipientElement.innerHTML = `
      <div class="recipient-avatar">${initials}</div>
      <span>${recipient.name}</span>
      <small class="text-muted">${recipient.bank}</small>
    `;
    
    recipientElement.addEventListener('click', function() {
      const recipientId = this.getAttribute('data-recipient-id');
      selectRecipient(recipientId);
    });
    
    recentRecipientsContainer.appendChild(recipientElement);
  });
}

// Function to load recipient options
function loadRecipientOptions() {
  const recipientSelect = document.getElementById('recipientSelect');
  
  if (!recipientSelect) return;
  
  recipientSelect.innerHTML = '<option value="">Select a recipient</option>';
  
  sampleRecipients.forEach(recipient => {
    const option = document.createElement('option');
    option.value = recipient.id;
    option.textContent = `${recipient.name} - ${recipient.bank}`;
    recipientSelect.appendChild(option);
  });
}

// Function to select a recipient
function selectRecipient(recipientId) {
  const recipientSelect = document.getElementById('recipientSelect');
  
  if (recipientSelect) {
    recipientSelect.value = recipientId;
    
    // Trigger change event to update form
    const event = new Event('change');
    recipientSelect.dispatchEvent(event);
  }
}

// Function to initialize transfer form
function initializeTransferForm() {
  const transferForm = document.getElementById('transferForm');
  const recipientSelect = document.getElementById('recipientSelect');
  const transferAmount = document.getElementById('transferAmount');
  const transferDescription = document.getElementById('transferDescription');
  const recipientDetails = document.getElementById('recipientDetails');
  const transferErrorMsg = document.getElementById('transferErrorMsg');
  const transferSuccessMsg = document.getElementById('transferSuccessMsg');
  
  if (!transferForm) return;
  
  // Show recipient details when recipient is selected
  if (recipientSelect) {
    recipientSelect.addEventListener('change', function() {
      const recipientId = this.value;
      
      if (!recipientId) {
        if (recipientDetails) {
          recipientDetails.innerHTML = '';
        }
        return;
      }
      
      const recipient = sampleRecipients.find(r => r.id == recipientId);
      
      if (recipient && recipientDetails) {
        recipientDetails.innerHTML = `
          <div class="card mt-3">
            <div class="card-body">
              <h5 class="card-title">${recipient.name}</h5>
              <p class="card-text">
                <strong>Bank:</strong> ${recipient.bank}<br>
                <strong>Account:</strong> ${recipient.accountNumber}
              </p>
            </div>
          </div>
        `;
      }
    });
  }
  
  // Handle transfer form submission
  transferForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Reset messages
    if (transferErrorMsg) {
      transferErrorMsg.style.display = 'none';
    }
    
    if (transferSuccessMsg) {
      transferSuccessMsg.style.display = 'none';
    }
    
    // Validate recipient
    if (!recipientSelect.value) {
      showTransferError('Please select a recipient');
      return;
    }
    
    // Validate amount
    if (!transferAmount.value || isNaN(transferAmount.value) || parseFloat(transferAmount.value) <= 0) {
      showTransferError('Please enter a valid amount');
      return;
    }
    
    // Get recipient information
    const recipientId = recipientSelect.value;
    const recipient = sampleRecipients.find(r => r.id == recipientId);
    
    // In a real app, this would send a request to the server to process the transfer
    
    // Show success message
    if (transferSuccessMsg) {
      transferSuccessMsg.innerHTML = `
        <i class="fas fa-check-circle"></i> 
        Successfully transferred ${formatCurrency(transferAmount.value)} to ${recipient.name}
      `;
      transferSuccessMsg.style.display = 'block';
    }
    
    // Reset form
    transferForm.reset();
    if (recipientDetails) {
      recipientDetails.innerHTML = '';
    }
    
    // Clear success message after 5 seconds
    setTimeout(() => {
      if (transferSuccessMsg) {
        transferSuccessMsg.style.display = 'none';
      }
    }, 5000);
  });
  
  // Function to show transfer error
  function showTransferError(message) {
    if (transferErrorMsg) {
      transferErrorMsg.textContent = message;
      transferErrorMsg.style.display = 'block';
      
      // Hide error after 3 seconds
      setTimeout(() => {
        transferErrorMsg.style.display = 'none';
      }, 3000);
    }
  }
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

// Function to load QR codes for the user
async function loadQRCodes(userId) {
  try {
      const response = await fetch(`http://localhost:5000/api/qr-codes/${userId}`);
      const qrCodes = await response.json();
      
      qrCodes.forEach(qr => {
          const img = document.createElement('img');
          img.src = `data:${qr.mime_type};base64,${btoa(qr.image_data)}`;
          document.getElementById('qrGallery').appendChild(img);
      });
  } catch (error) {
      console.error('QR load error:', error);
  }
}

// Initialize transfers page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeTransfersPage);
