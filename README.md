# PeekO - Link Preview Chrome Extension

PeekO is a browser extension that gives you a "peek" into any link before you click. By simply hovering over a link, you can see a rich preview of its content, including the page title, description, and a preview image. This saves you time, helps you avoid unwanted content, and enhances your browsing experience.


## Features

- **Instant Previews:** Hover over any link to get an instant preview of the webpage.
- **Rich Content:** Previews include title, description, domain, and a lead image.
- **Modern UI:** A clean, modern, and non-intrusive popup UI.
- **Enable/Disable:** Easily toggle the extension on or off from the popup.
- **Smart Positioning:** Previews are intelligently positioned to avoid going off-screen.
- **Efficient Caching:** Fetched previews are cached to improve performance and reduce network requests.

## How It Works

PeekO is built as a modern Manifest V3 Chrome Extension, leveraging a modular architecture for security and performance.

- **Content Script (`src/content/index.jsx`):** This script is injected into every webpage. It uses `IntersectionObserver` to efficiently detect when links become visible on the screen and attaches hover listeners to them. When a user hovers over a link, it sends a message to the background script to fetch a preview.

- **Background Script (`src/content/background.js`):** This is the central brain of the extension. It runs as a Service Worker and listens for messages. When it receives a request for a preview, it fetches the link's HTML, parses it using `node-html-parser` (to avoid DOM dependencies), extracts the relevant metadata, and sends it back to the content script. It also manages caching and the overall state of the extension (enabled/disabled).

- **Popup (`src/App.jsx`):** The UI you see when clicking the extension icon. It's built with React and allows the user to interact with the extension, such as toggling it on or off and changing settings. It communicates with the background script to update the extension's state.

- **Link Preview Component (`src/component/LinkPreview.tsx`):** A React component that displays the preview card itself. It's rendered within a Shadow DOM by the content script to ensure its styles don't conflict with the host page.

## Tech Stack

- **Framework:** React 19 (with React DOM)
- **Build Tool:** Vite
- **Chrome Extension Tooling:** `@crxjs/vite-plugin`
- **Styling:** Tailwind CSS
- **Language:** JavaScript & TypeScript
- **HTML Parsing:** `node-html-parser` (in the background script)
- **Debouncing:** `lodash.debounce`

## Getting Started: Local Development

To run and test PeekO locally, follow these steps.

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- Google Chrome

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd peeko-1
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

### Running in Development Mode

For the best development experience with Hot Module Replacement (HMR):

1.  **Run the dev server:**
    ```bash
    npm run dev
    ```

2.  **Load the extension in Chrome:**
    - Open Chrome and navigate to `chrome://extensions`.
    - Enable "Developer mode" in the top-right corner.
    - Click "Load unpacked".
    - Select the `peeko-1` directory (the root of the project).
    - The extension will load with HMR enabled. Changes you make to the code will reflect instantly.

### Building for Production

To create a production-ready build of the extension:

1.  **Run the build command:**
    ```bash
    npm run build
    ```
    This will create a `dist` directory containing all the optimized, bundled files for the extension.

2.  **Load the production build in Chrome:**
    - Go to `chrome://extensions`.
    - If you have the development version loaded, remove it first.
    - Click "Load unpacked".
    - Select the `dist` directory.
    - This is how you would test the final version before publishing.

## Security & Robustness

- **Principle of Least Privilege:** Network requests are handled exclusively by the background script.
- **Secure Fetching:** The `fetch` API is called with `credentials: 'omit'` to avoid sending user cookies.
- **XSS Protection:** Data is rendered using React, which automatically escapes content to prevent Cross-Site Scripting attacks.
- **Memory Management:** The background script uses a capped cache with a Time-to-Live (TTL) to prevent memory leaks.
- **DOM-less Parsing:** The background script uses `node-html-parser` as it does not have access to DOM APIs like `DOMParser`, making it more robust.
