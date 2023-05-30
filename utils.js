import { WebhookClient } from "discord.js";
import { saveAttachment } from "./controllers.js";
import { whiteList, users } from "./config.js";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();
const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_URL });

export async function extract(json) {
  try {
    const fileMap = new Map();
    const bodyArr = [];

    function helper(obj) {
      for (let key in obj) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
          helper(obj[key]);
        }
      }

      if ("filename" in obj && "attachmentId" in obj.body) {
        fileMap.set(obj.body.attachmentId, {
          fileName: obj.filename,
          size: obj.body.size,
        });
      } else if (obj.mimeType === "text/plain") {
        bodyArr.push(obj.body.data);
      }
    }

    helper(json);
    return [fileMap, bodyArr];
  } catch (err) {
    console.error(`Something went wrong trying to get data from email: ${err}`);
  }
}

export async function sendEmbed(from, subject, body) {
  try {
    const avatar = users.get(from)?.pfp ?? "https://imgur.com/5rdlSKQ.png";
    const embedColour = users.get(from)?.embedColour ?? 0x000000;

    const bodyArr = splitString(body);
    const firstbody = bodyArr.shift();

    if (from.length > 80) {
      console.log(`Name is to long: ${from}`);
      from = "Name was too long";
    }

    await webhookClient
      .edit({
        name: from,
        avatar: avatar,
      })
      .catch(console.error);

    const embed = {
      title: `***${subject}***`,
      description: firstbody,
      color: embedColour,
    };
    await webhookClient.send({ embeds: [embed] }).catch(console.error);

    bodyArr.forEach(async (body) => {
      const embed = {
        description: body,
        color: embedColour,
      };
      await webhookClient.send({ embeds: [embed] }).catch(console.error);
    });

    console.log(`Sent mail from: ${from}`);
  } catch (err) {
    console.error(`Something went wrong trying to send a embed: ${err}`);
  }
}

export async function sendAtt(messageID, map) {
  try {
    const promiseArr = [];
    const arr = [];

    map.forEach((value, key) => {
      const saved = saveAttachment(messageID, key, value.fileName);
      arr.push({
        attachment: `./attachments/${value.fileName}`,
        name: value.fileName,
      });
      promiseArr.push(saved);
    });

    await Promise.all(promiseArr);

    const arrInChunks = await splitArrayIntoChunks(arr);

    for (const miniArr of arrInChunks) {
      await webhookClient
        .send({
          files: miniArr,
        })
        .then(() => console.log(`Sent attachments`))
        .catch(console.error);

      miniArr.forEach((data) => {
        fs.unlink(`./attachments/${data.name}`, (err) => {
          if (err) {
            console.error("Error deleting attachment file:", err);
          } else {
            console.log(`Deleted attachment ${data.name}`);
          }
        });
      });
    }
  } catch (err) {
    console.error(`Something went wrong trying to send a attachment: ${err}`);
  }
}

export default function generateConfig(url, accessToken) {
  try {
    return {
      method: "get",
      url: url,
      headers: {
        Authorization: `Bearer ${accessToken} `,
        "Content-type": "application/json",
      },
    };
  } catch (err) {
    console.error(`Something went wrong trying to generate config: ${err}`);
  }
}

function splitString(str) {
  try {
    const result = [];

    for (let i = 0; i < str.length; i += 4096) {
      const chunk = str.slice(i, i + 4096);
      result.push(chunk);
    }

    return result;
  } catch (err) {
    console.error(`Something went wrong trying to split a string: ${err}`);
  }
}

async function splitArrayIntoChunks(array) {
  try {
    const result = [];

    for (let i = 0; i < array.length; i += 10) {
      const chunk = array.slice(i, i + 10);
      result.push(chunk);
    }

    return result;
  } catch (err) {
    console.error(`Something went wrong trying to split a array: ${err}`);
  }
}

export function base64ToUTF8(base64Str) {
  try {
    return Buffer.from(base64Str, "base64").toString("utf-8");
  } catch (err) {
    console.error(`Something went wrong trying to recode base64: ${err}`);
  }
}

export async function isInWhiteList(from) {
  try {
    if (whiteList.length === 0) return true;

    let is;

    whiteList.forEach((element) => {
      if (element === from) {
        is = true;
      }
    });

    return is;
  } catch (err) {
    console.error(
      `Something went wrong trying to chech if ${from} is whitelisted: ${err}`
    );
  }
}
