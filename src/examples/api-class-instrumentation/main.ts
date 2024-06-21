import "../__utils__/snapshotHelper.ts";
import { debug } from "../../event.ts";
import { Level } from "../../level.ts";
import { infoSpan } from "../../span.ts";
import { FmtSubscriber } from "../../subscriber.ts";
import { LoginController } from "./controllers/LoginController.ts";
import { TokenRepository } from "./repositories/TokenRepository.ts";
import { UserRepository } from "./repositories/UserRepository.ts";
import { AuthService } from "./services/AuthService.ts";

FmtSubscriber.setGlobalDefault({
  level: Level.DEBUG,
  abbreviateLongFieldValues: true,
});

const userRepository = new UserRepository();
const tokenRepository = new TokenRepository();
const authService = new AuthService(userRepository, tokenRepository);
const controller = new LoginController(authService);

using _guard = infoSpan("request", { requestId: "123" }).enter();

const response = await controller.login("user", "password");
debug("Issued tokens", { tokens: response.tokens });
