import { useEffect, useRef } from "react";

/**
 * useScrollReveal
 * Intersection Observer hook that fades elements in when they scroll into view.
 *
 * Usage:
 * const ref = useScrollReveal();
 * return <div ref={ref} className="opacity-0">Content</div>;
 */
export function useScrollReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("animate-fade-in");
          node.classList.remove("opacity-0");
          observer.unobserve(node);
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return ref;
}
