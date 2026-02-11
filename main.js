// Main JavaScript file for shared functionality

// Check authentication status on page load
document.addEventListener('DOMContentLoaded', function() {
  // Set active navigation link based on current page
  setActiveNavLink();
  
  // Check if user is logged in
  checkAuth();
});

// Function to set active navigation link
function setActiveNavLink() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const linkPath = link.getAttribute('href');
    
    if (linkPath === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

document.addEventListener('DOMContentLoaded', function() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const navbarUserName = document.getElementById('userName');
  if (currentUser && navbarUserName) {
    // Use 'username' or 'name' property depending on your storage
    navbarUserName.textContent = currentUser.username || currentUser.name || 'User';
  }
});

// Helper function to format date
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// Function to show a loader while content is loading
function showLoader(containerId) {
  const container = document.getElementById(containerId);
  
  if (container) {
    container.innerHTML = `
      <div class="text-center p-5">
        <span class="loader"></span>
        <p class="mt-3">Loading...</p>
      </div>
    `;
  }
}

// Function to show error message
function showErrorMessage(containerId, message) {
  const container = document.getElementById(containerId);
  
  if (container) {
    container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
      </div>
    `;
  }
}

// Function to show empty state
function showEmptyState(containerId, icon, message) {
  const container = document.getElementById(containerId);
  
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas ${icon} empty-state-icon"></i>
        <p>${message}</p>
      </div>
    `;
  }
}
