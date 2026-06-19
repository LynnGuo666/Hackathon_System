from fastapi import HTTPException


class AppError(Exception):
    status_code = 400

    def __init__(self, message: str | None = None):
        self.message = message or self.__class__.__name__
        super().__init__(self.message)


class InvalidEmail(AppError):
    pass


class InvalidCode(AppError):
    pass


class TooManyAttempts(AppError):
    pass


class LoginRequired(AppError):
    status_code = 401


class PermissionDenied(AppError):
    status_code = 403


class NotFound(AppError):
    status_code = 404


class Conflict(AppError):
    status_code = 409


class ServiceUnavailable(AppError):
    status_code = 503


class TooManyRequests(AppError):
    status_code = 429


class InvalidCheckinID(AppError):
    pass


class InvalidResourceCSV(AppError):
    pass


class InvalidProfile(AppError):
    pass


class InvalidNavigation(AppError):
    pass


class NoResource(AppError):
    status_code = 409


def to_http_exception(error: AppError) -> HTTPException:
    return HTTPException(status_code=error.status_code, detail={"error": error.message})
