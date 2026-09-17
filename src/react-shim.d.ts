declare module 'react' {
  export type ReactNode = any
  export type ChangeEvent<T = any> = any
  export type MouseEvent<T = any> = any
  export type PointerEvent<T = any> = any
  export type WheelEvent<T = any> = any
  export const StrictMode: any
  export function useEffect(...args: any[]): any
  export function useMemo(...args: any[]): any
  export function useRef<T = any>(initial?: T): { current: T }
  export function useState<T = any>(initial: T): [T, (value: T | ((prev: T) => T)) => void]
  const React: any
  export default React
}

declare module 'react-dom/client' {
  export function createRoot(container: any): { render(node: any): void }
}

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}
