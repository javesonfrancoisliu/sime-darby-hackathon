// Shared state for open modals, so stacked dialogs cooperate: only the topmost
// one reacts to Escape and Tab, the page behind is inert, and the body scroll
// lock is released only when the last one closes.

type Entry = { id: symbol; root: HTMLElement };

const stack: Entry[] = [];
const inerted = new Set<Element>();
let savedOverflow = "";

// Marks everything outside the topmost modal as inert by walking up from it and
// inerting each ancestor's other children. Works without moving the modal in the DOM.
function syncInert(): void {
  for (const element of inerted) element.removeAttribute("inert");
  inerted.clear();

  const top = stack[stack.length - 1];
  if (!top) return;
  let node: HTMLElement = top.root;
  while (node.parentElement) {
    const parent: HTMLElement = node.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (sibling !== node && !sibling.hasAttribute("inert")) {
        sibling.setAttribute("inert", "");
        inerted.add(sibling);
      }
    }
    if (parent === document.body) break;
    node = parent;
  }
}

export function openModal(id: symbol, root: HTMLElement): void {
  if (stack.length === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  stack.push({ id, root });
  syncInert();
}

export function closeModal(id: symbol): void {
  const index = stack.findIndex((entry) => entry.id === id);
  if (index === -1) return;
  stack.splice(index, 1);
  syncInert();
  if (stack.length === 0) document.body.style.overflow = savedOverflow;
}

export function isTopModal(id: symbol): boolean {
  return stack[stack.length - 1]?.id === id;
}
