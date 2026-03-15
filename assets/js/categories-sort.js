document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('ctg-search-input');
  const sortBtns = document.querySelectorAll('.ctg-sort-btn');
  const container = document.getElementById('ctg-list-container');

  if (!searchInput || !container) return;

  let cards = Array.from(container.querySelectorAll('.ctg-card-single'));

  // 1. Search filter
  searchInput.addEventListener('input', function (e) {
    const query = e.target.value.toLowerCase();
    cards.forEach(function (card) {
      const name = card.getAttribute('data-name');
      card.style.display = name.includes(query) ? '' : 'none';
    });
  });

  // 2. Sort functions
  sortBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      sortBtns.forEach(function (b) {
        b.classList.remove('active');
      });
      this.classList.add('active');

      const sortBy = this.getAttribute('data-sort');
      cards.sort(function (a, b) {
        if (sortBy === 'name') {
          return a
            .getAttribute('data-name')
            .localeCompare(b.getAttribute('data-name'));
        } else if (sortBy === 'count') {
          return (
            parseInt(b.getAttribute('data-count')) -
            parseInt(a.getAttribute('data-count'))
          );
        }
      });

      cards.forEach(function (card) {
        container.appendChild(card);
      });
    });
  });

  // 3. Chevron rotate on collapse toggle
  const collapses = document.querySelectorAll('.ctg-sub-collapse');
  collapses.forEach(function (coll) {
    coll.addEventListener('show.bs.collapse', function () {
      const btn = this.parentElement.querySelector('.ctg-collapse-btn');
      if (btn) btn.classList.add('open');
    });
    coll.addEventListener('hide.bs.collapse', function () {
      const btn = this.parentElement.querySelector('.ctg-collapse-btn');
      if (btn) btn.classList.remove('open');
    });
  });
});
