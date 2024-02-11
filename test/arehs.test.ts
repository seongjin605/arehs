import { Arehs } from '../src';

jest.setTimeout(1000 * 60 * 3);

const delay = (i: number) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(i);
    }, 150 + Math.random() * 1000);
  });
};

const delayOrError = (i: number) => {
  return new Promise((res, rej) => {
    if (i === 777) {
      return rej(runtimeException(i));
    }
    setTimeout(() => {
      res(i);
    }, 150 + Math.random() * 1000);
  });
};

function runtimeException(i: number) {
  throw new Error(`This is runtimeException: ${i}`);
}

async function getRuntime() {
  const tasks = Array.from({ length: 1000 }).map((d, i) => i);

  const startArehs = performance.now();
  await Arehs.create(tasks).withConcurrency(50).mapAsync(delay);
  const endArehs = performance.now();

  console.log(`Arehs: ${endArehs - startArehs}ms`);

  const startPromiseAll = performance.now();
  while (tasks.length > 0) {
    const chunkedTasks = tasks.splice(0, 50);
    await Promise.all(chunkedTasks.map(delay));
  }
  const endPromiseAll = performance.now();

  console.log(`Promise.all: ${endPromiseAll - startPromiseAll}ms`);

  return {
    startArehs,
    endArehs,
    startPromiseAll,
    endPromiseAll
  };
}

async function getRuntimeWithException() {
  try {
    const tasks = Array.from({ length: 1000 }).map((d, i) => i);

    const startArehs = performance.now();
    await Arehs.create(tasks)
      .withConcurrency(50)
      .stopOnFailure(true)
      .retryLimit(3)
      .mapAsyncWithRetry(delayOrError);
    const endArehs = performance.now();

    console.log(`Arehs Exception: ${endArehs - startArehs}ms`);

    const startPromiseAll = performance.now();
    while (tasks.length > 0) {
      const chunkedTasks = tasks.splice(0, 50);
      await Promise.all(chunkedTasks.map(delay));
    }
    const endPromiseAll = performance.now();

    console.log(`Promise.all Exception: ${endPromiseAll - startPromiseAll}ms`);

    return {
      startArehs,
      endArehs,
      startPromiseAll,
      endPromiseAll
    };
  } catch (error: any) {
    throw new Error(error);
  }
}

test('Performance Test', async () => {
  const { startArehs, endArehs, startPromiseAll, endPromiseAll } = await getRuntime();
  expect(endArehs - startArehs).toBeLessThanOrEqual(endPromiseAll - startPromiseAll);
});

test('Test Exception', async () => {
  await expect(async () => {
    await getRuntimeWithException();
  }).rejects.toThrowError('This is runtimeException: 777');
});
