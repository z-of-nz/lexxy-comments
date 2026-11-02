export function registerEventListener(target, type, listener, options) {
  target.addEventListener(type, listener, options)
  return () => target.removeEventListener(type, listener, options)
}

export function dispatch(element, name, detail) {
  element.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }))
}
