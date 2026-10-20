import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthUser {
  sub: string;
  alias: string;
}

export type AuthRequest = Request & { user?: AuthUser | null };

function resolveUser(jwt: JwtService, req: AuthRequest): AuthUser | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedException('Invalid authorization header');
  }
  try {
    const payload = jwt.verify<AuthUser>(token);
    return { sub: payload.sub, alias: payload.alias };
  } catch {
    throw new UnauthorizedException('Invalid or expired token');
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const user = resolveUser(this.jwt, req);
    if (!user) throw new UnauthorizedException('Authentication required');
    req.user = user;
    return true;
  }
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    req.user = resolveUser(this.jwt, req);
    return true;
  }
}
