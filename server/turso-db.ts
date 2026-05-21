import { connect } from "@tursodatabase/serverless";
import { config } from "dotenv";
config(); // Load environment variables from .env file

// console.log("Turso URL:", process.env.TURSO_DATABASE_URL);
// console.log("Turso Auth Token:", process.env.TURSO_AUTH_TOKEN);

export default connect({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
