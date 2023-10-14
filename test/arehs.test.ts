import { Arehs } from '../src';

jest.setTimeout(1000 * 60 * 3);

test('Performance Test (Arehs vs All)', () => {
  const delay = (i: number) => {
    return new Promise((res, rej) => {
      setTimeout(() => {
        res(i);
      }, 150 + Math.random() * 1000);
    });
  };

  (async () => {
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
    expect(endArehs - startArehs).toBeLessThanOrEqual(endPromiseAll - startPromiseAll);
  })();
});
