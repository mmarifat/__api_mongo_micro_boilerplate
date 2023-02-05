import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { RpcSystemException } from '@packages/exceptions';
import { JwtRpcPayload } from '@packages/interfaces';

@Injectable()
export class RpcRtGuard implements CanActivate {
    constructor(private readonly configService: ConfigService, private readonly jwtService: JwtService) {}

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const token = { ...context.switchToRpc().getData() } as JwtRpcPayload;
        if (token && token.hasOwnProperty('__refreshToken')) {
            return this.jwtService
                .verifyAsync(token?.__refreshToken, { secret: this.configService.get<string>('REFRESH_SECRET') })
                .then((res) => {
                    delete context.switchToRpc().getData().__accessToken;
                    delete context.switchToRpc().getData().__refreshToken;
                    context.switchToRpc().getData().__jwtUser = { ...token, ...res };
                    return true;
                })
                .catch(() => this.throwError());
        } else {
            this.throwError();
        }
    }

    throwError = () => {
        throw new RpcSystemException({ isGuard: true, guardMessage: 'INVALID_MICRO_REFRESH_TOKEN' });
    };
}
