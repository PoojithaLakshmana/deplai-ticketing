import express from "express";
import ticketRoutes from "./routes/tickets";

const app = express();

app.use(express.json());
app.use("/tickets", ticketRoutes);

export default app;
