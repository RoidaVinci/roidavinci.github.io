// Pane stack — the anti-drift navigation core.
// Every deep-dive is a push; returning is a pop. There is no free navigation,
// so the reader can always get back to the root text in one gesture.
//
// The panel is an overlay: it floats above the page and never reflows the
// text column. Each push adds a history entry (panes with a `hash` also set
// a shareable URL), so the browser back button pops panes — on mobile,
// back closes the sheet instead of leaving the page.

const panel = document.getElementById('reader-panel');

let stack = []; // [{ title, render(el), hash?, onPop? }]
let pendingNav = false;
let lastFocus = null;

export function typeset(el) {
  window.MathJax?.typesetPromise?.([el]).catch(() => {});
}

export function initPanes() {
  history.replaceState({ rd: 0 }, '', location.href);
}

// Update the visible hash (e.g. TOC navigation) without adding a history
// entry, preserving the pane-depth state.
export function setHash(hash) {
  history.replaceState({ rd: stack.length }, '', hash ? `#${hash}` : location.pathname + location.search);
}

window.addEventListener('popstate', (e) => {
  pendingNav = false;
  const target = Math.max(0, Math.min(e.state?.rd ?? 0, stack.length));
  if (target === stack.length) return;
  while (stack.length > target) stack.pop()?.onPop?.();
  renderPanel();
});

let backdrop = null;

function renderPanel() {
  panel.innerHTML = '';
  if (stack.length === 0) {
    panel.hidden = true;
    backdrop?.remove();
    backdrop = null;
    if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
    return;
  }
  panel.hidden = false;
  if (!backdrop) {
    // Only visible on small screens (CSS); tapping it returns to the text.
    backdrop = document.createElement('div');
    backdrop.className = 'reader-backdrop';
    backdrop.addEventListener('click', () => popTo(0));
    document.body.appendChild(backdrop);
  }

  const crumbs = document.createElement('nav');
  crumbs.className = 'reader-crumbs';
  crumbs.setAttribute('aria-label', 'Reading depth');

  const root = document.createElement('button');
  root.className = 'reader-crumb';
  root.textContent = 'Text';
  root.title = 'Return to the main text';
  root.addEventListener('click', () => popTo(0));
  crumbs.appendChild(root);

  stack.forEach((pane, i) => {
    const sep = document.createElement('span');
    sep.className = 'reader-crumb-sep';
    sep.textContent = '›';
    crumbs.appendChild(sep);
    const crumb = document.createElement('button');
    crumb.className = 'reader-crumb';
    crumb.textContent = pane.title;
    if (i === stack.length - 1) {
      crumb.setAttribute('aria-current', 'true');
    } else {
      crumb.addEventListener('click', () => popTo(i + 1));
    }
    crumbs.appendChild(crumb);
  });

  const close = document.createElement('button');
  close.className = 'reader-panel-close';
  close.textContent = '×';
  close.title = 'Close (Esc pops one level)';
  close.setAttribute('aria-label', 'Close panel');
  close.addEventListener('click', () => popTo(0));
  crumbs.appendChild(close);
  panel.appendChild(crumbs);

  const pane = document.createElement('div');
  pane.className = 'reader-pane';
  pane.tabIndex = -1;
  panel.appendChild(pane);
  stack[stack.length - 1].render(pane);
  typeset(pane);
}

export function push(pane) {
  if (stack.length === 0) lastFocus = document.activeElement;
  stack.push(pane);
  const url = pane.hash ? `${location.pathname}${location.search}#${pane.hash}` : location.href;
  history.pushState({ rd: stack.length }, '', url);
  renderPanel();
  panel.querySelector('.reader-pane')?.focus({ preventScroll: true });
}

export function pop() {
  popTo(stack.length - 1);
}

export function popTo(depth) {
  depth = Math.max(0, depth);
  if (pendingNav || depth >= stack.length) return;
  pendingNav = true;
  // Let the browser drive: popstate performs the actual pop, so history and
  // the pane stack can never disagree.
  history.go(depth - stack.length);
}

export function refresh() {
  renderPanel();
}

export function depth() {
  return stack.length;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length > 0 && !e.defaultPrevented) pop();
});
