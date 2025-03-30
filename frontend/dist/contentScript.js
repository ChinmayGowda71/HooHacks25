'use strict';

function getStorageValue(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result[key]);
      }
    });
  });
}

const loading_screen = `
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
    .progress-bar-container {
      width: 80%;
      background: #e0e0e0;
      height: 12px;
      border-radius: 6px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-bar-fill {
      height: 100%;
      width: 0%;
      background: #3498db;
      transition: width 0.3s ease;
    }
    .cancel-button {
      padding: 10px;
      margin-top: 20px;
      font-size: 1rem;
      cursor: pointer;
    }
  </style>
  <div class="spinner"></div>
  <div class="progress-bar-container">
    <div class="progress-bar-fill" id="extension-progress-fill"></div>
  </div>
  <h1 style="color:black">Filtering page...</h1>
  <button id="cancel-blur-button" class="cancel-button">Override: I trust this page</button>
</div>`;

let originalContainer = document.getElementById('extension-original-content');
if (!originalContainer) {
  originalContainer = document.createElement('div');
  originalContainer.id = 'extension-original-content';
  while (document.body.firstChild) {
    originalContainer.appendChild(document.body.firstChild);
  }
  document.body.appendChild(originalContainer);
}

let loading_container = document.getElementById('extension-loading-container');
if (!loading_container) {
  loading_container = document.createElement('div');
  loading_container.id = 'extension-loading-container';
  loading_container.innerHTML = loading_screen;
  document.body.appendChild(loading_container);
}

originalContainer.style.display = 'none';
loading_container.style.display = 'block';

window.cancelBlur = false;

document.getElementById('cancel-blur-button').addEventListener('click', function () {
  window.cancelBlur = true;
  const blurredElements = document.querySelectorAll('[style*="blur"]');
  blurredElements.forEach((el) => {
    el.style.filter = 'none';
    el.removeAttribute('title');
  });
  originalContainer.style.display = 'block';
  loading_container.style.display = 'none';
});

async function get_result(text, user_prompt, type) {
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, exclusionList: user_prompt }),
  };
  try {
    let url = '';
    if (type === 'text') {
      url = 'http://127.0.0.1:5000/analyze-text-section';
    } else {
      url = 'http://127.0.0.1:5000/analyze-image';
    }
    const response = await fetch(url, requestOptions);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Error in get_result:", error);
    throw error;
  }
}

const hasBlurredAncestor = (el) => {
  let parent = el.parentElement;
  while (parent) {
    if (parent.dataset && parent.dataset.blurred === "true") {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
};

const not_included = ['STYLE', 'SCRIPT', 'NOSCRIPT'];

const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, td, tr'));
const imageElements = Array.from(document.querySelectorAll('img')).filter(img => {
  return !(
    img.closest('head') ||
    img.closest('header') ||
    img.closest('footer')
  );
});

const total = textElements.length + imageElements.length;
let completed = 0;

const updateProgress = () => {
  completed += 1;
  const percent = Math.round((completed / total) * 100);
  const progressFill = document.getElementById('extension-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }
};

(async function processPage() {
  let skipPages = await getStorageValue("whitelist");
  skipPages = skipPages || [];
  if (skipPages.includes(window.location.href)) {
    originalContainer.style.display = 'block';
    loading_container.style.display = 'none';
    return;
  }

  let userPrompt = await getStorageValue('searchQuery');
  const textPromises = textElements.map(async (element) => {
    if (window.cancelBlur) {
      updateProgress();
      return;
    };
    if (hasBlurredAncestor(element)) {
      updateProgress();
      return
    };
    if (element.textContent.trim().length > 0 && !not_included.includes(element.tagName)) {
      const res = await get_result(element.textContent.trim(), userPrompt, 'text');
      if (window.cancelBlur) {
        updateProgress();
        return;
      };
      if (res) {
        element.style.filter = 'blur(5px)';
        element.style.cursor = 'pointer';
        element.setAttribute('title', 'Click to see sensitive content');
        element.dataset.blurred = "true";
        element.addEventListener('click', function (event) {
          event.preventDefault();
          element.style.filter = 'none';
          element.removeAttribute('title');
        }, { once: true });
      }
      updateProgress();
    }
  });

  const imagePromises = imageElements.map(async (element) => {
    if (window.cancelBlur) {
      updateProgress();
      return;
    }
    const src = element.getAttribute('src');
    const absoluteUrl = new URL(src, window.location.href).href;
    const res = await get_result(absoluteUrl, userPrompt, 'img');
    if (window.cancelBlur) {
      updateProgress();
      return;
    }
    if (res) {
      element.style.filter = 'blur(5px)';
      // updateProgress();
      element.style.cursor = 'pointer';
      element.setAttribute('title', 'Click to see sensitive content');
      const parentLink = element.closest('a');
      if (parentLink && element.tagName === 'IMG') {
        parentLink.dataset.firstClick = "true";
        parentLink.addEventListener('click', function (event) {
          if (parentLink.dataset.firstClick === "true") {
            event.preventDefault();
            element.style.filter = 'none';
            parentLink.dataset.firstClick = "false";
          }
        });
      } else {
        element.addEventListener('click', function () {
          element.style.filter = 'none';
          element.removeAttribute('title');
        }, { once: true });
      }
    }
    updateProgress();
  });

  await Promise.all([...textPromises, ...imagePromises]);

  if (!window.cancelBlur) {
    originalContainer.style.display = 'block';
    loading_container.style.display = 'none';
  }
})();

