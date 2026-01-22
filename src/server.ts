import dotenv from "dotenv";
dotenv.config();
import app from "./app";

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Ticketing service running on port ${PORT}`);
});
