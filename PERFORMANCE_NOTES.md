# Performance Notes – Ciso Chat INP remediation

## Bottlenecks fixed
- Typing in `#ciso-chat-input` forced the entire chat history to re-render because the textarea and the message list were rendered in the same component tree without memoization. Large message lists amplified the cost on every keystroke.
- The floating launcher button re-rendered whenever chat state changed, adding avoidable render work after clicks.
- The send button handler performed array reconstruction synchronously before returning, extending the click/input task.

## Guardrails
- Keep input handlers lightweight: update local state only, with no network calls, storage writes, or heavy transformations.
- Avoid storing rapidly changing input state alongside large collections; memoize lists (`React.memo`) so keystrokes don’t rerender history.
- Keep click handlers slim: validate, enqueue async work, return. Defer heavy work to async code paths.
- Prefer memoized/isolated components for floating UI toggles so unrelated state changes do not cascade re-renders.

## Profiling guidance
- Build production bundle: `npm run build` then `npm run preview`.
- Profile with Chrome DevTools Performance panel focusing on INP events. Watch `lastInputDurationMs` and `lastSendHandlerMs` console debug logs (visible in dev) for handler timings.
- Target metrics: input delay under 20 ms for most keystrokes, render < 50 ms during typing, and send handler < 30 ms before async work begins.
