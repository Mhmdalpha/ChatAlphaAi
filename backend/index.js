import express from "express";
import cors from "cors";
import path from "path";
import url, { fileURLToPath } from "url";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
import { requireAuth } from "@clerk/express";
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Setup CORS dan memungkinkan cookies untuk dikirim bersama permintaan
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true, // Mengizinkan pengiriman cookies
  })
);


app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Koneksi ke MongoDB
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log(err);
  }
};

// Setup ImageKit
const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

// Endpoint untuk membuat chat baru (memerlukan autentikasi)
app.post("/api/chats", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const { text } = req.body;

  try {
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });

    const savedChat = await newChat.save();

    const userChats = await UserChats.find({ userId });

    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });

      await newUserChats.save();
    } else {
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );
    }

    res.status(201).send(savedChat._id);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating chat!");
  }
});

// Endpoint untuk mengambil daftar user chats
app.get("/api/userchats", (req, res, next) => {
          console.log("--- Request to /api/userchats ---");
          console.log("Headers:", req.headers);
          console.log("Cookies:", req.headers.cookie); // Atau req.cookies jika menggunakan cookie-parser
          // Cetak properti lain yang relevan jika tahu bagaimana Clerk menggunakannya
          console.log("---------------------------------");
          next(); // Lanjutkan ke middleware requireAuth()
        }, requireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  try {
    const userChats = await UserChats.find({ userId });
    res.status(200).send(userChats[0]?.chats || []);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching userchats!");
  }
});

// Endpoint untuk mengambil chat tertentu berdasarkan ID
app.get("/api/chats/:id", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId });
    res.status(200).send(chat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching chat!");
  }
});

// Endpoint untuk mengupdate chat
app.put("/api/chats/:id", requireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const { question, answer, img } = req.body;

  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    res.status(200).send(updatedChat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding conversation!");
  }
});

app.get('/set-cookie', (req, res) => {
  res.cookie('sessionId', 'abc123', {
    httpOnly: true,      // supaya gak bisa diakses JavaScript (lebih aman)
    secure: true,        // wajib pakai HTTPS, cookie cuma dikirim lewat HTTPS
    sameSite: 'none',    // supaya cookie bisa dikirim di cross-site request
    maxAge: 24 * 60 * 60 * 1000, // masa berlaku cookie 1 hari
    path: '/',           // cakupan cookie untuk semua path
  });
  res.send('Cookie sudah diset!');
});


// Menangani error
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(401).json({ error: "Unauthenticated" });
});

app.get('*', (req, res) => {
  res.redirect('https://chat-alpha-ai.vercel.app');
});


// Menjalankan server
app.listen(port, () => {
  connect();
  console.log(`Server running on ${port}`);
});

