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

const not_included = ['STYLE', 'SCRIPT', 'NOSCRIPT']

const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, td, tr');
const filteredElements = Array.from(allElements).filter(elem => {
    return !(
        elem.closest('head') ||  // Exclude images inside <head>
        elem.closest('header') ||  // Exclude images inside <header>
        elem.closest('footer')    // Exclude images inside <footer>
    );
});


var userPrompt = "I'm scared of lobsters"

allElements.forEach(async (element) => {
// call api and blur based on the return
   if (hasBlurredAncestor(element)) {
     return;
   }
   if (element.textContent.trim().length > 0 && !not_included.includes(element.tagName)) {
     const res = await get_result(element.textContent.trim(), userPrompt, 'text');
     // console.log(element.textContent.trim())
     // console.log(res)
     if (res) {
       element.style.filter = 'blur(5px)';
        element.style.cursor = 'pointer';
        element.setAttribute('title', 'Click to see sensitive content');

        // Add click event to remove blur
        element.addEventListener('click', function (event) {
          event.preventDefault();
            element.style.filter = 'none';
            element.removeAttribute('title'); // Remove tooltip after revealing content
        }, { once: true });
     }
   }
});

const images = document.querySelectorAll('img');
const filteredImages = Array.from(images).filter(img => {
    return !(
        img.closest('head') ||  // Exclude images inside <head>
        img.closest('header') ||  // Exclude images inside <header>
        img.closest('footer')     // Exclude images inside <footer>
    );
});

filteredImages.forEach(async (element) => {
  const src = element.getAttribute('src');
  const url = new URL(src, window.location.href).href
  const res = await get_result(url, userPrompt, 'img');
  // console.log(url);
  // console.log(res);
  if (res) {
   element.style.filter = 'blur(5px)';
    element.style.cursor = 'pointer';
    element.setAttribute('title', 'Click to see sensitive content');

    const parentLink = element.closest('a');
    if (parentLink && element.tagName === 'IMG') {
        parentLink.dataset.firstClick = "true"; // Track first click
        // console.log(parentLink);
        parentLink.addEventListener('click', function (event) {
          if (parentLink.dataset.firstClick === "true") {
              event.preventDefault(); // Stop the link from opening on first click
              element.style.filter = 'none'; // Unblur the image
              parentLink.dataset.firstClick = "false"; // Allow navigation on second click
          }
        });
    } else {
        // Regular case: Unblur on click
        element.addEventListener(
            'click',
            function () {
                element.style.filter = 'none';
                element.removeAttribute('title'); // Remove tooltip after revealing content
            },
            { once: true } // Ensures it only triggers once per element
        );
    }
}
})
