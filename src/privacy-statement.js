const privacyStatement = document.querySelector('#privacy-statement');

if (privacyStatement) {
  function openLinkedStatement() {
    if (window.location.hash === '#privacy-statement') privacyStatement.open = true;
  }

  document.querySelectorAll('a[href="#privacy-statement"]').forEach((link) => {
    link.addEventListener('click', () => { privacyStatement.open = true; });
  });
  window.addEventListener('hashchange', openLinkedStatement);
  openLinkedStatement();
}
