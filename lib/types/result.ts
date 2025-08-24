// lib/types/result.ts
// Result type for error handling without exceptions

/**
 * Result type representing either success (Ok) or failure (Err)
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Success variant of Result
 */
export interface Ok<T> {
  readonly success: true;
  readonly data: T;
}

/**
 * Error variant of Result
 */
export interface Err<E> {
  readonly success: false;
  readonly error: E;
}

/**
 * Create a successful Result
 */
export function Ok<T>(data: T): Ok<T> {
  return { success: true, data };
}

/**
 * Create an error Result
 */
export function Err<E>(error: E): Err<E> {
  return { success: false, error };
}

/**
 * Type guards
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.success === true;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return result.success === false;
}

/**
 * Utility functions for working with Results
 */

/**
 * Map over the success value of a Result
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  if (isOk(result)) {
    return Ok(fn(result.data));
  }
  return result;
}

/**
 * Map over the error value of a Result
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) {
    return Err(fn(result.error));
  }
  return result;
}

/**
 * Chain Results together (flatMap)
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result;
}

/**
 * Provide a default value for error cases
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Unwrap the success value or throw the error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  throw result.error;
}

/**
 * Get the error or throw if success
 */
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (isErr(result)) {
    return result.error;
  }
  throw new Error('Called unwrapErr on Ok result');
}

/**
 * Convert a Result to a Promise
 */
export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  if (isOk(result)) {
    return Promise.resolve(result.data);
  }
  return Promise.reject(result.error);
}

/**
 * Convert a Promise to a Result
 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    const data = await promise;
    return Ok(data);
  } catch (error) {
    return Err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Combine multiple Results into one
 */
export function combine<T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.data);
  }

  return Ok(values);
}

/**
 * Apply a function to multiple Results
 */
export function all<T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E> {
  return combine(results);
}

/**
 * Get the first successful Result or the last error
 */
export function any<T, E>(results: readonly Result<T, E>[]): Result<T, E> {
  let lastError: E | undefined;

  for (const result of results) {
    if (isOk(result)) {
      return result;
    }
    lastError = result.error;
  }

  if (lastError !== undefined) {
    return Err(lastError);
  }

  throw new Error('any() called with empty array');
}
