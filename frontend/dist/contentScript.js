'use strict';

async function get_result(text, user_prompt, type) {
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text, exclusionList: user_prompt }),
  };
  try {
    let url = '';
    if (type == 'text') {
      url = 'http://127.0.0.1:5000/analyze-text-section';
    } else {
      url = 'http://127.0.0.1:5000/analyze-image'
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

const paragraph_len = 200;

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

// const not_included = ['STYLE', 'SCRIPT', 'NOSCRIPT']

// const allElements = document.querySelectorAll('*');

// allElements.forEach(async (element) => {
//   // call api and blur based on the return
//   const words = element.textContent.trim().split(' ');
//   if (hasBlurredAncestor(element)) {
//     return;
//   }
//   if (words.length <= paragraph_len && element.textContent.trim().length > 0 && !not_included.includes(element.tagName)) {
//     const res = await get_result(element.textContent.trim(), "I'm scared of snakes", 'text');
//     console.log(element.textContent.trim())
//     console.log(res)
//     if (res) {
//       element.style.filter = 'blur(5px)';
//     }
//   }
// });

const images = document.querySelectorAll('img');

images.forEach(async (element) => {
  const src = element.getAttribute('src');
  const url = new URL(src, window.location.href).href
  const res = await get_result(url, "I'm scared of snakes", 'img');
  console.log(url);
  console.log(res);
  if (res) {
    element.style.filter = 'blur(15px)';
  }
})
