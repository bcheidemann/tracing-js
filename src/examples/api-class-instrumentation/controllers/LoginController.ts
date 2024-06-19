import { instrument, log, skip } from "../../../instrument.ts";
import type { AuthService } from "../services/AuthService.ts";

type LoginResponse = {
  tokens: {
    authToken: string;
    refreshToken: string;
  };
};

export class LoginController {
  constructor(private readonly authService: AuthService) {}

  @instrument(log(), skip("password"))
  public async login(
    username: string,
    password: string,
  ): Promise<LoginResponse> {
    const tokens = await this.authService.login(username, password);

    return {
      tokens: {
        authToken: tokens.authToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }
}
