import generateConfig from "./utils.js";
import { google } from "googleapis";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";
dotenv.config();

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

export async function getEmailIDs() {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${process.env.MAIL_USERNAME}/messages`;
    const { token } = await oAuth2Client.getAccessToken();
    let config = generateConfig(url, token);
    const response = await axios(config);
    let data = await response.data;

    const newData = JSON.stringify(data);
    fs.writeFileSync("./data/messageIDs.json", newData);
    return data;
  } catch (err) {
    console.log(`Something went wrong trying to get email IDs: ${err}`);
  }
}

export async function readMail(messageID) {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${process.env.MAIL_USERNAME}/messages/${messageID}`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);
    const data = await response.data;

    const newData = JSON.stringify(data);
    fs.writeFileSync("./data/message.json", newData);
    return data;
  } catch (err) {
    console.log(`Something went wrong trying to save email content: ${err}`);
  }
}

export async function saveAttachment(messageID, attachmentID, fileName) {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/${process.env.MAIL_USERNAME}/messages/${messageID}/attachments/${attachmentID}`;
    const { token } = await oAuth2Client.getAccessToken();
    const config = generateConfig(url, token);
    const response = await axios(config);
    let data = await response.data;

    const newData = Buffer.from(data.data, "base64");
    fs.writeFileSync(`./attachments/${fileName}`, newData);
    console.log(`Saved attachment ${fileName}`);
  } catch (err) {
    console.log(
      `Something went wrong trying to save email attachments: ${err}`
    );
  }
}
