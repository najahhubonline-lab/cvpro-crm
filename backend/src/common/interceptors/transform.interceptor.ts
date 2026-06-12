import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => {
        // If data already has pagination structure, return as is, otherwise wrap in data
        if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
          return data;
        }
        // If it's an auth response with token, don't wrap it to keep frontend simple
        if (data && typeof data === 'object' && 'access_token' in data) {
          return data;
        }
        return data; // Returning raw data to maintain compatibility with current frontend api.ts
      }),
    );
  }
}
