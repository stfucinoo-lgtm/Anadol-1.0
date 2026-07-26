/**
 * ANADOL League - Teams & Players Routes
 * مسارات التحكم بالفرق واللاعبين (عرض، إضافة، تعديل، حذف) مع حساب الإحصائيات التراكمية.
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const { verifyToken, isAdmin } = require('../middleware/auth');

// تعريف علاقات التبعية برمجياً وبشكل مباشر لربط جدول الفرق واللاعبين
try {
    Team.hasMany(Player, { foreignKey: 'teamId', as: 'players', onDelete: 'CASCADE' });
    Player.belongsTo(Team, { foreignKey: 'teamId', as: 'team' });
} catch (assocErr) {
    console.log('Notice: Associations already initialized:', assocErr.message);
}

/**
 * 1. GET /api/teams
 * جلب قائمة بكافة الفرق المسجلة في الدوري
 */
router.get('/', async (req, res) => {
    console.log('--> GET /api/teams request received');
    try {
        const teams = await Team.findAll({
            order: [['name', 'ASC']]
        });
        console.log(`<-- GET /api/teams successfully fetched ${teams.length} teams`);
        return res.status(200).json(teams);
    } catch (error) {
        console.error('X Error in GET /api/teams:', error);
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الفرق: ' + error.message });
    }
});

/**
 * 2. GET /api/teams/:id
 * جلب ملف فريق محدد بالتفصيل، متضمناً قائمة اللاعبين، المباريات، والإحصائيات المحسوبة تلقائياً
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const team = await Team.findByPk(id, {
            include: [{ model: Player, as: 'players' }]
        });

        if (!team) {
            return res.status(404).json({ error: 'الفريق المطلوب غير موجود في قاعدة البيانات' });
        }

        const matches = await Match.findAll({
            where: {
                [Op.or]: [
                    { homeTeamId: id },
                    { awayTeamId: id }
                ]
            },
            order: [['matchDate', 'DESC']]
        });

        let played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0, cleanSheets = 0;

        matches.forEach(m => {
            if (m.status === 'finished') {
                played++;
                const isHome = m.homeTeamId === parseInt(id, 10);
                const teamScore = isHome ? m.homeScore : m.awayScore;
                const oppScore = isHome ? m.awayScore : m.homeScore;

                goalsFor += teamScore;
                goalsAgainst += oppScore;

                if (teamScore > oppScore) {
                    won++;
                } else if (teamScore === oppScore) {
                    drawn++;
                } else {
                    lost++;
                }

                if (oppScore === 0) {
                    cleanSheets++;
                }
            }
        });

        const stats = { played, won, drawn, lost, goalsFor, goalsAgainst, cleanSheets };

        return res.status(200).json({
            ...team.toJSON(),
            stats,
            schedule: matches
        });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء جلب الملف التعريفي للفريق: ' + error.message });
    }
});

/**
 * 3. POST /api/teams
 * إضافة فريق جديد (صلاحية Admin فقط)
 */
router.post('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const { name, crestUrl, primaryColor, stadium, foundedYear } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'اسم الفريق حقل مطلوب ولا يمكن تركه فارغاً' });
        }

        const team = await Team.create(
            { name, crestUrl, primaryColor, stadium, foundedYear }, 
            { validate: false }
        );
        return res.status(201).json({ success: true, team });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء إضافة الفريق: ' + error.message });
    }
});

/**
 * 4. PUT /api/teams/:id
 * تحديث بيانات فريق موجود (صلاحية Admin فقط)
 */
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const team = await Team.findByPk(id);

        if (!team) {
            return res.status(404).json({ error: 'الفريق المطلوب تعديله غير موجود' });
        }

        await team.update(req.body, { validate: false });
        return res.status(200).json({ success: true, team });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات الفريق: ' + error.message });
    }
});

/**
 * 5. DELETE /api/teams/:id
 * حذف فريق بشكل كامل من النظام (صلاحية Admin فقط)
 */
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const team = await Team.findByPk(id);

        if (!team) {
            return res.status(404).json({ error: 'الفريق المطلوب حذفه غير موجود' });
        }

        await team.destroy();
        return res.status(200).json({ success: true, message: 'تم حذف الفريق وتطهير كينونته من قاعدة البيانات بنجاح' });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء محاولة حذف الفريق: ' + error.message });
    }
});

/**
 * 6. POST /api/teams/:id/players
 * إضافة لاعب جديد إلى تشكيلة فريق محدد (صلاحية Admin فقط)
 */
router.post('/:id/players', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, jerseyNumber, position, photoUrl } = req.body;

        const team = await Team.findByPk(id);
        if (!team) {
            return res.status(404).json({ error: 'الفريق المستهدف لإضافة اللاعب غير موجود' });
        }

        if (!name || !jerseyNumber || !position) {
            return res.status(400).json({ error: 'الاسم، رقم القميص، والمركز هي حقول إلزامية للاعب الجديد' });
        }

        const player = await Player.create({
            teamId: id,
            name,
            jerseyNumber,
            position,
            photoUrl
        }, { validate: false });

        return res.status(201).json({ success: true, player });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء قيد اللاعب الجديد بالفريق: ' + error.message });
    }
});

/**
 * 7. PUT /api/players/:id
 * تعديل بيانات لاعب محدد (صلاحية Admin فقط)
 */
router.put('/players/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const player = await Player.findByPk(id);

        if (!player) {
            return res.status(404).json({ error: 'اللاعب المطلوب تعديل بياناته غير مسجل بالنظام' });
        }

        await player.update(req.body, { validate: false });
        return res.status(200).json({ success: true, player });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء تعديل بيانات اللاعب: ' + error.message });
    }
});

/**
 * 8. DELETE /api/players/:id
 * حذف لاعب بشكل كامل من النظام (صلاحية Admin فقط)
 */
router.delete('/players/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const player = await Player.findByPk(id);

        if (!player) {
            return res.status(404).json({ error: 'اللاعب المطلوب شطبه غير مسجل بالنظام' });
        }

        await player.destroy();
        return res.status(200).json({ success: true, message: 'تم تسريح وشطب اللاعب من قاعدة البيانات بنجاح' });
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء محاولة شطب اللاعب: ' + error.message });
    }
});

module.exports = router;
