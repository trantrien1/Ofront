// React DOM compatibility shim for libs that still call ReactDOM.render/unmountComponentAtNode
// Works on React 18+ by delegating to react-dom/client
import * as ReactDOMClient from 'react-dom/client';
// Re-export everything else from react-dom (e.g., createPortal)
export * from 'react-dom';
import * as ReactDOMLegacy from 'react-dom';

// Track roots per container to support unmount
const roots = new Map<Element | DocumentFragment, ReactDOMClient.Root>();

export function render(element: React.ReactNode, container: Element | DocumentFragment) {
  let root = roots.get(container);
  if (!root) {
    // @ts-ignore createRoot accepts Element | DocumentFragment
    root = ReactDOMClient.createRoot(container as Element);
    roots.set(container, root);
  }
  // @ts-ignore React 18+ render signature
  root.render(element as any);
  return root;
}

export function unmountComponentAtNode(container: Element | DocumentFragment) {
  const root = roots.get(container);
  if (root) {
    root.unmount();
    roots.delete(container);
    return true;
  }
  // Fallback in case something else mounted legacy React here
  try {
    // @ts-ignore optional in modern builds
    return (ReactDOMLegacy as any).unmountComponentAtNode?.(container) ?? true;
  } catch {
    return true;
  }
}

// Keep default export shape compatible (some libs access default.createPortal)
export default ReactDOMLegacy as any;
