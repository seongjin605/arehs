import { EventEmitter } from 'events';
import { ProcessStatus } from './types';

export class Arehs<T, R> {
  private readonly data: T[];
  private readonly results: R[];
  private concurrency: number;
  private inFlightTasks: number;
  private processedEntries: number;
  private processor: (data: T) => Promise<R>;
  private eventEmitter: EventEmitter;
  private promiseExecution: Promise<R[]> | null;
  private timeout: number;
  private error: unknown;
  private allowStopOnFailure: boolean;
  private retryLimitCount: number;

  /**
   * Constructor that initializes an instance of the class.
   * Takes input data (data), a parallelism limit (concurrency), and a data processing function (processor),
   * and a timeout (timeout) in milliseconds.
   *
   * @param data
   * @param concurrency
   * @param processor
   * @param timeout
   */
  constructor(data: T[], concurrency: number, processor: (data: T) => Promise<R>, timeout: number) {
    this.data = data;
    this.results = [];
    this.concurrency = concurrency;
    this.inFlightTasks = 0;
    this.processedEntries = 0;
    this.processor = processor;
    this.eventEmitter = new EventEmitter();
    this.promiseExecution = null;
    this.timeout = timeout;
    this.error = null;
    this.allowStopOnFailure = false;
    this.retryLimitCount = 0;
  }

  /**
   * The purpose of the create method is to create an Arehs instance from a specific array of data.
   *
   * @param data
   */
  static create<T>(data: T[]): Arehs<T, unknown> {
    return new this(data, 10, () => Promise.resolve({}), 0) as Arehs<T, unknown>;
  }

  /**
   * Methods that set the value for parallelism and return the current instance.
   *
   * @param concurrency
   */
  withConcurrency(concurrency: number): this {
    this.concurrency = concurrency;
    return this;
  }

  /**
   * Set the timeout time.
   * The default value is 0. If it's greater than 0, the option works, and an error is thrown if the operation takes longer than the timeout time(ms).
   *
   * @param ms
   */
  timeoutLimit(ms = 0) {
    if (ms < 0) {
      throw new Error('The parameter for timeoutLimit must be set to a value greater than 0.');
    }
    this.timeout = ms;
    return this;
  }

  /**
   * Set whether to stop on failure.
   *
   * @param stopOnFailure
   */
  stopOnFailure(stopOnFailure: boolean): this {
    this.allowStopOnFailure = stopOnFailure;
    return this;
  }

  /**
   * Set a limit on the number of retries on failure.
   *
   * @param retryLimit
   */
  retryLimit(retryLimit: number): this {
    this.retryLimitCount = retryLimit;
    return this;
  }

  /**
   * Calling the mapAsync function starts the process of asynchronously processing the input data and returning the results.
   * If the stopOnFailure option is set to true, the function stops processing and emits appropriate events.
   * This can be useful for handling transient errors or ensuring data processing resilience.
   * Also, if the retryLimit option is greater than 0, you can set a limit on the number of retries on failure.
   *
   * @param processor The function responsible for processing each data item. If allowStopOnFailure is true, retry logic is applied.
   * @returns A Promise that resolves to an array of results after processing all data items.
   */
  mapAsync(processor: (data: T) => Promise<R>): Promise<R[]> {
    const retryableProcessor = async (data: T) => {
      let attempts = 0;
      while (true) {
        try {
          return await processor(data);
        } catch (error) {
          if (this.retryLimitCount > 0 && attempts < this.retryLimitCount) {
            attempts++;
            console.error(`Error occurred (${attempts}/${this.retryLimitCount}):`, error);
          } else {
            if (this.allowStopOnFailure) {
              this.inFlightTasks = 0;
              this.processedEntries = 0;
              while (this.data.length) this.data.pop();
              this.eventEmitter.emit(ProcessStatus.ERROR, () => Promise.reject(error));
              this.eventEmitter.emit(ProcessStatus.TASK_COMPLETED);
              this.eventEmitter.emit(ProcessStatus.FINISH);
            }
            throw error;
          }
        }
      }
    };
    this.processor = this.allowStopOnFailure ? retryableProcessor : processor;
    return this._executeProcess();
  }

  /**
   * Method that waits for the currently in-progress task to not exceed the concurrency limit.
   * When the task is complete, raise the TASK_COMPLETED event.
   *
   * @private
   */
  private _waitForTaskCompletion(): Promise<void> {
    if (this.inFlightTasks >= this.concurrency) {
      return new Promise<void>(resolve => {
        this.eventEmitter.once(ProcessStatus.TASK_COMPLETED, resolve);
      });
    } else {
      return Promise.resolve();
    }
  }

  /**
   * Runs an asynchronous task that processes each data item and stores the results in the results array.
   * When the task is complete, raise the TASK_COMPLETED event.
   *
   * @param data
   * @private
   */
  private async _executeTask(data: T): Promise<void> {
    try {
      this.inFlightTasks++;

      const resultPromise = this.processor(data);

      const operations = [resultPromise];
      if (this.timeout > 0) {
        const timeoutPromise = new Promise<R>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`The current task has exceeded the ${this.timeout}ms. `));
          }, this.timeout);
        });
        operations.push(timeoutPromise);
      }

      const result = await Promise.race(operations);
      this.results.push(result);
    } catch (error) {
      this.error = error;
      console.error('_processRecord error:', error);
      this.eventEmitter.emit(ProcessStatus.ERROR, () => Promise.reject(error));
    } finally {
      this.inFlightTasks--;
      this.processedEntries++;
      this.eventEmitter.emit(ProcessStatus.TASK_COMPLETED);
      if (this.inFlightTasks === 0 && this.processedEntries === this.data.length) {
        this.eventEmitter.emit(ProcessStatus.FINISH);
      }
    }
  }

  /**
   * A method that executes an asynchronous operation and collects the result.
   * If a promiseExecution already exists, it returns that promise
   * otherwise, it creates a new promise to start the asynchronous operation.
   *
   * @private
   */
  private _executeProcess(): Promise<R[]> {
    if (this.data.length === 0) {
      this.eventEmitter.emit(ProcessStatus.TASK_COMPLETED);
      this.eventEmitter.emit(ProcessStatus.FINISH);
      return Promise.resolve([]);
    }
    if (this.promiseExecution !== null) {
      return this.promiseExecution;
    }

    this.promiseExecution = new Promise<R[]>((resolve, reject) => {
      const executeTasks = async () => {
        try {
          for (const element of this.data) {
            await this._waitForTaskCompletion();
            this._executeTask(element);
          }
          this.eventEmitter.once(ProcessStatus.FINISH, () => resolve(this.results));
          this.eventEmitter.once(ProcessStatus.ERROR, () => reject(this.error));
        } catch (error) {
          console.error('_executeProcess: ', error);
        }
      };

      executeTasks();
    });

    return this.promiseExecution;
  }
}
