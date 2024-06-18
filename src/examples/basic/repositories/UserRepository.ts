import { instrument, logExit, logReturnValue } from "../../../instrument.ts";

type User = {
  id: number;
  username: string;
  password: string;
};

export class UserRepository {
  @instrument(
    logExit("Found user matching username"),
    logReturnValue((user) => ({ "user.id": user.id })),
  )
  public findUserByUsername(username: string): Promise<User> {
    return Promise.resolve({
      id: 42,
      username,
      password: "password",
    });
  }
}
