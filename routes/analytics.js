const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const MatchEvent = require('../models/MatchEvent');

/**
 * GET /api/matches/:id/heatmap
 * جلب نقاط الإحداثيات الخام لرسم الخريطة الحرارية لمباراة معينة.
 * يقبل التصفية اختيارياً حسب الفريق أو اللاعب: ?teamId=3&playerId=12
 */
router.get('/matches/:id/heatmap', async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId, playerId } = req.query;

    const whereClause = { matchId: id };

    if (teamId) {
      whereClause.teamId = parseInt(teamId);
    }
    if (playerId) {
      whereClause.playerId = parseInt(playerId);
    }

    // جلب الإحداثيات ونوع الحدث والدقيقة
    const events = await MatchEvent.findAll({
      where: whereClause,
      attributes: ['x', 'y', 'type', 'minute'],
      order: [['minute', 'ASC']]
    });

    // تنسيق الرد بالشكل المتفق عليه في عقد البيانات
    const heatmapData = events.map(event => ({
      x: event.x,
      y: event.y,
      type: event.type,
      minute: event.minute
    }));

    return res.status(200).json(heatmapData);
  } catch (error) {
    console.error('Error fetching heatmap data:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تجميع بيانات الخريطة الحرارية.' });
  }
});

/**
 * GET /api/players/:id/stats
 * حساب الإحصائيات التراكمية للاعب معين طيلة الموسم.
 * يحسب: الأهداف، التمريرات الحاسمة (من الـ metadata)، الكروت، وعدد دقائق اللعب التقديرية.
 */
router.get('/players/:id/stats', async (req, res) => {
  try {
    const playerId = parseInt(req.params.id);

    // 1. حساب الأهداف والكروت والنشاطات بشكل منفصل ومباشر لضمان الأداء
    const goalsCount = await MatchEvent.count({
      where: { playerId, type: 'goal' }
    });

    const yellowCardsCount = await MatchEvent.count({
      where: { playerId, type: 'yellow_card' }
    });

    const redCardsCount = await MatchEvent.count({
      where: { playerId, type: 'red_card' }
    });

    // 2. حساب التمريرات الحاسمة (Assists) عبر البحث في البيانات الوصفية (metadata) للأهداف
    // نستخدم طريقة برمجية متوافقة تضمن العمل على SQLite محلياً و PostgreSQL في الإنتاج دون مشاكل توافقية
    const goalsWithMetadata = await MatchEvent.findAll({
      where: {
        type: 'goal',
        metadata: {
          [Op.ne]: null
        }
      },
      attributes: ['metadata']
    });

    const assistsCount = goalsWithMetadata.filter(g => {
      try {
        const meta = typeof g.metadata === 'string' ? JSON.parse(g.metadata) : g.metadata;
        return meta && parseInt(meta.assistPlayerId) === playerId;
      } catch (e) {
        return false;
      }
    }).length;

    // 3. حساب عدد المباريات الفريدة التي ظهر بها اللاعب لتقدير دقائق اللعب
    const uniqueMatches = await MatchEvent.findAll({
      where: { playerId },
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('matchId')), 'matchId']
      ]
    });
    
    const matchesPlayed = uniqueMatches.length;
    const minutesPlayed = matchesPlayed * 90; // تقدير افتراضي لعدد الدقائق (90 دقيقة لكل مباراة شارك بها)

    // تشكيل الهيكل المطلوب في القسم 7 لعقد البيانات المشترك
    const playerStats = {
      playerId,
      goals: goalsCount,
      assists: assistsCount,
      yellowCards: yellowCardsCount,
      redCards: redCardsCount,
      minutesPlayed
    };

    return res.status(200).json(playerStats);
  } catch (error) {
    console.error('Error calculating player statistics:', error);
    return res.status(500).json({ error: 'حدث خطأ أثناء حساب الإحصائيات التراكمية للاعب.' });
  }
});

module.exports = router;