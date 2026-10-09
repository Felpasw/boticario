import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          error: 'VALIDATION_ERROR',
          message: 'Request payload failed validation',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            issue: issue.message,
          })),
        });
      }
      throw error;
    }
  }
}
