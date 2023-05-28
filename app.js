import { getEmailIDs, readMail } from "./controllers.js";
import { interval } from "./config.js";
import fs from "fs";
import {
  base64ToUTF8,
  sendEmbed,
  extract,
  sendAtt,
  isInWhiteList,
} from "./utils.js";

async function execute1() {
  while (true) {
    await new Promise((resolve) => setTimeout(resolve, interval));
    await mailLoop();
  }
}

execute1();

async function mailLoop() {
  try {
    const lastMessageID = JSON.parse(
      fs.readFileSync("./data/lastMessageID.json", "utf-8")
    );

    const fetchedEmailIDs = await getEmailIDs();

    if (fetchedEmailIDs.messages[0].id === lastMessageID) return;

    let emailIDs = [];

    for (let i = 0; fetchedEmailIDs.messages[i].id !== lastMessageID; i++) {
      if (i >= 99) break;
      emailIDs.unshift(fetchedEmailIDs.messages[i].id);
    }

    if (emailIDs.length >= 99) {
      console.log(`No mails mached to: ${lastMessageID}`);

      const email = await readMail(emailIDs[emailIDs.length - 1]);

      if (!email.labelIds.includes("INBOX")) {
        const newData = JSON.stringify(emailIDs[emailIDs.length - 1]);
        fs.writeFileSync("./data/lastMessageID.json", newData);
        console.log(
          `Trigger ID has been set to: ${emailIDs[emailIDs.length - 1]}`
        );
        return;
      } else {
        emailIDs = [emailIDs[emailIDs.length - 1]];
      }
    }

    for (const id of emailIDs) {
      const mail = await readMail(id);

      const headers = mail.payload.headers;
      const from = headers.find((header) => header.name === "From").value;

      if ((await isInWhiteList(from)) && mail.labelIds.includes("INBOX")) {
        const subject = headers.find(
          (header) => header.name === "Subject"
        ).value;

        const extraction = await extract(mail);

        const body = extraction[1]
          .map((element) => base64ToUTF8(element))
          .join("\n");

        await sendEmbed(from, subject, body);

        if (!(extraction[0].size === 0)) await sendAtt(mail.id, extraction[0]);
      }
    }

    const newData = JSON.stringify(emailIDs[emailIDs.length - 1]);
    fs.writeFileSync("./data/lastMessageID.json", newData);
    console.log(`Trigger ID has been set to: ${emailIDs[emailIDs.length - 1]}`);
  } catch (err) {
    console.error(`Something went wrong in mailLoop: ${err}`);
  }
}
