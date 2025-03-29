function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function get_filtered_html() {
  await delay(5000);
  return `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #fafafa;">
      <h1 style="color:black">This is your new content!</h1>
    </div>
  `;
}

function override_filter() {
  let originalContainer = document.getElementById('extension-original-content');
  originalContainer.style.display = 'block';

  let loading = document.getElementById('loading');
  loading.style.display = 'none'
}

(async function () {
  if (window.__extensionInjected) {
    return;
  }
  window.__extensionInjected = true;

  // Wrap original content in a container for later restoration.
  let originalContainer = document.getElementById('extension-original-content');
  if (!originalContainer) {
    originalContainer = document.createElement('div');
    originalContainer.id = 'extension-original-content';
    // Move all existing body children into the original container.
    while (document.body.firstChild) {
      originalContainer.appendChild(document.body.firstChild);
    }
    document.body.appendChild(originalContainer);
  }

  let loading = document.getElementById('loading');
  if (!loading) {
    loading = document.createElement('div');
    loading.id = 'loading';
    loading.innerHTML = `
      <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background: #fafafa;">
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spinner {
            border: 8px solid #f3f3f3;
            border-top: 8px solid #3498db;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
        </style>
        <div class="spinner"></div>
        <h1 style="color:black">Loading filtered content</h1>
        <button class="button" id="override">Override</button>
      </div>
    `;
    document.body.appendChild(loading);
  }
  Object.assign(document.getElementById('override').style, {
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  });
  document.getElementById('override').addEventListener('click', override_filter);

  originalContainer.style.display = 'none';
  loading.style.display = 'block'

  new_html = await get_filtered_html()

  // Create a container for random content (hidden by default).
  let randomContainer = document.getElementById('extension-random-content');
  if (!randomContainer) {
    randomContainer = document.createElement('div');
    randomContainer.id = 'extension-random-content';
    randomContainer.style.display = 'none';
    // Customize your random content as needed.
    randomContainer.innerHTML = new_html;
    document.body.appendChild(randomContainer);
  }

  // Create the fixed toggle button.
  const toggleButton = document.createElement('button');
  toggleButton.id = 'extension-toggle-button';
  toggleButton.textContent = 'Replace Page Content';
  // Style the button (customize as needed).
  Object.assign(toggleButton.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    zIndex: '9999',
    padding: '8px 12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  });
  document.body.appendChild(toggleButton);

  if (loading.style.display !== 'none') {
    originalContainer.style.display = 'none';
    loading.style.display = 'none';
    randomContainer.style.display = 'block';
  } else {
    originalContainer.style.display = 'block';
    loading.style.display = 'none';
    randomContainer.style.display = 'none';
  }
  toggleButton.textContent = 'Restore Page Content';

  // Toggle the display between the original content and the random content.
  toggleButton.addEventListener('click', () => {
    if (originalContainer.style.display !== 'none') {
      // Hide the original content, show random content.
      originalContainer.style.display = 'none';
      randomContainer.style.display = 'block';
      toggleButton.textContent = 'Restore Page Content';
    } else {
      // Restore original content, hide random content.
      originalContainer.style.display = 'block';
      randomContainer.style.display = 'none';
      toggleButton.textContent = 'Replace Page Content';
    }
  });
})();
