const RESPONSE_FORMATS = {
    auth: (message, error) => ({ msg: message, error }),
    user: (message) => ({ msg: message }),
    music: (message) => ({
        error: message,
        details: message,
    }),
    message: (message, error) => ({ message, error }),
};

const handleServiceError = (res, error, options = {}) => {
    const {
        fallbackMessage = 'Something went wrong',
        context,
        format = 'auth',
        includeError = true,
    } = options;

    const logLabel = context ? `Error during ${context}` : fallbackMessage;
    console.error(logLabel, error);

    const status = error.status || 500;
    const message = error.message || fallbackMessage;
    const buildResponse = RESPONSE_FORMATS[format] || RESPONSE_FORMATS.auth;
    const body = buildResponse(message, includeError ? error : undefined);

    return res.status(status).json(body);
};

module.exports = { handleServiceError };
