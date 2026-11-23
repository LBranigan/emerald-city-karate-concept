# Emerald City Karate: concept redesign (unofficial)

A design mockup made for the dojo to review. It is **not** the official Emerald City Karate website, which is at https://emeraldcitykarate.com. The text, photos and logo belong to Emerald City Karate.

The sign-up flow is a demo. Nothing typed into it is sent anywhere and nothing is charged. Real sign-ups happen in the dojo's Zen Planner, and every sign-up button links there if the demo is skipped.

## Working on it

A static site with no dependencies.

- Pages live in `src/pages`, one file per page, each starting with a one-line JSON comment (title, description, navigation section).
- The shared header, footer, sign-up dialog and notes dialog live in `src/partials`.
- Styles: `css/styles.css` (base, home page, sign-up dialog) and `src/css/*.css` (everything else, combined into `css/pages.css`).
- Schedule data, closures and Zen Planner links for the sign-up flow live in `js/data.js`.

Run `node build.mjs` to write the `.html` files at the top level and check that every local link resolves. Then open `index.html` in a browser.
