// Scale the whole app so its design size fills the window: the layout is built to fit a
// 1280 × 800 CSS-px area (Tab 1 on one screen for n ≤ 3), and larger windows zoom it up —
// height fills exactly, extra width goes to the flexible parts. Never below 1×, at most 2×.
const DESIGN_W = 1280;
const DESIGN_H = 800;
const MAX_SCALE = 2;

let scale = 1;

/** Current zoom factor (any canvas drawing should multiply its backing resolution by it). */
export const fitScale = () => scale;

export function wireFit(root) {
  const apply = () => {
    scale = Math.max(1, Math.min(MAX_SCALE, window.innerHeight / DESIGN_H, window.innerWidth / DESIGN_W));
    root.style.zoom = scale === 1 ? '' : String(scale);
    // Height of the window in the app's (zoomed) CSS px, for layout that must match the window.
    document.documentElement.style.setProperty('--app-h', `${window.innerHeight / scale}px`);
  };
  window.addEventListener('resize', apply);
  apply();
}
