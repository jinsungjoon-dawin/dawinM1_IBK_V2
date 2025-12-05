import { Router } from 'express';
import tperpormManagement from '../model/tperpormManagement.js';

const router = Router();

/**
 * 성능 테스트 데이터 업로드
 * POST /perf_upload
 */
router.post('/perf_upload', async function (req, res, next) {
    try {
        const data = req.body;
        // console.log("Received data:", data);

        if (!data.APID || !data.SID || !data.TID) {
            return res.status(400).json({ success: false, message: "Missing required keys (APID, SID, TID)" });
        }

        const result = await tperpormManagement.upsertPerformanceData(data);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});



/**
 * 성능 테스트 데이터 조회
 * GET /perf_list
 */
router.get('/perf_list', async (req, res) => {
    try {
        const searchtxt = req.query.searchtxt;
        const searchCondition = req.query.searchCondition;
        const result = await tperpormManagement.getPerformanceList(searchtxt, searchCondition);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send(err.message);
    }
});

export default router;
