class AppError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = 'AppError';
    }
}

const createAppError = (status, message) => new AppError(status, message);

module.exports = { AppError, createAppError };
