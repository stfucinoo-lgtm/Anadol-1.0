/**
 * ANADOL League - Matches Routes
 * مسارات التحكم بالمباريات والنتائج (عرض، جدولة، تعديل النتائج، تحديث الحالة السريع، وتثبيت الأحداث).
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Match = require('../models/Match');
const Team = require('../models/Team');

// استدعاء دفاعي مرن لنموذج أحداث المباريات (والذي يتم بناؤه تالياً في المرحلة 3)
let MatchEvent = null;
try {
    MatchEvent = require('../models/MatchEvent');
} catch (e) {
    // لم يتم بناء نموذج الأحداث بعد في هذه المرحلة من خطة البناء
}

// تعريف العلاقات برمجياً وتلقائياً وتجنب التكرار بفحص المسميات البديلة
if (!Match.associations || !Match.associations.homeTeam) {
    Match.belongsTo(Team, { as: 'homeTeam', foreignKey: 'homeTeamId' });
}
if (!Match.associations || !Match.associations.awayTeam) {
    Match.belongsTo(Team, { as: 'awayTeam', foreignKey: 'awayTeamId' });
}

// آلية الاستدعاء الآمن لوسيط الصلاحيات (سيتفعل تلقائياً عند بناء الصلاحيات في المرحلة 4)
let verifyToken = (req, res, next) => next();
let isEditorOrAdmin = (req, res, next) => next();

try {
    const auth = require('../middleware/auth');
    if (auth.verifyToken) verifyToken = auth.verifyToken;
    if (auth.isEditorOrAdmin) isEditorOrAdmin = auth.isEditorOrAdmin;
} catch (e) {
    // ملف الصلاحيات لم يُبْنَ بعد في هذه المرحلة من خطة التطوير
}

/**
 * 1. GET /api/matches
 * جلب كافة المباريات مع إمكانية الفلترة اختيارياً: ?status=finished&teamId=3
 */
router.get('/', async (req, res) => {
    try {
        const { status, teamId } = req.query;
        let whereClause = {};

        if (status) {
            whereClause.status = status;
        }

        if (teamId) {
            whereClause[Op.or] = [
                { homeTeamId: teamId },
                { awayTeamId: teamId }
            ];
        }

        const matches = await Match.findAll({
            where: whereClause,
            include: [
                { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'crestUrl', 'primaryColor'] },
                { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'crestUrl', 'primaryColor'] }
            ],
            order: [['matchDate', 'DESC']]
        });

        return res.status(200).json(matches);
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب المباريات: ' + error.message });
    }
});

/**
 * 2. GET /api/matches/:id
 * جلب تفاصيل مباراة محددة مع أحداثها المسجلة (Heatmap & Match Events)
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const match = await Match.findByPk(id, {
            include: [
                { model: Team, as: 'homeTeam' },
                { model: Team, as: 'awayTeam' }
            ]
        });

        if (!match) {
            return res.status(404).json({ error: 'المباراة المطلوبة غير موجودة في الأرشيف' });
        }

        // جلب الأحداث في حال تم بناء النموذج الخاص بها
        let events = [];
        if (MatchEvent) {
            events = await MatchEvent.findAll({
                where: { matchId: id },
                order: [['minute', 'ASC']]
            });
        }

        return res.status(200).json({
            ...match.toJSON(),
            events
        });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل المباراة: ' + error.message });
    }
});

/**
 * 3. POST /api/matches
 * جدولة مباراة جديدة (صلاحية Admin / Editor فقط)
 */
router.post('/', verifyToken, isEditorOrAdmin, async (req, res) => {
    try {
        const { homeTeamId, awayTeamId, matchDate } = req.body;

        if (!homeTeamId || !awayTeamId || !matchDate) {
            return res.status(400).json({ error: 'معرف الفريق المستضيف والضيف وتاريخ المباراة هي حقول إلزامية' });
        }

        if (homeTeamId === awayTeamId) {
            return res.status(400).json({ error: 'لا يمكن لنادٍ واحد اللعب ضد نفسه في نفس المباراة' });
        }

        // التأكد من وجود الأندية المحددة
        const homeTeam = await Team.findByPk(homeTeamId);
        const awayTeam = await Team.findByPk(awayTeamId);

        if (!homeTeam || !awayTeam) {
            return res.status(404).json({ error: 'أحد الأندية المحددة للمباراة غير مسجل بالنظام' });
        }

        const match = await Match.create({
            homeTeamId,
            awayTeamId,
            matchDate,
            status: 'not_played_yet'
        });

        return res.status(201).json({ success: true, match });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء جدولة اللقاء: ' + error.message });
    }
});

/**
 * 4. PUT /api/matches/:id
 * تعديل شامل لبيانات مباراة، ونتيجة اللقاء، ونسب الاستحواذ (صلاحية Admin / Editor فقط)
 */
router.put('/:id', verifyToken, isEditorOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { homeScore, awayScore, status, possessionHome, possessionAway } = req.body;

        const match = await Match.findByPk(id);
        if (!match) {
            return res.status(404).json({ error: 'المباراة المطلوب تحديث بياناتها غير موجودة' });
        }

        await match.update({
            homeScore: homeScore !== undefined ? homeScore : match.homeScore,
            awayScore: awayScore !== undefined ? awayScore : match.awayScore,
            status: status !== undefined ? status : match.status,
            possessionHome: possessionHome !== undefined ? possessionHome : match.possessionHome,
            possessionAway: possessionAway !== undefined ? possessionAway : match.possessionAway
        });

        return res.status(200).json({ success: true, match });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات اللقاء: ' + error.message });
    }
});

/**
 * 5. PUT /api/matches/:id/status
 * زر التغيير السريع لحالة المباراة المباشرة (لم تبدأ بعد / جارية الآن / انتهت)
 */
router.put('/:id/status', verifyToken, isEditorOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = ['not_played_yet', 'being_played_right_now', 'finished'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'حالة المباراة المدخلة غير صالحة' });
        }

        const match = await Match.findByPk(id);
        if (!match) {
            return res.status(404).json({ error: 'المباراة المطلوبة غير مسجلة بالنظام' });
        }

        await match.update({ status });
        return res.status(200).json({ success: true, match });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء تبديل حالة المباراة: ' + error.message });
    }
});

/**
 * 6. POST /api/matches/:id/events
 * تسجيل حدث في المباراة (هدف، بطاقة، تدخل، تسديدة...)
 */
router.post('/:id/events', verifyToken, isEditorOrAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { teamId, playerId, type, minute, x, y, metadata } = req.body;

        if (!MatchEvent) {
            return res.status(503).json({ error: 'نظام الأحداث متوقف مؤقتاً لخضوعه للتحديث بالمرحلة القادمة' });
        }

        const match = await Match.findByPk(id);
        if (!match) {
            return res.status(404).json({ error: 'المباراة المستهدفة لتسجيل الحدث غير موجودة' });
        }

        if (!teamId || !playerId || !type || minute === undefined) {
            return res.status(400).json({ error: 'معرف الفريق، معرف اللاعب، نوع الحدث، والدقيقة هي حقول إجبارية' });
        }

        if (x < 0 || x > 100 || y < 0 || y > 100) {
            return res.status(400).json({ error: 'إحداثيات حركة اللاعبين يجب أن تكون واقعة في المجال النسبي (0 - 100)' });
        }

        const event = await MatchEvent.create({
            matchId: id,
            teamId,
            playerId,
            type,
            minute,
            x,
            y,
            metadata: metadata || {}
        });

        return res.status(201).json({ success: true, event });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء تقييد حدث المباراة: ' + error.message });
    }
});

module.exports = router;
