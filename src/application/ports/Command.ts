// Application port for Command pattern
import {MoveValidationResult} from '@/domain/models/GameMove';

export interface Command<T = void> {
  validate(): MoveValidationResult;
  canExecute(): boolean;
  execute(): T;
  undo?(): void;
}

export interface ValidationError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export class CommandValidationException extends Error {
  constructor(public readonly validation: MoveValidationResult) {
    super(validation.error || 'Command validation failed');
  }
}