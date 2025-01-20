document.addEventListener("DOMContentLoaded", function () {
  // ページ読み込み時に当日の date を自動設定
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("applicationDate").value = today;

  // 初期値を保持する変数
  let initialStartTime = "";
  let initialEndTime = "";
  let initialBreakTime = ""; // 休憩時間用

  // 最初の入力欄から初期値を取得するためのイベントリスナーを定義
  const firstStartTimeInput = document.querySelector("select[name='changeStartTime[]']");
  const firstEndTimeInput   = document.querySelector("select[name='changeEndTime[]']");
  const firstBreakTimeInput = document.querySelector("select[name='changeBreakTime[]']");

  // 最初の行の開始時間が変わったら記憶
  firstStartTimeInput.addEventListener("change", function () {
    initialStartTime = this.value;
  });

  // 最初の行の終了時間が変わったら記憶
  firstEndTimeInput.addEventListener("change", function () {
    initialEndTime = this.value;
  });

  // 最初の行の休憩時間が変わったら記憶
  firstBreakTimeInput.addEventListener("change", function () {
    initialBreakTime = this.value;
  });

  // 変更事項を追加する関数
  window.addChangeItem = function () {
    const container = document.getElementById("changeDetailsContainer");
    const newItem = document.createElement("div");
    newItem.className = "change-item";

    newItem.innerHTML = `
      <input type="date" name="changeDate[]" required />
      <select name="changeType[]" required>
        <option value="">選択してください</option>
        <option value="休み">休み</option>
        <option value="出勤">出勤</option>
      </select>
      <select name="changeStartTime[]" required>
        <option value="" ${initialStartTime ? "" : "selected"}>開始時間</option>
        ${
          Array.from({ length: 24 }, (_, i) => {
            const t = i.toString().padStart(2, '0') + ":00";
            // もし t が initialStartTime と一致すれば selected をつける
            return `<option value="${t}" ${t === initialStartTime ? "selected" : ""}>${t}</option>`;
          }).join('')
        }
      </select>
      <select name="changeEndTime[]" required>
        <option value="" ${initialEndTime ? "" : "selected"}>終了時間</option>
        ${
          Array.from({ length: 24 }, (_, i) => {
            const t = i.toString().padStart(2, '0') + ":00";
            return `<option value="${t}" ${t === initialEndTime ? "selected" : ""}>${t}</option>`;
          }).join('')
        }
      </select>
      <select name="changeBreakTime[]" required>
        <option value="" ${initialBreakTime ? "" : "selected"}>休憩時間</option>
        <option value="0"   ${initialBreakTime === "0"   ? "selected" : ""}>休憩なし</option>
        <option value="15"  ${initialBreakTime === "15"  ? "selected" : ""}>15分</option>
        <option value="30"  ${initialBreakTime === "30"  ? "selected" : ""}>30分</option>
        <option value="45"   ${initialBreakTime === "45" ? "selected" : ""}>45分</option>
        <option value="60"  ${initialBreakTime === "60"  ? "selected" : ""}>1時間</option>
        <option value="75" ${initialBreakTime === "75"   ? "selected" : ""}>1時間15分</option>
        <option value="90"  ${initialBreakTime === "90"  ? "selected" : ""}>1時間30分</option>
      </select>
      <button type="button" onclick="removeChangeItem(this)">削除</button>
    `;
    container.appendChild(newItem);
  };

  // 変更事項を削除する関数
  window.removeChangeItem = function (button) {
    const container = document.getElementById("changeDetailsContainer");
    container.removeChild(button.parentElement);
  };


  // ここから下はフォーム送信 → Google Chat Webhook送信処理
  // ※ もし不要なら適宜コメントアウトしてください

  // Webhook URL（任意のGoogle Chat Webhook URLを設定してください）
  const WEBHOOK_URL =
    "https://chat.googleapis.com/v1/spaces/AAAAuxOQVRw/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=plsnzi8VBaWVqTbn5RnCH-1wBC1NWVoWl2SD3CmQs3U";

  // フォーム送信時にWebhookへデータを送信する関数
  window.sendToChatWebhook = function (event) {
    event.preventDefault(); // 画面遷移を止める

    const form = event.target;
    const formData = new FormData(form);

    // フォームの値をまとめるオブジェクト
    const data = {
      name: formData.get("name"),
      applicationDate: formData.get("applicationDate"),
      employeeId: formData.get("employeeId"),
      changes: []
    };

    const changeDates = formData.getAll("changeDate[]");
    const changeTypes = formData.getAll("changeType[]");
    const changeStartTimes = formData.getAll("changeStartTime[]");
    const changeEndTimes = formData.getAll("changeEndTime[]");
    const changeBreakTimes = formData.getAll("changeBreakTime[]");

    for (let i = 0; i < changeDates.length; i++) {
      data.changes.push({
        date: changeDates[i],
        type: changeTypes[i],
        startTime: changeStartTimes[i],
        endTime: changeEndTimes[i],
        breakTime: changeBreakTimes[i]
      });
    }

    data.remarks = formData.get("remarks") || "";

    // メッセージ作成
    const messageText =
      `シフト変更申請\n\n` +
      `氏名: ${data.name}\n` +
      `申請日: ${data.applicationDate}\n` +
      `社員番号: ${data.employeeId}\n` +
      `変更事項:\n` +
      data.changes
        .map(change => {
          return `  - ${change.date}: ${change.type}, ${change.startTime} ～ ${change.endTime} (休憩: ${change.breakTime}分)`;
        })
        .join("\n") +
      `\n備考: ${data.remarks}`;

    const message = {
      text: messageText
    };

    // Google Chat WebhookにPOSTリクエストを送る
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8"
      },
      body: JSON.stringify(message)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        alert("申請が送信されました。");
        // フォームをリセットしたい場合はコメントアウトを外す
        // form.reset();
      })
      .catch(err => {
        alert("エラーが発生しました: " + err);
      });
  };
});
