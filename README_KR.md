<p align="center">
    <img src="https://github.com/seongjin605/arehs/blob/main/arehs.svg" width="400px" alt="Arehs Logo" />
<p>

# 🏛️ Arehs

`Arehs`는 Promise 기반의 대규모 병렬 처리에 적합합니다. 당신의 어플리케이션 성능을 향상시키는 라이브러리입니다. 💪

**이를 통해 다음과 같은 여러 가지를 달성할 수 있습니다:**

* 프로미스 풀의 동시성을 설정하여 서비스 처리량을 제어할 수 있습니다.
* 프로미스 풀의 동시성을 설정하여 다운스트림 서비스의 부하를 관리합니다.
* 애플리케이션의 성능 향상
* CPU 유휴 시간 감소 등

## 📚 Getting Started

Arehs는 CommonJS와 ES Modules를 지원합니다.

### CommonJS

```javascript
const { Arehs } = require("arehs");
```

### ES Modules

```javascript
import { Arehs } from "arehs";
```

### Example

* `create`: create 메서드의 목적은 특정한 데이터 배열로부터 Arehs 인스턴스를 생성하기 위함입니다.
* `withConcurrency`: 병렬 처리 값을 설정하고 현재 인스턴스를 반환하는 메서드입니다. (default: 10)
* `timeoutLimit`:Default 값은 0 입니다. (0보다 크면 옵션이 동작하며, 타임아웃 시간(ms)보다 작업시간이 길면 에러가 발생합니다.
* `mapAsync`: mapAsync 함수를 호출하면 입력 데이터를 비동기적으로 처리하고 결과를 반환하는 프로세스가 시작됩니다.
  이때 각 작업은 동시에 여러 작업이 실행될 수 있지만, concurrency 설정에 따라 제한됩니다.
  이것은 대규모 데이터 처리 작업을 효과적으로 관리하고 제어하기 위한 유용한 도구로 사용될 수 있습니다.

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

테스트 결과 `Arehs`는 `Promise.all`에 비해 약 30% 이상 향상될 수 있는 것으로 나타났습니다.

```bash
    promiseAllTime: 19.859867874979972(s)
    promisePoolTime: 13.55725229203701(s)
```

### Promise.all

보시다시피, `Promise.all`은 배치에서 가장 느린 프로미스만큼 오래 실행됩니다.   
따라서 메인 스레드는 기본적으로 "아무것도 하지 않는" 상태이며 가장 느린 요청이 완료되기를 기다리고 있습니다.  
Promise 배열에서 가장 긴 프로미스인 **4번**이 청크의 실행 시간이 됩니다.  
이로 인해 가장 긴 프로미스가 완료될 때까지 다음 프로미스가 아무 작업도 수행하지 않는 비효율적인 문제가 발생합니다.
<p align="center">
    <img src="https://velog.velcdn.com/images/preciou_star/post/d35894aa-4ce4-4bf1-aa04-3486745964ed/image.webp" width="700px" alt="Code Crafters Logo" />
<p>

### Arehs

`Arehs`는 프로미스 풀 패턴을 실행하여 Node.js의 메인 스레드를 최대한 활용하는 것이 핵심입니다.  
활용도를 높이려면 API 호출(또는 다른 비동기 작업)을 조밀하게 패킹하여 가장 긴 호출이 완료되는 동안 기다리지 않도록 해야 합니다.  
기다리지 않고 첫 번째 호출이 완료되는 즉시 다음 호출을 예약합니다.
<p align="center">
    <img src="https://velog.velcdn.com/images/preciou_star/post/e49061b9-f18a-4d59-8c6d-aaf240fd9085/image.webp" width="700px" alt="Code Crafters Logo" />
<p>

## 🙋‍♀️FAQ

**`Arehs`는 항상 `Promise.all`보다 좋나요?**

아뇨, **No Silver Bullet(은탄환은 없다)**.  
많은 API 호출과 비동기 작업을 할 때 애플리케이션의 성능을 향상시킬 수 있습니다.     
또한, 각 프로미스의 작업 시간이 거의 동일한 상황에서는 큰 차이를 만들지 못할 수도 있습니다.    
사용 중인 환경에서 `Promise.all`로 더 이상 성능 향상을 얻을 수 없다면 시도해 볼 수는 있지만,  
`Promise.all`로 충분하다면 굳이 사용할 필요는 없습니다.  
따라서 성능 개선이 필요한 프로젝트에 `Arehs`를 사용하려면 충분한 테스트를 거친 후에 사용해 보세요.  
도움이 되길 바랍니다. 감사합니다.

## 👨‍👩‍👧‍👦 Contributors

- Author: Jin Park