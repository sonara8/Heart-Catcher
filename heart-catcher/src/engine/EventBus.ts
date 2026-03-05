/**
 * EventBus — typed singleton event emitter.
 * Decouples systems: GameScene emits, UIOverlay listens, no direct references needed.
 */
type Listener<T = unknown> = (data: T) => void;

class EventBusClass {
  private listeners = new Map<string, Set<Listener<unknown>>>();

  on<T>(event: string, listener: Listener<T>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);
  }

  off<T>(event: string, listener: Listener<T>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  emit<T>(event: string, data?: T): void {
    this.listeners.get(event)?.forEach(fn => fn(data as unknown));
  }

  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export const EventBus = new EventBusClass();
