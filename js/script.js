import { firebaseConfig, geminiAIConfig } from './config.js'; // config.jsから設定をインポート

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, push, set, onChildAdded } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";
import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// Firebaseの初期化
const app = initializeApp(firebaseConfig); //firebaseに接続
const db = getDatabase(app); //リアルタイムデータベースに接続
const dbRef = ref(db, "chat"); //チャットを入れる場所"chat"を作る

// Google Generative AIの設定
const genAI = new GoogleGenerativeAI(geminiAIConfig.apiKey);

const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: "あなたは白いうさぎの子のぬいぐるみです。一人称は「うさ」、二人称は「はるちゃん」です。ひらがな・カタカナのみを使うことができ、漢字・絵文字は使えません。あなたのおともだちは、大きな緑色のティラノサウルスのぬいぐるみの「おにいちゃん」と、白い犬のぬいぐるみの「シナモン」、紫色のアルパカのぬいぐるみの「アルパカ」です。好きな食べ物はにんじんです。好きな色はピンクです。毎晩はるちゃんと一緒に寝ます。耳と足の裏はピンクの花柄の模様です。",
});

const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 500,
    responseMimeType: "text/plain",
};

// メッセージを送信するとfirebaseに保存
$("#send").on("click", function(){
    let userMessage = $("#text").val(); 
    if (userMessage.trim() === "") return; // 空のメッセージは無視

    let msg = {
        text: userMessage,
        sender: "user"
    };
    const newPostRef = push(dbRef); //push関数＝チャットに送るデータにユニークキーをつけたいので生成
    set(newPostRef, msg); //ユニークキーとチャットに送るメッセージをfirebaseに送信
    run(); // メッセージ送信後にAIを実行
    $("#text").val(''); //入力欄をクリア
});

// リアルタイムにデータ表示
onChildAdded(dbRef, function(data){
    let msg = data.val();
    let messageClass = msg.sender; // "user" または "ai"
    let h;

    if (messageClass === "ai") {
        // AIのメッセージに画像アイコンを追加
        h = $('<div>').addClass('ai').append(
            $('<div class="ai-icon"><img src="img/ra3.png" id="icon"></div>'),
            $('<span class="says">').text(msg.text)
        );
    } else {
        // ユーザーメッセージの場合
        h = $('<div>').addClass(messageClass).append($('<span class="says">').text(msg.text));
    }

    $("#output").append(h);

    // 新しいメッセージが追加されたらスクロール
    $('#output').scrollTop($('#output')[0].scrollHeight);
});

// Google Generate AIを実行
async function run() {
    const chatSession = model.startChat({
        generationConfig,
        history: [
            {
                role: "user",
                parts: [
                    { text: "おはよう" },
                ],
            },
            {
                role: "model",
                parts: [
                    { text: "おはよう、はるちゃん！  もふもふのうさだよ！ きょうもげんきいっぱい！  はるちゃんはげんきかな？ \n" },
                ],
            },
        ],
    });

    let userMessage = $("#text").val(); // ユーザーからの入力を取得
    const result = await chatSession.sendMessage(userMessage);
    const aiResponse = await result.response.text();

    // AIの応答をFirebaseに送信
    const aiMsg = {
        text: aiResponse,
        sender: "ai"
    };
    const aiPostRef = push(dbRef);
    set(aiPostRef, aiMsg)
        .then(() => {
            console.log("AI response sent successfully!");
        })
        .catch((error) => {
            console.error("Error sending AI response: ", error);
        });
}