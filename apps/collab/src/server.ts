import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.COLLAB_PORT ?? 4001);

console.log(`Collaboration server scaffold is ready for port ${port}.`);

