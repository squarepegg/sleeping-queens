// Infrastructure implementation of EventBus
import {DomainEvent, EventBus, EventSubscription} from '@/application/ports/EventPublisher';

type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void;

export class SimpleEventBus implements EventBus {
  private listeners = new Map<string, Set<EventHandler>>();

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): EventSubscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(handler as EventHandler);

    return {
      unsubscribe: () => {
        this.listeners.get(eventType)?.delete(handler as EventHandler);
      }
    };
  }

  publish(event: DomainEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error handling event ${event.type}:`, error);
        }
      });
    }
  }

  publishMany(events: ReadonlyArray<DomainEvent>): void {
    events.forEach(event => this.publish(event));
  }

  // Additional methods for debugging
  getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size || 0;
  }

  getAllEventTypes(): ReadonlyArray<string> {
    return Array.from(this.listeners.keys());
  }

  clear(): void {
    this.listeners.clear();
  }
}