const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const redis = require("redis");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const REDIS_PORT = process.env.REDIS_PORT;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_HOST = process.env.REDIS_HOST;

const redisClient = redis.createClient({
  password: REDIS_PASSWORD,
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});
redisClient
  .connect()
  .then(() => {
    console.log("Connected to Redis");
  })
  .catch((err) => {
    console.error("Redis connection error:", err);
  });

const users = [
  {
    email: "santhosh@gmail.com",
    password: "12345678",
    name: "Santhosh",
    age: 25,
    address: {
      street: "123 Main St",
      city: "Kallakurichi",
      state: "Tamil Nadu",
      zip: "606202",
    },
    phoneNumber: "1234567890",
  },
  {
    email: "sanjay@gmail.com",
    password: "qwerty",
    name: "Sanjay",
    age: 27,
    address: {
      street: "456 Elm St",
      city: "Chennai",
      state: "Tamil Nadu",
      zip: "600001",
    },
    phoneNumber: "1234567890",
  },
];

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    for (let i = 0; i < users.length; i++) {
      const element = users[i];
      if (element.email === email && element.password === password) {
        const session_id = uuidv4();
        await redisClient.hSet(session_id, {
          email: element.email,
          password: element.password,
          name: element.name,
          age: element.age.toString(),
          address: JSON.stringify(element.address),
          phoneNumber: element.phoneNumber,
        });
        res.cookie("sessionID", session_id, {
          httpOnly: true,
          secure: false,
          sameSite: "Strict",
          maxAge: 24 * 60 * 60 * 1000,
        });
        return res.send("Logged in successfully!");
      }
    }
    res.status(404).send("Login failed");
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal error");
  }
});

app.get("/checkAuth", async (req, res) => {
  try {
    const sessionID = req.cookies.sessionID;
    if (sessionID) {
      const user = await redisClient.hGetAll(sessionID);
      if (user && user.email) {
        return res.json({ isAuthenticated: true });
      }
    }
    res.json({ isAuthenticated: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ isAuthenticated: false });
  }
});

app.get("/user", async (req, res) => {
  try {
    const sessionID = req.cookies.sessionID;
    if (sessionID) {
      const user = await redisClient.hGetAll(sessionID);
      if (user && user.email) {
        return res.json(user);
      }
    }
    res.json({ isAuthenticated: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ isAuthenticated: false });
  }
});

app.post("/logout", async (req, res) => {
  try {
    const sessionID = req.cookies.sessionID;
    if (sessionID) {
      await redisClient.del(sessionID);

      res.clearCookie("sessionID", {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
      });

      return res.send("Logged out successfully!");
    }

    res.status(400).send("No session found");
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal error");
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
