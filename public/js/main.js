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

        // Close the menu if a link is clicked, but not if it's the language switcher
        navLinks.addEventListener('click', (e) => {
            // Check if the click is inside the language switcher
            if (e.target.closest('.nav-translate-mobile')) {
                return; // Do nothing if the language switcher is clicked
            }
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

    // Intersection Observer for revealing elements on scroll
    const revealElements = document.querySelectorAll('.reveal-on-scroll');
}); 