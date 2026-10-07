export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Что-то пошло не так, попробуйте ещё раз'
}
