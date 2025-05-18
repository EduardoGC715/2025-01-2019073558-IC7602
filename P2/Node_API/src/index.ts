import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import { apiKeyCache, initializeApiKeyListener } from "#/utils/apiKeyCache";
import { authenticateServer } from "#/middlewares";
import { authRoutes } from "#/routes";

initializeApiKeyListener();

const port = process.env.PORT || 3000;
const app = express();

app.use(cors());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(authenticateServer);

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use("/auth", authRoutes);

app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});

export { app };
/* Referencias:
código básico generado por express-generator: https://expressjs.com/en/starter/generator.html
Estructura basada en: https://medium.com/@finnkumar6/mastering-express-js-controllers-the-key-to-clean-and-scalable-applications-45e35f206d0b
*/
