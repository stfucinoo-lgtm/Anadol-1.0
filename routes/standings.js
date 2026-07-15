/**
 * ANADOL League - Standings Routes
 * مسار احتساب جدول الترتيب العام للدوري ديناميكياً من واقع نتائج المباريات المعتمدة رسمياً.
 */

const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Match = require('../models/Match');

/**
 * GET /api/standings
 * حساب وتوليد جدول ترتيب الدوري الحي من واقع قاعدة البيانات
 */
router.get('/', async (req, res) => {
    try {
        // 1. جلب كافة الأندية المسجلة لتأسيس خريطة الترتيب
        const teams = await Team.findAll();
        
        // 2. جلب جميع المباريات المعتمدة كـ "منتهية" فقط
        const finishedMatches = await Match.findAll({
            where: { status: 'finished' }
        });

        // 3. تهيئة هيكلية خلايا الترتيب الافتراضية لكل نادٍ
        const standingsMap = {};
        teams.forEach(team => {
            standingsMap[team.id] = {
                teamId: team.id,
                teamName: team.name,
                crestUrl: team.crestUrl, // حقل مساعد لتسهيل العرض المباشر في الواجهة
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0,
                points: 0,
                position: 0
            };
        });

        // 4. معالجة وتوزيع نتائج المباريات وتراكم النقاط
        finishedMatches.forEach(match => {
            const homeId = match.homeTeamId;
            const awayId = match.awayTeamId;
            const homeScore = match.homeScore;
            const awayScore = match.awayScore;

            // التحقق الدفاعي من بقاء الأندية مسجلة في قاعدة البيانات لتلافي تعطل المعالجة
            if (standingsMap[homeId] && standingsMap[awayId]) {
                const homeRow = standingsMap[homeId];
                const awayRow = standingsMap[awayId];

                homeRow.played++;
                awayRow.played++;

                homeRow.goalsFor += homeScore;
                homeRow.goalsAgainst += awayScore;

                awayRow.goalsFor += awayScore;
                awayRow.goalsAgainst += homeScore;

                // احتساب الفوز والتعادل والخسارة مع توزيع نقاط الحسم
                if (homeScore > awayScore) {
                    homeRow.won++;
                    homeRow.points += 3;

                    awayRow.lost++;
                } else if (homeScore < awayScore) {
                    awayRow.won++;
                    awayRow.points += 3;

                    homeRow.lost++;
                } else {
                    homeRow.drawn++;
                    homeRow.points += 1;

                    awayRow.drawn++;
                    awayRow.points += 1;
                }
            }
        });

        // 5. تحويل الخريطة إلى مصفوفة واحتساب فارق الأهداف الإجمالي لكل نادٍ
        const standingsList = Object.values(standingsMap);
        standingsList.forEach(row => {
            row.goalDifference = row.goalsFor - row.goalsAgainst;
        });

        // 6. الفرز الرياضي الصارم للترتيب:
        // أ. النقاط (الأكثر هو الأعلى)
        // ب. فارق الأهداف (الأعلى هو الأعلى)
        // ج. الأهداف المسجلة (الهجوم الأقوى هو الأعلى في حال التساوي التام)
        standingsList.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            if (b.goalDifference !== a.goalDifference) {
                return b.goalDifference - a.goalDifference;
            }
            return b.goalsFor - a.goalsFor;
        });

        // 7. إسناد المراكز الترتيبية (Positions) بناءً على نتائج الفرز
        standingsList.forEach((row, index) => {
            row.position = index + 1;
        });

        return res.status(200).json(standingsList);
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ غير متوقع أثناء احتساب ترتيب الدوري: ' + error.message });
    }
});

module.exports = router;