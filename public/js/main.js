document.addEventListener('DOMContentLoaded', () => {
    // --- Hamburger Menu Logic ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the click from bubbling up to the document
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active'); // Animate the hamburger icon
        });

        // Close the menu if a link is clicked
        navLinks.addEventListener('click', () => {
            navLinks.classList.remove('active');
            hamburger.classList.remove('active'); // Reset hamburger icon
        });

        // Close the menu if a click happens outside of it
        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') && !navLinks.contains(e.target) && !hamburger.contains(e.target)) {
                navLinks.classList.remove('active');
                hamburger.classList.remove('active'); // Reset hamburger icon
            }
        });
    }
}); 