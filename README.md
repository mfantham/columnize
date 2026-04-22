# columnize
A chrome extension. Takes selected text, and puts it into a webpage that auto-breaks into columns.

## Usage
1. Open `chrome://extensions` and enable Developer mode.
2. Click **Load unpacked** and select this repository folder.
3. Select text on any page.
4. Click the Columnize extension button to open the selected text in full-height columns.
5. Use the compact toolbar above the first column to set:
   - **Break on** token (default `\n\n`) for paragraph/chunk splitting.
   - **Column delineation** toggle (on by default).
   - **Autoscroll after** N seconds (off by default) with countdown display.
6. Press any key to advance one column to the right (debounced ~200ms, wraps back to start). With autoscroll enabled, manual key presses also reset the timer.
