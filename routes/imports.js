const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// استيراد النماذج والميدلوير
const StatImport = require('../models/StatImport');
const Match = require('../models/Match');
const MatchEvent = require('../models/MatchEvent');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { requireRole } = require('../middleware/auth'); // ميدلوير التحقق من دور المستخدم (Admin فقط)

// إعداد multer للتخزين المؤقت للصور المرفوعة في مجلد uploads/
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // حد أقصى 5 ميجابايت للصور
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('يُسمح برفع ملفات الصور فقط (JPG, PNG, WEBP).'));
  }
});

// دالة مساعدة لإرسال الطلب لنموذج Gemini عبر REST API الخاص بـ Google AI Studio
function callGeminiAPI(base64Image, mimeType, prompt) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reject(new Error('مفتاح GEMINI_API_KEY غير مهيأ في متغيرات البيئة.'));
    }

    const payload = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode !== 200) {
            return reject(new Error(parsed.error?.message || `خطأ استجابة Gemini برمز: ${res.statusCode}`));
          }
          
          // استخراج النص الراجع من كائن استجابة Gemini
          const textResponse = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!textResponse) {
            return reject(new Error('لم يرجع نموذج الذكاء الاصطناعي أي بيانات صالحة للتحليل.'));
          }
          
          // تحويل النص الراجع إلى كائن JSON فعلي
          const extractedJSON = JSON.parse(textResponse.trim());
          resolve(extractedJSON);
        } catch (e) {
          reject(new Error(`فشل في معالجة استجابة JSON من Gemini: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

// 1. رفع صورة واستخراج البيانات بالذكاء الاصطناعي (Admin فقط)
router.post('/', requireRole('admin'), upload.single('image'), async (req, res) => {
  const tempPath = req.file?.path;
  try {
    const { matchId } = req.body;
    if (!matchId || !req.file) {
      return res.status(400).json({ error: 'يرجى تحديد معرف المباراة ورفع ملف الصورة المطلوب.' });
    }

    // التحقق من صحة وجود المباراة
    const match = await Match.findByPk(matchId);
    if (!match) {
      return res.status(404).json({ error: 'المباراة المحددة غير موجودة في قاعدة البيانات.' });
    }

    // قراءة الصورة المرفوعة وتحويلها لترميز Base64
    const imageBuffer = fs.readFileSync(tempPath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    // صياغة التعليمات بدقة لنموذج Gemini لإرجاع هيكل بيانات مطابق لعقود المنصة
    const prompt = `
      قم بتحليل صورة تقرير أو لوحة إحصائيات مباراة كرة القدم المرفقة بدقة تامة.
      استخرج البيانات المطلوبة تالياً وأرجعها على هيئة كائن JSON صالح فقط دون أي نصوص تمهيدية أو تنسيقات markdown.
      
      يجب أن يكون هيكل الكائن الراجع مطابقاً لهذا القالب تماماً:
      {
        "homeScore": number (أدخل نتيجة الفريق المستضيف الإجمالية),
        "awayScore": number (أدخل نتيجة الفريق الضيف الإجمالية),
        "possessionHome": number (نسبة الاستحواذ للفريق المستضيف كعدد بين 0 و100),
        "possessionAway": number (نسبة الاستحواذ للفريق الضيف كعدد بين 0 و100),
        "events": [
          {
            "team": "home" أو "away" (حدد الفريق المستضيف بـ home والضيف بـ away بناءً على تقرير الصورة),
            "playerName": "string" (اسم اللاعب المرتبط بالحدث كما هو مكتوب في الصورة),
            "type": "goal" أو "yellow_card" أو "red_card" أو "substitution" أو "shot" أو "tackle",
            "minute": number (دقيقة وقوع الحدث),
            "x": number (إحداثي أفقي تقديري لموقع الحدث على أرض الملعب من 0 إلى 100),
            "y": number (إحداثي عمودي تقديري لموقع الحدث على أرض الملعب من 0 إلى 100)
          }
        ]
      }

      ملاحظات هامة:
      - إذا لم تجد نسبة الاستحواذ صريحة، ضعها تلقائياً 50 لكل فريق.
      - إحداثيات x و y يجب تقديرها منطقياً بحسب طبيعة الحدث (مثلاً: الأهداف تسدد بداخل منطقة الجزاء للفريق الخصم، التمريرات أو البطاقات تتوزع بالملعب).
    `;

    // طلب التحليل من Gemini
    const extractedData = await callGeminiAPI(base64Image, mimeType, prompt);

    // في البيئة التجريبية، سنفترض توفر مسار الصورة محلياً أو رابط رفع سحابي
    // سنقوم فقط بتخزين المسار المؤقت لحفظ السجل
    const imageUrl = `/uploads/${req.file.filename}`;

    // حفظ السجل الأولي في جدول الاستيراد بحالة معلق بانتظار المراجعة
    const newImport = await StatImport.create({
      matchId: parseInt(matchId),
      imageUrl: imageUrl,
      rawExtractedData: extractedData,
      correctedData: extractedData, // كنسخة أولية مطابقة يمكن للمسؤول تعديلها بالواجهة
      status: 'pending_review'
    });

    res.status(201).json({
      success: true,
      importId: newImport.id,
      extractedData: extractedData,
      status: newImport.status
    });

  } catch (error) {
    console.error('Error during AI stat import processing:', error);
    res.status(500).json({ error: `فشل استخراج البيانات بالذكاء الاصطناعي: ${error.message}` });
  } finally {
    // إزالة الملف المؤقت من الخادم لتوفير المساحة
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
});

// 2. جلب سجل استيراد معين (Admin فقط)
router.get('/:id', requireRole('admin'), async (req, res) => {
  try {
    const record = await StatImport.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'سجل الاستخراج المطلوب غير موجود.' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. تعديل وحفظ مسودة البيانات المستخرجة (Admin فقط)
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const record = await StatImport.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'سجل الاستخراج المطلوب غير موجود.' });
    }

    if (record.status !== 'pending_review') {
      return res.status(400).json({ error: 'لا يمكن تعديل مسودة تم اعتمادها أو رفضها مسبقاً.' });
    }

    const { correctedData } = req.body;
    if (!correctedData) {
      return res.status(400).json({ error: 'يرجى تقديم البيانات المعدلة لحفظها.' });
    }

    record.correctedData = correctedData;
    await record.save();

    res.json({
      success: true,
      import: record
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. اعتماد البيانات ونقلها للجداول الرسمية للمباراة (Admin فقط)
router.post('/:id/approve', requireRole('admin'), async (req, res) => {
  try {
    const record = await StatImport.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'سجل الاستخراج المطلوب غير موجود.' });
    }

    if (record.status !== 'pending_review') {
      return res.status(400).json({ error: 'هذا السجل تم معالجته واعتماده مسبقاً.' });
    }

    // جلب المباراة المستهدفة لتحديثها
    const match = await Match.findByPk(record.matchId);
    if (!match) {
      return res.status(404).json({ error: 'المباراة المرتبطة بهذا السجل لم تعد موجودة.' });
    }

    const data = record.correctedData;

    // أ) تحديث تفاصيل المباراة والنتيجة
    match.homeScore = parseInt(data.homeScore) || 0;
    match.awayScore = parseInt(data.awayScore) || 0;
    match.possessionHome = parseInt(data.possessionHome) || 50;
    match.possessionAway = parseInt(data.possessionAway) || 50;
    match.status = 'finished'; // تغيير تلقائي للحالة بعد استيراد البيانات واعتمادها
    await match.save();

    // ب) تفريغ أي أحداث مسجلة مسبقاً لنفس المباراة لتجنب الازدواجية والتكرار
    await MatchEvent.destroy({ where: { matchId: match.id } });

    // ج) معالجة وإضافة الأحداث
    let eventsCreated = 0;
    if (data.events && Array.isArray(data.events)) {
      for (const ev of data.events) {
        // تحديد الـ teamId الفعلي بناءً على التصنيف home / away
        const teamId = ev.team === 'home' ? match.homeTeamId : match.awayTeamId;

        // البحث التلقائي عن اللاعب بالاسم في هذا الفريق لمحاولة ربطه آلياً
        let playerId = null;
        if (ev.playerName) {
          const player = await Player.findOne({
            where: {
              teamId: teamId,
              name: ev.playerName.trim()
            }
          });
          if (player) {
            playerId = player.id;
          }
        }

        // إنشاء الحدث في جدول قاعدة البيانات
        await MatchEvent.create({
          matchId: match.id,
          teamId: teamId,
          playerId: playerId, // قد يكون null في حال عدم وجود مطابقة كاملة في قائمة اللاعبين، ويمكن للمسؤول تعيينه لاحقاً
          type: ev.type,
          minute: parseInt(ev.minute) || 1,
          x: parseFloat(ev.x) || 50,
          y: parseFloat(ev.y) || 50,
          metadata: { originalPlayerName: ev.playerName } // الاحتفاظ بالاسم الأصلي للتوثيق والمراجعة
        });
        eventsCreated++;
      }
    }

    // د) تحديث حالة سجل الاستيراد إلى معتمد
    record.status = 'approved';
    await record.save();

    res.json({
      success: true,
      match: match,
      eventsCreated: eventsCreated
    });

  } catch (error) {
    console.error('Error during approval deployment:', error);
    res.status(500).json({ error: `فشل اعتماد السجل: ${error.message}` });
  }
});

// 5. رفض سجل الاستيراد بالكامل وإغلاقه دون تطبيق أي بيانات (Admin فقط)
router.post('/:id/reject', requireRole('admin'), async (req, res) => {
  try {
    const record = await StatImport.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'سجل الاستخراج المطلوب غير موجود.' });
    }

    if (record.status !== 'pending_review') {
      return res.status(400).json({ error: 'لا يمكن تعديل حالة سجل معالج بالفعل.' });
    }

    record.status = 'rejected';
    await record.save();

    res.json({
      success: true,
      message: 'تم رفض سجل الاستيراد بنجاح وتم إغلاق الملف دون تعديل الجداول الرسمية.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;