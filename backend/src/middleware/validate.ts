import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Returns 400 with the first validation error message on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const first = (result.error as ZodError).issues[0]
      res.status(400).json({
        success: false,
        error: `${first.path.join('.') || 'body'}: ${first.message}`
      })
      return
    }
    req.body = result.data
    next()
  }
}
