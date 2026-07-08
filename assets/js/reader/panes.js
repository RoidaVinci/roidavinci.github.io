// Pane stack — the anti-drift navigation core.
// Every deep-dive is a push; returning is a pop. There is no free navigation,
// so the reader can always get back to the root text in one gesture.

const panel = document.getElementById('reader-panel');
const app = document.getElementById('reader-app');

let stack = []; // [{ title, render(el), onPop? }]

export function typeset(el) {
  window.MathJax?.typesetPromise?.([el]).catch(() => {});
}

let backdrop = null;

function renderPanel() {
  panel.innerHTML = '';
  if (stack.length === 0) {
    panel.hidden = true;
    app.classList.remove('has-panel');
    backdrop?.remove();
    backdrop = null;
    return;
  }
  panel.hidden = false;
  app.classList.add('has-panel');
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
  panel.appendChild(pane);
  stack[stack.length - 1].render(pane);
  typeset(pane);
}

export function push(pane) {
  stack.push(pane);
  renderPanel();
}

export function pop() {
  popTo(stack.length - 1);
}

export function popTo(depth) {
  while (stack.length > depth) {
    stack.pop()?.onPop?.();
  }
  renderPanel();
}

export function refresh() {
  renderPanel();
}

export function depth() {
  return stack.length;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length > 0) pop();
});
