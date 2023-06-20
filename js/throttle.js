
export function throttle(fn, interval) {
    let last = 0;
    return function () {
        let context = this;
        let arg = arguments;
        let now = +new Date();
        if (now - last >= interval) {
            fn.apply(context, arg);
        }
    }
}