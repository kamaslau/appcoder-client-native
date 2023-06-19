// preload.js

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  console.group("versions: ");
  for (const dependency of ["chrome", "node", "electron"]) {
    console.log(dependency.padStart(8), process.versions[dependency]);
    // replaceText(`${dependency}-version`, process.versions[dependency]);
  }
  console.groupEnd();
});
