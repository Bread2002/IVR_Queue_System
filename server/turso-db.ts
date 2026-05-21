import { connect } from "@tursodatabase/serverless";

export default connect({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
