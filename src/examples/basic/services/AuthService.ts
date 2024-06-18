import { instrument, skip } from "../../../instrument.ts";
import type { TokenRepository } from "../repositories/TokenRepository.ts";
import type { UserRepository } from "../repositories/UserRepository.ts";

type AuthTokens = {
  authToken: string;
  refreshToken: string;
};

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenRepository: TokenRepository,
  ) {}

  @instrument(skip("password"))
  public async login(username: string, password: string): Promise<AuthTokens> {
    const user = await this.userRepository.findUserByUsername(username);
    if (user.password !== password) {
      throw new Error("Invalid credentials");
    }

    const tokens = await this.tokenRepository.generateUserToken(user.id);

    return {
      authToken: tokens.authToken,
      refreshToken: tokens.refreshToken,
    };
  }
}
