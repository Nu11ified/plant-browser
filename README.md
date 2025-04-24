# React Plant Browser 🌱

A web application built with React for browsing a collection of plants. This project utilizes React Router for seamless navigation and TanStack Virtual (React Virtual) for efficient rendering of potentially large plant lists.

## Features

*   **Browse Plants:** View a list of available plants.
*   **Efficient List Rendering:** Uses TanStack Virtual to render only the visible items in the list, ensuring high performance even with thousands of plants.
*   **Detailed View:** Click on a plant to navigate to a dedicated page showing more details (handled by React Router).
*   **Client-Side Routing:** Smooth navigation between the plant list and detail views without full page reloads, thanks to React Router.
*   **(Optional: Add other features like Search, Filtering, Sorting, etc. if you implemented them)**

## Technologies Used

*   **React:** JavaScript library for building user interfaces.
*   **React Router (v6):** For declarative client-side routing.
*   **TanStack Virtual (React Virtual):** For virtualizing large lists and grids, optimizing performance.
*   **Vite:** For project setup, development server, and bundling.
*   **Tailwind CSS:** For styling the application.

## Prerequisites

Before you begin, ensure you have the following installed:

*   Bun

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Nu11ified/plant-browser.git
    cd plant-browser
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

## Running the Project

1.  **Start the development server:**
    ```bash
    bun dev
    ```

2.  **Open your browser:**
    Navigate to `http://localhost:5173` 

