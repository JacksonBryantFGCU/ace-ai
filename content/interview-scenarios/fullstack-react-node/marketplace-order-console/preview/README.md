Fullstack preview uses the frontend workspace as the primary app preview.

The runtime injects `VITE_API_BASE_URL` into the React/Vite app so the console
calls the real Express + SQLite backend.
