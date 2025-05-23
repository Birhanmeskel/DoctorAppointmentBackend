import cors from 'cors'
import 'dotenv/config'
import express from "express"
import connectCloudinary from "./config/cloudinary.js"
import connectDB from "./config/mongodb.js"
import adminRouter from "./routes/adminRoute.js"
import doctorRouter from "./routes/doctorRoute.js"
import managerRouter from "./routes/managerRoute.js"
import passwordResetRouter from "./routes/passwordResetRoute.js"
import ratingRouter from "./routes/ratingRoute.js"
import roleRouter from "./routes/roleRoutes.js"
import superAdminRouter from "./routes/superAdminRoute.js"
import userRouter from "./routes/userRoute.js"

// app config
const app = express()
const port = process.env.PORT || 4000
connectDB()
connectCloudinary()

// middlewares
app.use(express.json())
app.use(cors())

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log("Headers:", req.headers);
  next();
});

// api endpoints
app.use("/api/user", userRouter)
app.use("/api/manager", managerRouter)
app.use("/api/doctor", doctorRouter);
app.use("/api/auth", roleRouter);
app.use("/api/admin", superAdminRouter);
app.use("/api/admin", adminRouter);
app.use("/api/ratings", ratingRouter);
app.use("/api/password-reset", passwordResetRouter);

app.get("/", (_, res) => {
  res.send("API Working")
});

app.listen(port, () => console.log(`Server started on PORT:${port}`))
