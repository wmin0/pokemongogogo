(() => {

const initI18n = () => {
  Array.from(document.querySelectorAll('[data-i18n]')).forEach((dom) => {
    dom.innerText = chrome.i18n.getMessage(dom.dataset.i18n);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
});

})();
