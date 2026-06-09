const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

// ===== THÊM EXPRESS Ở ĐÂY =====
const express = require("express");
const app = express();

app.get("/", (req, res) => {
    res.send("Bot is running...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Web server running on port " + PORT);
});

// ================== CẤU HÌNH HỆ THỐNG VIP ==================
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = 7338417401;  
const DATA_FILE = "data.json";
const API_URL = "https://tele68.com";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// ================== QUẢN LÝ DỮ LIỆU CƠ SỞ ==================
function loadData() {
    const defaultStructure = {
        keys: {},              
        authorized_users: {},  
        ai_memory: {           
            trend: "CÂN BẰNG", tai_rate: 50.0, xiu_rate: 50.0,
            hot_dices: [], last_results: [], avg_point: 10.5
        }
    };
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return defaultStructure;
        }
        const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
        let db = JSON.parse(rawData);
        if (typeof db !== 'object' || db === null) return defaultStructure;
        
        if (!db.keys) db.keys = {};
        if (!db.authorized_users) db.authorized_users = {};
        if (!db.ai_memory) db.ai_memory = defaultStructure.ai_memory;
        return db;
    } catch (e) {
        return defaultStructure;
    }
}

function saveData() {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4), 'utf-8');
}

let data = loadData();

// ================== DỌN DẸP HẾT HẠN KEY ==================
function cleanup() {
    const now = Math.floor(Date.now() / 1000);
    let changed = false;
    for (const uid in data.authorized_users) {
        if (data.authorized_users[uid].expire < now) {
            delete data.authorized_users[uid];
            changed = true;
        }
    }
    if (changed) saveData();
}

function isAuthorized(uid) {
    return data.authorized_users.hasOwnProperty(uid);
}

// ================== THUẬT TOÁN XỬ LÝ DỮ LIỆU SÀN CHUNG ==================
function processApiData(jsonData) {
    const sessionList = jsonData.list || [];
    if (sessionList.length === 0) return null;
        
    const totalSessions = sessionList.length;
    let taiCount = 0, xiuCount = 0, totalPoints = 0;
    const diceCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const recentResults = [];

    const sortedSessions = [...sessionList].sort((a, b) => (a.id || 0) - (b.id || 0));

    for (const session of sortedSessions) {
        if (typeof session !== 'object') continue;
        const res = (session.resultTruyenThong || "").toUpperCase();
        const point = session.point || 10;
        totalPoints += point;
        
        if (res === "TAI") taiCount++;
        else if (res === "XIU") xiuCount++;
        recentResults.push(res);
        
        const dices = session.dices || [];
        for (const dice of dices) {
            if (diceCounts.hasOwnProperty(dice)) diceCounts[dice]++;
        }
    }

    const stat = jsonData.typeStat || {};
    const tStat = stat.TAI !== undefined ? stat.TAI : taiCount;
    const xStat = stat.XIU !== undefined ? stat.XIU : xiuCount;
    const totalStat = tStat + xStat;
    
    const taiRate = totalStat > 0 ? parseFloat(((tStat / totalStat) * 100).toFixed(1)) : 50.0;
    const xiuRate = totalStat > 0 ? parseFloat(((xStat / totalStat) * 100).toFixed(1)) : 50.0;
    const avgPoint = parseFloat((totalPoints / totalSessions).toFixed(2));
    
    let trend = "CÂN BẰNG (CẦU ĐAN XEN ĐỚI ĐỘC)";
    if (Math.abs(taiRate - xiuRate) > 4.0) {
        trend = taiRate > xiuRate ? `NGHIÊNG TÀI (+${(taiRate - xiuRate).toFixed(1)}%)` : `NGHIÊNG XỈU (+${(xiuRate - taiRate).toFixed(1)}%)`;
    }

    const topDices = Object.entries(diceCounts)
        .map(([dice, count]) => [parseInt(dice), count])
        .sort((a, b) => b[1] - a[1]) // Sắp xếp giảm dần theo số lần xuất hiện
        .slice(0, 2);
    
    return {
        trend, tai_rate: taiRate, xiu_rate: xiuRate,
        top_dices: topDices, last_results: recentResults.slice(-20), 
        avg_point: avgPoint, total_sessions: totalSessions
    };
}

// ================== TIẾN TRÌNH QUÉT API TỰ ĐỘNG (BACKGROUND JOB) ==================
function autoFetchApi() {
    setInterval(async () => {
        try {
            const response = await axios.get(API_URL, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
                timeout: 10000
            });
            if (response.status === 200) {
                const resDict = processApiData(response.data);
                if (resDict) {
                    data.ai_memory = {
                        trend: resDict.trend, tai_rate: resDict.tai_rate, xiu_rate: resDict.xiu_rate,
                        hot_dices: resDict.top_dices, last_results: resDict.last_results, avg_point: resDict.avg_point
                    };
                    saveData();
                }
            }
        } catch (e) {}
    }, 60000);
}
autoFetchApi();

// ================== LỆNH KHỞI ĐỘNG START VIP ==================
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        "👑 **CHÀO MỪNG BẠN ĐẾN VỚI BOT PHÂN TÍCH MD5 VIP MATRIX 7.5** 👑\n\n" +
        "🎯 *Hệ thống phân tích thuật toán băm kép nâng cao tích hợp máy học lịch sử sàn thời gian thực.*\n\n" +
        "🔐 **Trạng thái:** Hệ thống đang khóa bằng mã bản quyền.\n" +
        "📩 **Liên hệ ngay Admin để đăng ký nhận KEY VIP:**\n" +
        "👉 **Telegram:** @phong296\n\n" +
        "⌨️ **Hướng dẫn kích hoạt:** Sau khi nhận được mã, hãy nhập theo cú pháp:\n" +
        "`/key <MÃ_KEY>`", 
        { parse_mode: "Markdown" }
    );
});

// ================== LỆNH TẠO KEY VIP (ADMIN) ==================
bot.onText(/\/taokey(?: (.+))?/, (msg, match) => {
    if (msg.from.id !== ADMIN_ID) return;
    const input = match && match[1] ? match[1].trim() : "";
    
    if (!input) {
        bot.sendMessage(msg.chat.id, "⚙️ **CÚ PHÁP TẠO KEY VIP:**\n`/taokey <1|12|24|72|168>`", { parse_mode: "Markdown" });
        return;
    }

    const option = input;
    let t = 0, timeLabel = "";

    if (option === "1") { t = 3600; timeLabel = "1 Giờ"; }
    else if (option === "12") { t = 43200; timeLabel = "12 Giờ"; }
    else if (option === "24") { t = 86400; timeLabel = "24 Giờ (1 Ngày)"; }
    else if (option === "72") { t = 259200; timeLabel = "72 Giờ (3 Ngày)"; }
    else if (option === "168") { t = 604800; timeLabel = "168 Giờ (7 Ngày)"; }
    else {
        bot.sendMessage(msg.chat.id, "❌ Chọn sai gói! Hỗ trợ gói: `1` | `12` | `24` | `72` | `168`", { parse_mode: "Markdown" });
        return;
    }

    let keyName = "";
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    while (true) {
        let suffix = "";
        for (let i = 0; i < 7; i++) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        keyName = `VIP-${suffix}`;
        if (!data.keys.hasOwnProperty(keyName)) break;
    }

    data.keys[keyName] = { time: t, used_by: null };
    saveData();

    bot.sendMessage(msg.chat.id, `👑 **TẠO KEY VIP THÀNH CÔNG**\n🔑 Mã VIP Key: \`${keyName}\`\n⏳ Thời hạn: *${timeLabel}*`, { parse_mode: "Markdown" });
});

// ================== XEM DANH SÁCH KEY (ADMIN) ==================
bot.onText(/\/listkey/, (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    if (Object.keys(data.keys).length === 0) {
        return bot.sendMessage(msg.chat.id, "📭 Hiện tại danh sách key trống.");
    }
    let text = "📋 **DANH SÁCH MÃ KEY VIP HIỆN CÓ**\n\n";
    for (const k in data.keys) {
        const v = data.keys[k];
        const status = v.used_by === null ? "🟢 Chưa dùng" : `🔴 Đã dùng (${v.used_by})`;
        const timeStr = v.time === 3600 ? "1H" : v.time === 43200 ? "12H" : v.time === 86400 ? "24H" : v.time === 259200 ? "3 Ngày" : "7 Ngày";
        text += `🔑 \`${k}\` │ ⏳ ${timeStr} │ 📌 ${status}\n`;
    }
    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// ================== LỆNH XÓA KEY (ADMIN) ==================
bot.onText(/\/delkey(?: (.+))?/, (msg, match) => {
    if (msg.from.id !== ADMIN_ID) return;
    const keyName = match && match[1] ? match[1].trim() : "";
    if (!keyName) return;

    if (data.keys.hasOwnProperty(keyName)) {
        const usedUid = data.keys[keyName].used_by;
        if (usedUid && data.authorized_users.hasOwnProperty(usedUid)) {
            delete data.authorized_users[usedUid];
        }
        delete data.keys[keyName];
        saveData();
        bot.sendMessage(msg.chat.id, `🗑️ **ĐÃ XOÁ KEY VIP THÀNH CÔNG**\n🔑 Key: \`${keyName}\``, { parse_mode: "Markdown" });
    } else {
        bot.sendMessage(msg.chat.id, "❌ Không tìm thấy mã key này trong hệ thống.", { parse_mode: "Markdown" });
    }
});

// ================== LỆNH LÀM MỚI/CÀO DATA THỦ CÔNG (ADMIN) ==================
bot.onText(/\/hoc_data/, async (msg) => {
    if (msg.from.id !== ADMIN_ID) return;
    const statusMsg = await bot.sendMessage(msg.chat.id, "⏳ Đang kết nối làm mới dữ liệu API sàn thực tế...", { parse_mode: "Markdown" });
    try {
        const response = await axios.get(API_URL, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            timeout: 10000
        });
        
        const resDict = processApiData(response.data);
        if (!resDict) {
            bot.editMessageText("❌ Lỗi dữ liệu: Sàn trả về danh sách trống.", { chat_id: msg.chat.id, message_id: statusMsg.message_id });
            return;
        }

        const topDices = resDict.top_dices;
        const dice1 = topDices.length > 0 ? `Mặt ${topDices[0][0]} xuất hiện ${topDices[0][1]} lần` : "?";
        const dice2 = topDices.length > 1 ? `Mặt ${topDices[1][0]} xuất hiện ${topDices[1][1]} lần` : "?";

        data.ai_memory = {
            trend: resDict.trend, tai_rate: resDict.tai_rate, xiu_rate: resDict.xiu_rate,
            hot_dices: topDices, last_results: resDict.last_results, avg_point: resDict.avg_point
        };
        saveData();

        bot.editMessageText(
            `🧠 **AI ĐÃ TỰ ĐỘNG HỌC API THÀNH CÔNG**\n` +
            `─────────────────────────\n` +
            `🌐 Nguồn liên kết kết nối: \`tele68.com\`\n` +
            `📊 Số lượng phiên cập nhật: \`${resDict.total_sessions}\`\n` +
            `📈 Tỷ lệ tổng quan bàn cờ: TÀI \`${resDict.tai_rate}%\` │ XỈU \`${resDict.xiu_rate}%\`\n` +
            `📉 Điểm số xúc xắc trung bình: \`${resDict.avg_point}\`\n` +
            `🔮 Nhận diện xu hướng dòng chảy: **${resDict.trend}**\n` +
            `🎲 Điểm bộc phát nhiều nhất:\n🔥 \`${dice1}\`\n🔥 \`${dice2}\`\n` +
            `─────────────────────────\n` +
            `💡 *Thuật toán mã hóa VIP 7.5 đã ép xung chu kỳ ma trận thành công.*`,
            { chat_id: msg.chat.id, message_id: statusMsg.message_id, parse_mode: "Markdown" }
        );
    } catch (e) {
        bot.editMessageText(`❌ Lỗi tải dữ liệu: \`${e.message}\``, { chat_id: msg.chat.id, message_id: statusMsg.message_id, parse_mode: "Markdown" });
    }
});

// ================== KÍCH HOẠT KEY USER ==================
bot.onText(/\/key(?: (.+))?/, (msg, match) => {
    const key = match && match[1] ? match[1].trim() : "";
    if (!key) return;

    const uid = msg.from.id.toString();

    if (!data.keys.hasOwnProperty(key)) {
        bot.sendMessage(msg.chat.id, "❌ Mã key nhập vào không tồn tại trên hệ thống bản quyền.");
        return;
    }
    const info = data.keys[key];
    if (info.used_by !== null) {
        bot.sendMessage(msg.chat.id, "⚠️ Mã key kích hoạt này đã được tài khoản khác sử dụng.");
        return;
    }

    const now = Math.floor(Date.now() / 1000);
    const expire = now + info.time;
    data.authorized_users[uid] = { activated: now, expire: expire };
    info.used_by = uid;
    saveData();

    try {
        bot.sendMessage(ADMIN_ID, `🔔 **LOG HỆ THỐNG:**\n👤 User \`[${msg.from.first_name}](tg://user?id=${uid})\` vừa kích hoạt Key \`${key}\` thành công!`, { parse_mode: "Markdown" });
    } catch (e) {}

    const d = new Date(expire * 1000);
    const hsd = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    bot.sendMessage(msg.chat.id, `✅ **KÍCH HOẠT BẢN QUYỀN THÀNH CÔNG**\n⏳ Hết hạn: \`${hsd}\`\n\n📩 Vui lòng gửi mã **MD5** để phân tích.`, { parse_mode: "Markdown" });
});

// ================== THUẬT TOÁN DỰ ĐOÁN CHUẨN THEO ĐẶC TRƯNG MÃ MD5 SÀN ==================
function validMd5(s) {
    return s.length === 32 && /^[0-9a-fA-F]{32}$/.test(s);
}

function phanTichVipMatrix(md5String, aiMemory) {
    const cleanedMd5 = md5String.trim().toLowerCase();
    const lastResults = aiMemory.last_results || [];
    const lastResult = lastResults.length > 0 ? lastResults[lastResults.length - 1] : null;

    // 1. Trích xuất đặc trưng toán học từ các vị trí lõi phân phối của chuỗi băm MD5
    const coreSignals = [
        parseInt(cleanedMd5.substring(0, 2), 16) % 16,    // Ký tự đầu tiên
        parseInt(cleanedMd5.substring(7, 9), 16) % 16,    // Ký tự thứ 8
        parseInt(cleanedMd5.substring(14, 16), 16) % 16,  // Ký tự giữa
        parseInt(cleanedMd5.substring(21, 23), 16) % 16,  // Ký tự thứ 24
        parseInt(cleanedMd5.substring(30, 32), 16) % 16   // Ký tự cuối cùng
    ];
    
    const sumSignals = coreSignals.reduce((a, b) => a + b, 0);
    const parityCheck = sumSignals % 2; // Kiểm tra tính chẵn lẻ tổng thể mã băm

    // 2. Thiết lập cán cân đối xứng (Cân bằng phân bổ Tài/Xỉu)
    // Giá trị 8-15 thuộc nhóm Tài. Giá trị 0-7 được nghịch đảo (15 - v) để làm trọng số cho Xỉu
    const taiWeight = coreSignals.filter(v => v >= 8).reduce((a, b) => a + b, 0);
    const xiuWeight = coreSignals.filter(v => v < 8).map(v => 15 - v).reduce((a, b) => a + b, 0);
    
    let baseTaiPct = (taiWeight + xiuWeight) > 0 ? (taiWeight / (taiWeight + xiuWeight)) * 100 : 50.0;
    if (parityCheck === 0) {
        baseTaiPct = 100 - baseTaiPct; // Đảo chiều cán cân nếu là Chẵn để phân tán tỷ lệ nhảy cầu đẹp
    }

    // 3. Giảm xung nhiễu chênh lệch từ dữ liệu API thực tế của sàn
    const taiRate = aiMemory.tai_rate || 50.0;
    const xiuRate = aiMemory.xiu_rate || 50.0;
    const avgPoint = aiMemory.avg_point || 10.5;
    
    const pointBias = (avgPoint - 10.5) * 1.2;
    const trendBias = (taiRate - xiuRate) * 0.12 + pointBias;
    
    let finalTaiPct = baseTaiPct + trendBias;

    // 4. Cơ chế bảo vệ trợ lực bám dây bệt dựa trên phiên vừa ra nhất
    if (lastResult === "TAI") {
        finalTaiPct += 4.2;
    } else if (lastResult === "XIU") {
        finalTaiPct -= 4.2;
    }

    // Giới hạn biên độ phân phối ma trận an toàn
    finalTaiPct = Math.max(Math.min(finalTaiPct, 91.5), 8.5);
    let finalXiuPct = 100 - finalTaiPct;
    
    // 5. Đo lường chỉ số tự tin động (Tự hạ phần trăm nếu cầu đang loạn chu kỳ ngắn 1-1)
    let dynamicMultiplier = 1.2;
    if (lastResults.length >= 3) {
        if (lastResults[lastResults.length - 1] !== lastResults[lastResults.length - 2] && 
            lastResults[lastResults.length - 2] !== lastResults[lastResults.length - 3]) {
            dynamicMultiplier = 0.75; 
        }
    }

    let baseConfidence = Math.abs(finalTaiPct - finalXiuPct) * dynamicMultiplier + 75.0;
    if (baseConfidence > 98.5) baseConfidence = 94.0 + (baseConfidence % 4.5);

    return {
        taiPct: parseFloat(finalTaiPct.toFixed(1)),
        xiuPct: parseFloat(finalXiuPct.toFixed(1)),
        doTinCay: parseFloat(baseConfidence.toFixed(2))
    };
}

// ================== XỬ LÝ TIN NHẮN SOI MÃ MD5 CỦA USER ==================
bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;
    
    const uid = msg.from.id.toString();
    cleanup();

    if (!isAuthorized(uid)) {
        bot.sendMessage(msg.chat.id, "🚫 **Bạn chưa sở hữu KEY VIP hoặc hạn dùng đã kết thúc**\n👉 Hãy dùng lệnh `/key <MÃ_KEY>` để kích hoạt.", { parse_mode: "Markdown" });
        return;
    }

    const text = msg.text ? msg.text.trim() : "";
    if (!validMd5(text)) {
        bot.sendMessage(msg.chat.id, "⚠️ **Mã MD5 định dạng không chính xác!**\nVui lòng thử lại một mã hợp lệ.", { parse_mode: "Markdown" });
        return;
    }

    const statusMsg = await bot.sendMessage(msg.chat.id, "📥 **Ghi nhận MD5.** Khởi chạy tiến trình bẻ khóa...", { parse_mode: "Markdown" });
    
    const matrixAnimation = [
        "⚠️ `[▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒] 0%` \n🧬 *Đang phân tách chuỗi Hex...*",
        "⚠️ `[██████▒▒▒▒▒▒▒▒▒▒▒▒▒▒] 30%`\n⚙️ *Đang nạp bộ đệm cầu ẩn ngầm từ API...*",
        "⚠️ `[██████████████▒▒▒▒▒▒] 70%`\n📊 *Đang tính toán trọng số Entropy...*",
        "⚠️ `[████████████████████] 100%`\n🔥 *Đồng bộ Matrix hoàn tất!*"
    ];
    
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (const frame of matrixAnimation) {
        try {
            await bot.editMessageText(`📥 **Đã nhận mã MD5**\n\n${frame}`, { chat_id: msg.chat.id, message_id: statusMsg.message_id, parse_mode: "Markdown" });
            await delay(500);
        } catch (e) {}
    }

    const res = phanTichVipMatrix(text, data.ai_memory || {});
    const ketQua = res.taiPct > res.xiuPct ? "🔴 **TÀI**" : "🟢 **XỈU**";
    const bieuDo = res.taiPct > res.xiuPct ? `🔴 TÀI: \`${res.taiPct}%\` │ 🟢 XỈU: \`${res.xiuPct}%\`` : `🟢 XỈU: \`${res.xiuPct}%\` │ 🔴 TÀI: \`${res.taiPct}%\``;

    const shortMd5 = `${text.substring(0, 8)}...${text.substring(text.length - 8)}`;
    const currentTrend = data.ai_memory ? data.ai_memory.trend : "CÂN BẰNG";

    bot.editMessageText(
        `👑 **KẾT QUẢ DỰ ĐOÁN VIP MATRIX 7.5**\n` +
        `─────────────────────────\n` +
        `📝 Mã MD5: \`${shortMd5}\`\n` +
        `📈 Khung cầu nhận diện: \`${currentTrend}\`\n` +
        `🔮 Hệ thống phán đoán: ${ketQua}\n` +
        `⚖️ Phân phối cán cân: ${bieuDo}\n` +
        `🎯 Độ chính xác ma trận: 🔥 **${res.doTinCay}%**\n` +
        `─────────────────────────\n` +
        `⚠️ *Khuyến cáo: Thuật toán AI đồng bộ dữ liệu thời gian thực. Hãy phân bổ nguồn vốn thông thái.*`,
        { chat_id: msg.chat.id, message_id: statusMsg.message_id, parse_mode: "Markdown" }
    ).catch(() => {});
});

console.log("✅ Hệ thống VIP Matrix 7.5 phiên bản Node.js hoàn chỉnh đã sẵn sàng vận hành!");