export function isEmptyObject(object) {
    return Object.keys(object).length === 0
}

export function waitAsync(timeout = 1000) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), timeout);
    })
}
