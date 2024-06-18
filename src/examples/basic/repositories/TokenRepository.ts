import { instrument, logEnter } from "../../../instrument.ts";

type Tokens = {
  authToken: string;
  refreshToken: string;
};

export class TokenRepository {
  @instrument(logEnter("Issuing tokens for user"))
  // deno-lint-ignore no-unused-vars
  public generateUserToken(id: number): Promise<Tokens> {
    return Promise.resolve({
      authToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
      refreshToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODEwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.E0uq7OLbMmqSViHYTadPEJ_2F1QiIRyXaPwXFfeigrU",
    });
  }
}
