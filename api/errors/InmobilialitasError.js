class InmobilialitasError extends Error {
    constructor(status = 500 , ...params) {
        super(...params);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, InmobilialitasError)
        }
        this.status = status;
    }
}
module.exports = InmobilialitasError;