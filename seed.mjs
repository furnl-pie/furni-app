import { initializeApp } from "firebase/app";
import { getFirestore, setDoc, doc } from "firebase/firestore";

const app = initializeApp({
  apiKey: "AIzaSyB4OXJHmSexQxWJerkfGvLcm6K_RnZaspo",
  projectId: "furni-app-a118d",
});

const db = getFirestore(app);

const users = [
  { id: "a1", name: "관리자", role: "admin",  pw: "admin", phone: "010-0000-0000" },
  { id: "d1", name: "김민준", role: "driver", pw: "1111",  phone: "010-1111-2222" },
  { id: "d2", name: "이서준", role: "driver", pw: "2222",  phone: "010-3333-4444" },
  { id: "d3", name: "박도현", role: "driver", pw: "3333",  phone: "010-5555-6666" },
];

for (const u of users) {
  await setDoc(doc(db, "users", u.id), u);
  console.log("추가됨:", u.name);
}

console.log("완료!");
process.exit(0);
