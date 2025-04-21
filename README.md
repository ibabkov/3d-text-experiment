# 3D Text Experiment

This is a perspective camera view, showing randomly positioned surfaces with text.
When you hover over the text with the mouse - text will be highlighted.

To run this project successfully, it must be served through a local development server to handle CORS restrictions and
properly load external resources like Three.js.

### Instructions:

1. **Start the server**:
   Execute the following command:
   ```bash
   npm run start
   ```

2. **Access the application**:
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

   *(Refer to the terminal output for the actual port if it differs.)*

### Note:

- Opening `index.html` directly (via `file://`) will result in CORS errors, as browsers block external resource loading
  in this mode.
- Serving the project through a local server ensures all dependencies are correctly resolved.


- For optimal performance, please ensure that your browser matches the following support criteria:
  **Supported Browsers**:
  ```plain text
  # .browserslistrc
  last 2 Chrome versions
  last 2 Firefox versions
  last 2 Safari versions
  last 2 Edge versions
  iOS >= 14
  Android >= 8
  not IE 11
  not dead
  ```
