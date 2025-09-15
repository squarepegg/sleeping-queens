// Application port for event publishing
export interface DomainEvent {
  readonly type: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
}

export interface EventPublisher {
  publish(event: DomainEvent): void;
  publishMany(events: ReadonlyArray<DomainEvent>): void;
}

export interface EventSubscription {
  unsubscribe(): void;
}

export interface EventBus extends EventPublisher {
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => void
  ): EventSubscription;
}