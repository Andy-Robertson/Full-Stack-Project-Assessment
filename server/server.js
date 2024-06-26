require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
const app = express();
const port = process.env.PORT || 5000;

// Connect to `youtube-video-db` on hertaku
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Enable cross-origin resource sharing middleware in app
app.use(cors());

// Enable POST's from a form in app
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Server static files from client build folder
app.use(express.static(path.join(__dirname, "../client/build")));

//GET endpoint `/` to retrieve the complete and sorted video list
app.get("/api", (req, res) => {
  const sortOrder = req.query.order;

  const allVideosSortedQuery =
    sortOrder === "asc"
      ? "SELECT * FROM youtube_videos ORDER BY rating ASC"
      : "SELECT * FROM youtube_videos ORDER BY rating DESC";

  pool
    .query(allVideosSortedQuery)
    .then((result) => {
      result.rows.length <= 0
        ? res.status(400).json({
            result: "failure",
            message: "BAD REQUEST: Unable to retrieve video list",
          })
        : res.status(200).json(result.rows);
    })
    .catch((e) => res.status(400).send(e));
});

// GET endpoint `/api/:id`
app.get("/api/:id", (req, res) => {
  const videoId = Number(req.params.id);

  if (!Number.isInteger(videoId)) {
    return res.status(400).json({
      result: "failure",
      message: "BAD REQUEST: Invalid input type",
    });
  }

  pool
    .query("SELECT * FROM youtube_videos WHERE id = $1", [videoId])
    .then((result) => {
      result.rows.length <= 0
        ? res.status(404).json({
            result: "failure",
            message: `NOT FOUND: No Video with id:${videoId} in list`,
          })
        : res.status(200).json(result.rows);
    })
    .catch((e) => res.status(400).send(e));
});

// POST endpoint `/api` to add new video content with valid field / error check
app.post("/api", (req, res) => {
  const { title, url, uploaded } = req.body;
  const rating = 0;

  if (title === undefined || url === undefined) {
    return res.status(400).json({
      result: "failure",
      message: `BAD REQUEST: Video could not be saved, title and url fields cannot be empty`,
    });
  }

  const insertNewVideo = `
    INSERT INTO
      youtube_videos (title, url, rating, uploaded)
    VALUES
      ($1, $2, $3, $4) RETURNING id`;

  pool
    .query(insertNewVideo, [title, url, rating, uploaded])
    .then((result) => {
      id = result.rows[0].id;

      res.status(201).json({
        result: "success",
        message: `CREATED: Video "${title}" was saved with id:${id}`,
        id: id,
      });
    })
    .catch((e) => res.status(400).send(e));
});

// DELETE endpoint `/api/:id`
app.delete("/api/:id", (req, res) => {
  const videoId = Number(req.params.id);

  if (!Number.isInteger(videoId)) {
    return res.status(400).json({
      result: "failure",
      message: "BAD REQUEST: Invalid input type",
    });
  }

  pool
    .query("DELETE FROM youtube_videos WHERE id = $1", [videoId])
    .then(() => {
      res.status(200).json({});
    })
    .catch((e) => res.status(500).send(e));
});

// PUT endpoint `/api/:id` to update `youtube-video-db.rating`
app.put("/api/:id", (req, res) => {
  const videoId = Number(req.params.id);
  const videoRating = req.body.rating;

  if (!Number.isInteger(videoId)) {
    return res.status(400).json({
      result: "failure",
      message: "BAD REQUEST: Invalid input type",
    });
  }

  pool
    .query("UPDATE youtube_videos SET rating = $1 WHERE id = $2", [
      videoRating,
      videoId,
    ])
    .then(() => {
      res.status(200).json({
        result: "success",
        message: `OK: Video with id:${videoId} updated!`,
      });
    })
    .catch((e) => res.status(400).send(e));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
