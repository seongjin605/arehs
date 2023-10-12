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

  /**
   * 클래스 인스턴스를 초기화하는 생성자입니다.
   * 입력 데이터(data), 병렬 처리 제한(concurrency), 및 데이터 처리 함수(processor)를 및 타임아웃(timeout)을 받습니다.
   *
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
  }

  /**
   * create 메서드의 목적은 특정한 데이터 배열로부터 Arehs 인스턴스를 생성하기 위함입니다.
   *
   * The purpose of the create method is to create an Arehs instance from a specific array of data.
   *
   * @param data
   */
  static create<T>(data: T[]): Arehs<T, unknown> {
    return new this(data, 10, () => Promise.resolve({}), 0) as Arehs<T, unknown>;
  }

  /**
   * 병렬 처리 값을 설정하고 현재 인스턴스를 반환하는 메서드입니다.
   *
   * Methods that set the value for parallelism and return the current instance.
   *
   * @param concurrency
   */
  withConcurrency(concurrency: number): this {
    this.concurrency = concurrency;
    return this;
  }

  /**
   * 타임아웃 시간을 지정합니다.
   * Default 값은 0 입니다. (0보다 크면 옵션이 동작하며, 타임아웃 시간(ms)보다 작업시간이 길면 에러가 발생합니다.
   *
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
   * mapAsync 함수를 호출하면 입력 데이터를 비동기적으로 처리하고 결과를 반환하는 프로세스가 시작됩니다.
   * 이때 각 작업은 동시에 여러 작업이 실행될 수 있지만, concurrency 설정에 따라 제한됩니다.
   * 이것은 대규모 데이터 처리 작업을 효과적으로 관리하고 제어하기 위한 유용한 도구로 사용될 수 있습니다.
   *
   * Calling the mapAsync function starts the process of asynchronously processing the input data and returning the results.
   * At this time, each task can have multiple tasks running at the same time, but this is limited by the concurrency setting.
   * This can be used as a useful tool for effectively managing and controlling large data processing jobs.
   *
   * @param processor
   */
  mapAsync(processor: (data: T) => Promise<R>): Promise<R[]> {
    this.processor = processor;
    return this._executeProcess();
  }

  /**
   * 현재 진행 중인 작업이 concurrency 제한을 초과하지 않도록 기다리는 메서드입니다.
   * 작업이 완료되면 TASK_COMPLETED 이벤트를 발생시킵니다.
   *
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
   * 각 데이터 항목을 처리하는 비동기 작업을 실행하고 결과를 results 배열에 저장합니다.
   * 작업이 완료되면 TASK_COMPLETED 이벤트를 발생시킵니다.
   *
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
   * 비동기 작업을 실행하고 결과를 수집하는 메서드입니다. promiseExecution 이 이미 존재하면 해당 프로미스를 반환하고,
   * 그렇지 않으면 새로운 프로미스를 생성하여 비동기 작업을 시작합니다.
   *
   * A method that executes an asynchronous operation and collects the result.
   * If a promiseExecution already exists, it returns that promise
   * otherwise, it creates a new promise to start the asynchronous operation.
   *
   * @private
   */
  private _executeProcess(): Promise<R[]> {
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
