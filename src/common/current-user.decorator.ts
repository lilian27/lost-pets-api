import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthRequest, AuthUser } from './auth.guard';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null =>
    ctx.switchToHttp().getRequest<AuthRequest>().user ?? null,
);
