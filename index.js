const express = require("express");
require('dotenv').config();
const util = require("./util");
const axios = require("axios");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
const exp = require("constants");

const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 3000;
const client_id = process.env.SPOTIFY_CLIENT_ID || "SPOTIFY_CLIENT_ID";
const client_secret = process.env.SPOTIFY_CLIENT_SECRET || "SPOTIFY_CLIENT_SECRET";
const redirect_uri = `http://localhost:${PORT}/callback`;

console.log(client_id, redirect_uri);

const stateKey = "spotify_state_key";

app.get("/", function (req, res) {
  res.json({ test: 200 });
});

app.get("/login", function (req, res) {
  var state = util.generateRandomString(16);
  var scope = "user-read-private user-read-email";

  res.cookie(stateKey, state);

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/callback", async function (req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const error = req.query.error || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    try {
      const tokenResponse = await axios({
        method: "post",
        url: "https://accounts.spotify.com/api/token",
        params: {
          grant_type: "authorization_code",
          code: code,
          redirect_uri: redirect_uri,
        },
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            new Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
      });
      res.json(tokenResponse.data);
    } catch (error) {
      console.error("Error fetching access token: ", error);
      res.redirect("/#" + express.querystring.stringify({
        error: "invalid_token"
      }));
    }
  }
});

app.get("/me", async function(req, res) {
  const token = req.headers.authorization;
  try {
    const response = await axios({
      method: 'get',
      url: 'https://api.spotify.com/v1/me',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching profile: ", error);
    res.json({
      500: "Internal server error"
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
