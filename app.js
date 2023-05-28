import { getEmailIDs, readMail } from "./controllers.js";
import fs from "fs";
import {
  base64ToUTF8,
  sendEmbed,
  extract,
  sendAtt,
  isInWhiteList,
} from "./utils.js";

try {
  const lastMessageID = JSON.parse(
    fs.readFileSync("./data/lastMessageID.json", "utf-8")
  );

  const emailIDs = await getEmailIDs();

  for (let i = 0; emailIDs.messages[i].id !== lastMessageID.id; i++) {
    const mail = await readMail(emailIDs.messages[i].id);

    const headers = mail.payload.headers;
    const from = headers.find((header) => header.name === "From").value;

    if ((await isInWhiteList(from)) && mail.labelIds.includes("INBOX")) {
      const subject = headers.find((header) => header.name === "Subject").value;

      const extraction = await extract(mail);

      const body = extraction[1]
        .map((element) => base64ToUTF8(element))
        .join("\n");

      await sendEmbed(from, subject, body);

      if (extraction[0].size !== 0) await sendAtt(mail.id, extraction[0]);
    }
  }

  const newData = JSON.stringify(emailIDs.messages[0]);
  fs.writeFileSync("./data/lastMessageID.json", newData);
  console.log(`Trigger ID has been set to: ${emailIDs.messages[0].id}`);
} catch (err) {
  console.error(`Something went wrong in app.js: ${err}`);
}
