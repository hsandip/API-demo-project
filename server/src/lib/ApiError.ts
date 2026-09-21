export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details)
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, message)
  }
}
