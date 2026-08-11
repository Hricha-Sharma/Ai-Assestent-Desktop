export type EventListener<T> = (data: T) => void;

export class EventEmitter<T> {
  private listeners: Set<EventListener<T>> = new Set();

  on(listener: EventListener<T>) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(data: T) {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  clear() {
    this.listeners.clear();
  }
}

