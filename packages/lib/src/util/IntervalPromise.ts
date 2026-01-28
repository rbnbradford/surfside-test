type Resolve<T> = (value: T | PromiseLike<T>) => void;
type Reject = (reason?: unknown) => void;
type Handler<T> = (resolve: Resolve<T>, reject: Reject) => void;

export const IntervalPromise = <T>(handler: Handler<T>, delayMs: number): Promise<T> =>
  new Promise<T>((res, rej) => {
    let interval: NodeJS.Timeout;
    const resolve: Resolve<T> = (value) => {
      clearInterval(interval);
      res(value);
    };
    const reject: Reject = (reason) => {
      clearInterval(interval);
      rej(reason);
    };
    interval = setInterval(() => Promise.resolve(handler(resolve, reject)).catch(reject), delayMs);
  });
