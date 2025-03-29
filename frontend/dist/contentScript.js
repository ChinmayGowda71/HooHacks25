if (window.__originalHtmlBackup) {
  // Undo: restore the original HTML if it exists.
  document.body.innerHTML = window.__originalHtmlBackup;
  window.__originalHtmlBackup = null;
} else {
  // Save current HTML and replace it with your custom content.
  window.__originalHtmlBackup = document.body.innerHTML;
  document.body.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #fafafa;
    ">
      <h1 style="color: black">This is your new content!</h1>
    </div>
  `;
}