<p align="center">
    <img src="https://github.com/seongjin605/arehs/blob/main/arehs.svg" width="400px" alt="Arehs Logo" />
<p>

# 🏛️ Arehs

`Arehs` is ideal for promise-based massively parallel processing. Improve your application performance. 💪

**In that way we can achieve multiple things:**

* Control the throughput of our service by setting the concurrency of the Promise Pool.
* Manage load on the downstream services by setting the concurrency of the Promise Pool.
* Increase the performance of our application
* Reduced CPU idle time, etc.

## 📚 Getting Started

Arehs supports both CommonJS and ES Modules.

### CommonJS

```javascript
const { Arehs } = require("arehs");
```

### ES Modules

```javascript
import { Arehs } from "arehs";
```

### Example

* `create`: The purpose of the create method is to create an Arehs instance from a specific array of data.
* `withConcurrency`: Methods that set the value for parallelism and return the current instance.(default: 10)
* `timeoutLimit`: The default value is 0. If it's greater than 0, the option works, and an error is thrown if the
  operation takes longer than the timeout time(ms).
* `mapAsync`: Calling the mapAsync function starts the process of asynchronously processing the input data and returning
  the results.
  At this time, each task can have multiple tasks running at the same time, but this is limited by the concurrency
  setting.
  This can be used as a useful tool for effectively managing and controlling large data processing jobs.

```typescript
import { Arehs } from "arehs";

const dataArr = [
  { id: 1, name: "John" },
  { id: 2, name: "Alice" },
  { id: 3, name: "Bob" }
];

const result = await Arehs.create(dataArr)
  .withConcurrency(10)
  .mapAsync(async data => {
    return await someAsyncFunction(data);
  });
```

## ⚡️ Performance

Tests have shown that `Arehs` can be improved by about 30% over `Promise.all`.

```javascript
import { Arehs } from "arehs";

const delay = (i) => {
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
})();
```

```bash
    promiseAllTime: 19.859867874979972(s)
    promisePoolTime: 13.55725229203701(s)
```

### Promise.all

As you can see, `Promise.all` runs as long as the slowest promise in the batch.   
So your main thread is basically “doing nothing” and is waiting for the slowest request to finish.  
The longest promise in the Promise array, **number 4**, will be the chunk's execution time.  
This creates an inefficient problem where the next promises don't do any work until the longest promise is finished.
<p align="center">
    <img src="https://velog.velcdn.com/images/preciou_star/post/d35894aa-4ce4-4bf1-aa04-3486745964ed/image.webp" width="700px" alt="Code Crafters Logo" />
<p>

### Arehs

**Arehs** is all about making the most of Node.js's main thread by running the Promise Pool Pattern.    
To achieve better utilization we need densely pack the API calls (or any other async task) so that we do not wait while
the most extended call completes, rather we schedule the next call as soon as the first one finishes.
<p align="center">
    <img src="https://velog.velcdn.com/images/preciou_star/post/e49061b9-f18a-4d59-8c6d-aaf240fd9085/image.webp" width="700px" alt="Code Crafters Logo" />
<p>

## 🙋‍♀️FAQ

**Is this always better than `Promise.all`?**

No, there is **No silver bullet**.  
This can increase your application's performance when you're making a lot of API calls and asynchronous operations.   
Also, it may not make much difference in situations where each promise has roughly the same work time.  
If you can't get any further performance improvement with `Promise.all` in your environment,   
you can give it a try, but if you can get by with `Promise.all`, you don't have to.  
Therefore, you should try to use `Arehs` in your projects that need performance improvements only after thoroughly
testing it.  
It will help you. Thank you.

## 👨‍👩‍👧‍👦 Contributors

- Author: Jin Park
