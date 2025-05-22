import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import cors from "cors";
import { apiKeyCache, initializeApiKeyListener } from "./utils/apiKeyCache";
import { authenticateServer, authenticateJWT } from "./middlewares";
import { authRoutes, domainRoutes, subdomainRoutes } from "./routes";
import fs from "fs";
import https from "https";

const port = process.env.PORT || 3000;
const app = express();

app.use(cors({ origin: true, credentials: true }));

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(authenticateServer);

app.get("/hello", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.get("/status", (req: Request, res: Response) => {
  res.send("Online");
});

app.use("/auth", authRoutes);

app.use("/domain", authenticateJWT, domainRoutes);

app.use("/subdomain", subdomainRoutes);

if (process.env.NODE_ENV === "production") {
  app.listen(port, () => {
    console.log(`Server is running on ${port}`);
  });
} else {
  const sslOptions = {
    key: fs.readFileSync("./src/certs/key.pem"),
    cert: fs.readFileSync("./src/certs/cert.pem"),
  };
  https.createServer(sslOptions, app).listen(port, () => {
    console.log(`Server is running on ${port}`);
  });
}

export default app;
/* Referencias:
código básico generado por express-generator: https://expressjs.com/en/starter/generator.html
Estructura basada en: https://medium.com/@finnkumar6/mastering-express-js-controllers-the-key-to-clean-and-scalable-applications-45e35f206d0b
*/
