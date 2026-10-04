# Agent ownership

Explorite hi-fi prototype in this worktree. Do not commit, push, or deploy until Nathan says the repo is finalized.

## Exclusive paths (other agents)

Do not overwrite these once they contain content.

- Typeface: `src/styles/tokens/type.css` and `src/assets/fonts/`
- Colors: `src/styles/tokens/colors.css`
- Graphics: `src/assets/graphics/`

The prototype reads `--paper`, `--paper-raise`, `--ink`, `--ink-soft`, `--ink-faint`, `--hairline`, `--hairline-dark`, `--accent`, `--accent-ink`, `--serif`, `--sans`, and `--mono` when those files define them.

## This prototype owns

Screens, layout, navigation, and components:

- `src/prototype.js`
- `src/styles/prototype.css`
- The entry links in `index.html`
