import { Arehs } from '../src';
import _ from 'lodash';

function sleep(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

let mockDatabase: Array<number> = [];

function clear() {
  mockDatabase = [];
}

function count() {
  return mockDatabase.length;
}

async function insert(ms: number) {
  await sleep(ms);
  mockDatabase.push(ms);
  return ms;
}

async function measurePromiseAll(times: number[], chunkSize: number) {
  clear();
  const chunkAll = _.chunk(times, chunkSize);
  console.log(`chunkAll.length: ${chunkAll.length}, chunk.length: ${chunkAll[0].length}`);
  const startTime = performance.now();

  for (const chunk of chunkAll) {
    await Promise.all(chunk.map((time: number) => insert(time)));
  }

  const endTime = performance.now();
  const elapsedTime = endTime - startTime;

  const executionTime = elapsedTime / 1000;
  console.log(`PromiseAll Total time elapsed: ${executionTime} s, count: ${count()})`);

  return executionTime;
}

async function measurePromisePool(times: number[], chunkSize: number) {
  clear();
  try {
    const startTime = performance.now();

    const result = await Arehs.create(times).timeoutLimit(5000).withConcurrency(chunkSize).mapAsync(insert);
    console.log('result:', result);

    const endTime = performance.now();
    const elapsedTime = endTime - startTime;

    const executionTime = elapsedTime / 1000;
    console.log(`PromisePool Total time elapsed: ${executionTime} s, count: ${count()})`);
    return executionTime;
  } catch (error) {
    console.error('error:', error);
  }
}

function getRandomTime(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function measure(chunkSize = 100) {
  const times = Array.from({ length: 1000 }, () => getRandomTime(500, 2000));

  const [promiseAllTime, promisePoolTime] = await Promise.all([
    measurePromiseAll(times, chunkSize),
    measurePromisePool(times, chunkSize)
  ]);
  return { promiseAllTime, promisePoolTime };
}

jest.setTimeout(1000 * 60 * 3);

test('Performance Test (All vs Pool)', async () => {
  const { promiseAllTime, promisePoolTime } = await measure();
  console.log('promiseAllTime:', promiseAllTime);
  console.log('promisePoolTime:', promisePoolTime);

  expect(promisePoolTime).toBeLessThanOrEqual(promiseAllTime);
});
