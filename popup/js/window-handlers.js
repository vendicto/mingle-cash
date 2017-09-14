document.querySelectorAll('a')
        .forEach(el => el.addEventListener('click', () => {
            if (e.target.href) {
                e.preventDefault();
                MCash.openLink(e.target.href);
            }
        }));